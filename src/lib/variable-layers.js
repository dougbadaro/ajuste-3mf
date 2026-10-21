// Native profile format: BambuStudio/src/libslic3r/Format/bbs_3mf.cpp.
// Profiles use the 1-based order of distinct objects in the 3MF build list.
export const PROFILE_PATH = 'Metadata/layer_heights_profile.txt';
export function xmlAttrs(text) {
  const out = {};
  for (const m of text.matchAll(/([\w:.-]+)\s*=\s*["']([^"']*)["']/g)) out[m[1]] = m[2];
  return out;
}
const identity = () => [1,0,0,0,1,0,0,0,1,0,0,0];
function matrix(text) {
  if (!text) return identity();
  const v = text.trim().split(/\s+/).map(Number);
  if (v.length !== 12 || !v.every(Number.isFinite)) throw new Error('Transformação 3MF inválida.');
  return v;
}
function point(m, x, y, z) {
  return [m[0]*x+m[3]*y+m[6]*z+m[9], m[1]*x+m[4]*y+m[7]*z+m[10], m[2]*x+m[5]*y+m[8]*z+m[11]];
}
function compose(a,b) {
  const o = identity();
  for (let col=0;col<3;col++) for(let row=0;row<3;row++) o[col*3+row]=a[row]*b[col*3]+a[3+row]*b[col*3+1]+a[6+row]*b[col*3+2];
  const t=point(a,b[9],b[10],b[11]);
  o.splice(9,3,...t);
  return o;
}
function resolve(base,path) {
  if (!path) return base;
  if (/:|\\/.test(path)) throw new Error('Referência externa não suportada.');
  const parts=(path.startsWith('/')?path:base.slice(0,base.lastIndexOf('/')+1)+path).split('/');
  const out=[];
  for(const p of parts) { if(p==='..') { if(!out.length) throw new Error('Caminho inválido.'); out.pop(); } else if(p&&p!=='.') out.push(p); }
  return out.join('/');
}
const pathAttr = a => a['p:path'] || Object.entries(a).find(([k])=>k.endsWith(':path'))?.[1];
function parsePart(text) {
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('XML com entidades não suportado.');
  const model=xmlAttrs(text.match(/<model\b([^>]*)>/)?.[1] || '');
  if(model.unit && model.unit!=='millimeter') throw new Error('A análise automática requer unidades em milímetros.');
  const objects=new Map();
  for(const m of text.matchAll(/<object\b([^>]*)>([\s\S]*?)<\/object>/g)) {
    const attrs=xmlAttrs(m[1]);
    const body=m[2];
    const vertices=[];
    for(const v of body.matchAll(/<vertex\b([^>]*)\/?\s*>/g)) {
      const a=xmlAttrs(v[1]);
      const xyz=[Number(a.x),Number(a.y),Number(a.z)];
      if(!xyz.every(Number.isFinite)) throw new Error('Vértice inválido.');
      vertices.push(...xyz);
      if(vertices.length>3000000) throw new Error('Malha grande demais para análise automática.');
    }
    const triangles=[];
    for(const t of body.matchAll(/<triangle\b([^>]*)\/?\s*>/g)) {
      const a=xmlAttrs(t[1]);
      const ids=[Number(a.v1),Number(a.v2),Number(a.v3)];
      if(!ids.every(i=>Number.isInteger(i)&&i>=0&&i<vertices.length/3)) throw new Error('Triângulo inválido.');
      triangles.push(...ids);
      if(triangles.length>6000000) throw new Error('Malha grande demais para análise automática.');
    }
    const components=[...body.matchAll(/<component\b([^>]*)\/?\s*>/g)].map(c=>xmlAttrs(c[1]));
    objects.set(attrs.id,{vertices:new Float64Array(vertices),triangles:new Uint32Array(triangles),components});
  }
  const build=text.match(/<build\b[^>]*>([\s\S]*?)<\/build>/)?.[1] || '';
  return {objects, items:[...build.matchAll(/<item\b([^>]*)\/?\s*>/g)].map(m=>xmlAttrs(m[1]))};
}
export async function analyzeGeometry(readText,metadata) {
  const cache=new Map();
  let analyzedTriangles=0, loadedBytes=0;
  async function part(path) {
    if(!cache.has(path)) cache.set(path,Promise.resolve(readText(path)).then(text=>{ if(!text)throw new Error('Geometria ausente.'); loadedBytes+=text.length; if(loadedBytes>120000000)throw new Error('Limite de leitura da análise automática excedido.'); return parsePart(text); }));
    return cache.get(path);
  }
  try {
    const main='3D/3dmodel.model';
    const root=await part(main);
    const unique=[];
    const seen=new Map();
    for(const item of root.items) {
      const path=resolve(main,pathAttr(item));
      const key=path+'#'+item.objectid;
      const transform=matrix(item.transform);
      if(seen.has(key)) {
        const old=unique[seen.get(key)];
        if(old.transform.slice(0,9).some((v,i)=>Math.abs(v-transform[i])>1e-7)) throw new Error('Cópias com rotações ou escalas diferentes requerem ajuste no Bambu Studio.');
      } else { seen.set(key,unique.length); unique.push({path,id:item.objectid,transform}); }
    }
    if(!unique.length) throw new Error('O arquivo não contém uma lista de construção com geometria.');
    if(unique.length!==metadata.length) throw new Error('A ordem dos objetos não pôde ser confirmada para o perfil nativo.');
    const results=[];
    for(const [index,item] of unique.entries()) {
      const matches=metadata.filter(o=>o.id===item.id);
      if(matches.length!==1) throw new Error('Identificação ambígua dos objetos.');
      const meta=matches[0];
      try {
        const leaves=[];
        let totalTriangles=0;
        async function walk(path,id,transform,stack=new Set()) {
          if(analyzedTriangles>3000000)throw new Error('Limite total de análise automática excedido.');
          const key=path+'#'+id;
          if(stack.has(key)||stack.size>24)throw new Error('Referência circular na geometria.');
          const obj=(await part(path)).objects.get(id);
          if(!obj) throw new Error('Objeto referenciado não encontrado.');
          const next=new Set(stack); next.add(key);
          if(obj.triangles.length) {
            totalTriangles+=obj.triangles.length/3;
            analyzedTriangles+=obj.triangles.length/3;
            if(totalTriangles>2000000) throw new Error('Limite de análise automática excedido.');
            const positions=new Float64Array(obj.vertices.length);
            for(let i=0;i<positions.length;i+=3) positions.set(point(transform,...obj.vertices.subarray(i,i+3)),i);
            leaves.push({positions,triangles:obj.triangles});
          }
          for(const c of obj.components) {
            if(meta.excludedParts?.includes(c.objectid)) continue;
            await walk(resolve(path,pathAttr(c)),c.objectid,compose(transform,matrix(c.transform)),next);
          }
        }
        await walk(item.path,item.id,item.transform);
        if(!leaves.length)throw new Error('Sem malha imprimível para analisar.');
        const low=[Infinity,Infinity,Infinity], high=[-Infinity,-Infinity,-Infinity];
        for(const {positions:p} of leaves) for(let i=0;i<p.length;i+=3) for(let j=0;j<3;j++){low[j]=Math.min(low[j],p[i+j]); high[j]=Math.max(high[j],p[i+j]);}
        const height=high[2]-low[2];
        if(!Number.isFinite(height)||height<=0||height>2000) throw new Error('Altura da malha inválida.');
        const bins=new Float64Array(Math.max(16,Math.min(512,Math.ceil(height/.3))));
        for(const {positions:p,triangles:tri} of leaves) for(let i=0;i<tri.length;i+=3) {
          const a=tri[i]*3,b=tri[i+1]*3,c=tri[i+2]*3;
          const ux=p[b]-p[a],uy=p[b+1]-p[a+1],uz=p[b+2]-p[a+2];
          const vx=p[c]-p[a],vy=p[c+1]-p[a+1],vz=p[c+2]-p[a+2];
          const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
          const norm=Math.hypot(nx,ny,nz);
          if(norm<1e-12)continue;
          const slope=Math.abs(nz)/norm;
          // Exact horizontal tops do not have staircase error. Vertical walls
          // also need no adaptive refinement; retain only inclined facets.
          if(slope<.005||slope>.9999)continue;
          const z0=Math.min(p[a+2],p[b+2],p[c+2])-low[2];
          const z1=Math.max(p[a+2],p[b+2],p[c+2])-low[2];
          const from=Math.max(0,Math.floor(z0/height*bins.length));
          const to=Math.min(bins.length-1,Math.floor(z1/height*bins.length));
          for(let j=from;j<=to;j++)bins[j]=Math.max(bins[j],slope);
        }
        results.push({index:index+1,id:item.id,name:meta.name,height,width:high[0]-low[0],depth:high[1]-low[1],bins:Array.from(bins),available:true,curved:bins.some(n=>n>.005)});
      } catch(error) { results.push({index:index+1,id:item.id,name:meta.name,available:false,error:error.message}); }
    }
    return results;
  } catch(error) { return metadata.map(o=>({id:o.id,name:o.name,available:false,error:error.message})); }
}
export function parseProfiles(text) {
  const out={};
  for(const line of String(text||'').split(/\r?\n/)) {
    const m=line.trim().match(/^object_id=(\d+)\|(.+)$/);
    if (!line.trim()) continue;
    if (!m || Number(m[1]) < 1 || Object.hasOwn(out, Number(m[1]))) throw new Error('Perfil variável existente inválido.');
    const values=m[2].split(';').map(Number);
    if(values.length<6 || values.length%2 || !values.every(Number.isFinite)) throw new Error('Perfil variável existente inválido.');
    out[Number(m[1])]=values;
  }
  return out;
}
export function serializeProfiles(profiles) {
  return Object.keys(profiles).sort((a,b)=>Number(a)-Number(b)).map(id=>'object_id='+id+'|'+profiles[id].map(n=>Number(n).toFixed(6)).join(';')).join('\n')+'\n';
}
function number(value,label) {
  const n=typeof value==='number'?value:(typeof value==='string'&&value.trim()?Number(value.replace(',','.')):NaN);
  if(!Number.isFinite(n))throw new Error(label+' deve ser um número.');
  return n;
}
export function createAdaptiveProfiles(project,raw,cfg) {
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||!['automatico','desativar'].includes(raw.modo))throw new Error('Use modo automatico ou desativar e a lista de objetos.');
  if(raw.modo==='desativar') {
    if(!Array.isArray(raw.objetos)||!raw.objetos.length||new Set(raw.objetos).size!==raw.objetos.length||!raw.objetos.every(id=>Number.isInteger(id)&&id>0&&(id<=project.objects.length||project.layerProfiles?.[id])))throw new Error('Índices inválidos para remover perfis variáveis.');
    return {modo:'desativar',objetos:[...raw.objetos],perfis:{},remover:[...raw.objetos]};
  }
  const min=number(raw.altura_min,'altura_min'),max=number(raw.altura_max,'altura_max');
  const nozzle=Number(Array.isArray(cfg.nozzle_diameter)?cfg.nozzle_diameter[0]:cfg.nozzle_diameter)||.4;
  const machineMin=Number(Array.isArray(cfg.min_layer_height)?cfg.min_layer_height[0]:cfg.min_layer_height)||.05;
  const machineMax=Number(Array.isArray(cfg.max_layer_height)?cfg.max_layer_height[0]:cfg.max_layer_height)||.8*nozzle;
  if(min<Math.max(.05,machineMin)||max>Math.min(.32,machineMax,.8*nozzle)||min>=max)throw new Error('Limites de camada incompatíveis com o bico/perfil ou altura_min >= altura_max.');
  if(!Array.isArray(raw.objetos)||!raw.objetos.length||raw.objetos.length>100||new Set(raw.objetos).size!==raw.objetos.length)throw new Error('Liste índices únicos dos objetos analisados.');
  const enabled=v=>['1','true'].includes(String(v).toLowerCase());
  const sync=raw.sincronizar === true;
  const requiresSync=project.objects.length>1 && !['0','false'].includes(String(cfg.enable_prime_tower).toLowerCase());
  if(requiresSync && !sync)throw new Error('Com torre de limpeza ativa ou não confirmada, solicite sincronizar:true para todos os objetos de mesma altura; caso contrário preserve a torre e use camada fixa.');
  let shared;
  if(sync) {
    const all=project.geometry || [];
    if(all.length!==project.objects.length || raw.objetos.length!==all.length || !all.every(g=>g.available&&raw.objetos.includes(g.index)))throw new Error('A sincronização exige todos os objetos com geometria disponível.');
    if(!all.every(g=>Math.abs(g.height-all[0].height)<.000001))throw new Error('Este app só sincroniza perfis de objetos com a mesma altura. Preserve a torre ou revise no Bambu Studio.');
    if(!all.some(g=>g.curved))throw new Error('Não há superfícies inclinadas para justificar altura variável.');
    shared={...all[0],curved:true,bins:all[0].bins.map((_,i)=>Math.max(...all.map(g=>g.bins[Math.min(g.bins.length-1,Math.floor(i/all[0].bins.length*g.bins.length))]||0)))};
  }
  if(enabled(cfg.enable_support)&&!cfg.support_type)throw new Error('Confirme o tipo de suporte no Bambu Studio antes de criar altura variável.');
  if(enabled(cfg.enable_support)&&String(cfg.support_type).startsWith('tree')&&['tree_organic','default'].includes(String(cfg.support_style||'default')))throw new Error('Altura variável incompatível com suporte orgânico ou árvore de estilo automático não confirmado.');
  const first=number(cfg.initial_layer_print_height??cfg.layer_height??.2,'Primeira camada');
  if(first<.05||first>.8*nozzle)throw new Error('Primeira camada incompatível com o bico.');
  const profiles={};
  const selected=[];
  for(const id of raw.objetos) {
    if(!Number.isInteger(id))throw new Error('O índice de objeto deve ser inteiro.');
    const source=project.geometry?.find(o=>o.index===id);
    const g=shared ? {...shared,index:id,id:source?.id,name:source?.name} : source;
    if(!g?.available)throw new Error('Objeto '+id+': geometria não disponível para análise automática.');
    const meta=project.objects.find(o=>o.id===g.id);
    if(meta?.overrides?.some(k=>['layer_height','initial_layer_print_height','enable_support','support_type','support_style'].includes(k)))throw new Error('Objeto '+id+' tem ajustes próprios de camadas/suportes; revise-os no Bambu Studio antes da altura variável.');
    if(!g.curved)throw new Error('Objeto '+id+': não foram encontradas superfícies inclinadas/curvas que justifiquem altura variável.');
    if(g.height<=first*2)throw new Error('Objeto baixo demais para variar camadas preservando a primeira camada.');
    const profile=[0,first,first,first];
    let previous=first;
    const step=g.height/g.bins.length;
    for(let z=first+.02;z<g.height-.0001;z+=Math.max(.1,Math.min(.5,step))) {
      const band=Math.min(g.bins.length-1,Math.floor(z/step));
      const slope=Math.max(g.bins[band]||0,g.bins[Math.min(band+1,g.bins.length-1)]||0);
      const target=Math.max(min,Math.min(max,slope>.005?min/slope:max));
      const h=Math.max(min,Math.min(max,Math.max(previous-.02,Math.min(previous+.02,target))));
      previous=h;
      profile.push(Number(z.toFixed(6)),Number(h.toFixed(6)));
    }
    profile.push(Number(g.height.toFixed(6)),Number(previous.toFixed(6)));
    profiles[id]=profile;
    selected.push({objeto:id,nome:g.name,altura_mm:Number(g.height.toFixed(3)),pontos:profile.length/2});
  }
  return {modo:'automatico',objetos:[...raw.objetos],altura_min:min,altura_max:max,sincronizar:sync,perfis:profiles,resumo:selected};
}
