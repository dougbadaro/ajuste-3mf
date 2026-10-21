import test from 'node:test'
import assert from 'node:assert/strict'
import { inflateRawSync } from 'node:zlib'
import { analyzeGeometry, parseProfiles, serializeProfiles } from '../src/lib/variable-layers.js'
import { openProject, evaluateChanges, buildModified, buildSummary, fmtVal } from '../src/lib/threemf.js'

import { geometryFixture, mesh, vertices } from './fixtures/geometry.mjs'
const request={chave:'altura_variavel',valor:{modo:'automatico',objetos:[2],altura_min:.08,altura_max:.2},motivo:'Refinar a rampa'}
const form={printer:'Bambu Lab A1',nozzle:'0.4',ams:'Sem AMS',filType:'PLA',brand:'Volt3D',use:'Visual',prio:'Qualidade visual'}
function textEntry(p,name){const e=p.zip.entries.find(e=>e.name===name),o=e.offset,d=p.zip.dv;const start=o+30+d.getUint16(o+26,true)+d.getUint16(o+28,true);const b=p.zip.u8.subarray(start,start+e.csize);return new TextDecoder().decode(e.method===8?inflateRawSync(b):b)}

test('analisa geometria externa e usa a ordem nativa de construção, não a dos metadados',async()=>{
  const p=await openProject(geometryFixture())
  assert.equal(p.geometry[0].index,1);assert.equal(p.geometry[0].name,'Caixa plana');assert.equal(p.geometry[0].curved,false)
  assert.equal(p.geometry[1].index,2);assert.equal(p.geometry[1].name,'Rampa');assert.equal(p.geometry[1].height,10);assert.equal(p.geometry[1].curved,true)
  const summary=buildSummary(p,form,'rampa.3mf');assert.match(summary,/objeto 2: Rampa/);assert.match(summary,/altura_variavel/)
})
test('grava perfil nativo novo no ZIP e o reabre sem criar uma chave fictícia no processo',async()=>{
  const p=await openProject(geometryFixture())
  const [c]=evaluateChanges(p,{alteracoes:[request]})
  assert.equal(c.status,'change',c.msg);assert.match(fmtVal(c.spec,c.after),/1 objeto/)
  const profile=c.after.perfis[2];assert.deepEqual(profile.slice(0,4),[0,.2,.2,.2]);assert.equal(profile.at(-2),10)
  for(let i=4;i<profile.length;i+=2){assert.ok(profile[i]>profile[i-2]);assert.ok(profile[i+1]>=.08&&profile[i+1]<=.2)}
  assert.ok(new Set(profile.filter((_,i)=>i%2===1).map(n=>n.toFixed(4))).size>2)
  const out=await openProject(new Uint8Array(await(await buildModified(p,[c])).arrayBuffer()))
  assert.deepEqual(out.layerProfiles[2],profile);assert.equal(out.profileError,'');assert.equal('altura_variavel' in out.cfg,false);assert.equal('adaptive_layer_height' in out.cfg,false)
  assert.match(textEntry(out,'[Content_Types].xml'),/Extension="txt"/)
  assert.equal(out.zip.entries.filter(e=>e.name==='Metadata/layer_heights_profile.txt').length,1)
  assert.equal(evaluateChanges(out,{alteracoes:[request]})[0].status,'same')
})
test('preserva o perfil de outros objetos ao substituir o perfil escolhido',async()=>{
  const old=[0,.2,.2,.2,10,.2]
  const p=await openProject(geometryFixture({profiles:serializeProfiles({1:old,2:old})}))
  const [c]=evaluateChanges(p,{alteracoes:[request]});assert.equal(c.status,'change',c.msg)
  const out=await openProject(new Uint8Array(await(await buildModified(p,[c])).arrayBuffer()))
  assert.deepEqual(out.layerProfiles[1],old);assert.deepEqual(out.layerProfiles[2],c.after.perfis[2])
})
test('rejeita índices, limites, geometria plana e conflitos com torre/suporte',async()=>{
  for(const options of [{objetos:[1]},{objetos:[999]},{objetos:[2,2]},{objetos:['2']},{altura_min:.01},{altura_max:.4},{altura_min:.2,altura_max:.1}]){
    const p=await openProject(geometryFixture());assert.equal(evaluateChanges(p,{alteracoes:[{...request,valor:{...request.valor,...options}}]})[0].status,'bad')
  }
  const tower=await openProject(geometryFixture({cfg:{enable_prime_tower:'1'}}));assert.match(evaluateChanges(tower,{alteracoes:[request]})[0].msg,/torre/)
  const organic=await openProject(geometryFixture({cfg:{enable_support:'1',support_type:'tree(auto)',support_style:'tree_organic'}}));assert.match(evaluateChanges(organic,{alteracoes:[request]})[0].msg,/suporte orgânico/)
})
test('revalida as dependências na exportação depois de desmarcar um ajuste',async()=>{
  const p=await openProject(geometryFixture({cfg:{enable_prime_tower:'1'}}))
  const changes=evaluateChanges(p,{alteracoes:[{chave:'enable_prime_tower',valor:'0'},request]})
  assert.ok(changes.every(c=>c.status==='change'))
  await assert.rejects(buildModified(p,[changes[1]]),/torre/)
  const out=await openProject(new Uint8Array(await(await buildModified(p,changes)).arrayBuffer()))
  assert.equal(out.cfg.enable_prime_tower,'0');assert.ok(out.layerProfiles[2])
})
test('aplica a orientação e escala das instâncias antes de calcular a altura',async()=>{
  const xml='<model unit="millimeter"><resources><object id="7">'+mesh(vertices)+'</object></resources><build><item objectid="7" transform="1 0 0 0 0 2 0 -1 0 0 0 50"/></build></model>'
  const g=await analyzeGeometry(async()=>xml,[{id:'7',name:'Rotacionada',overrides:[]}]);assert.equal(g[0].available,true);assert.equal(g[0].height,12)
})
test('detecta perfil malformado e não quebra os ajustes globais de arquivos sem malha',async()=>{
  assert.throws(()=>parseProfiles('object_id=2|0;0.2;2;NaN;10;0.2'),/inválido/)
  const p=await openProject(geometryFixture({profiles:'object_id=2|0;0.2;2;NaN;10;0.2'}));assert.ok(p.profileError)
  assert.equal(evaluateChanges(p,{alteracoes:[request]})[0].status,'bad')
  assert.equal(evaluateChanges(p,{alteracoes:[{chave:'layer_height',valor:'.16'}]})[0].status,'change')
})
test('permite espessura física de topo/base e rejeita camada maior que o bico',async()=>{
  const p=await openProject(geometryFixture({cfg:{nozzle_diameter:['0.2']}}))
  const changes=evaluateChanges(p,{alteracoes:[{chave:'top_shell_thickness',valor:'0.8'},{chave:'bottom_shell_thickness',valor:'0.6'},{chave:'layer_height',valor:'0.28'}]})
  assert.equal(changes[0].status,'change');assert.equal(changes[1].status,'change');assert.equal(changes[2].status,'bad')
  const out=await openProject(new Uint8Array(await(await buildModified(p,changes.slice(0,2))).arrayBuffer()))
  assert.equal(out.cfg.top_shell_thickness,'0.8');assert.ok(out.cfg.different_settings_to_system[0].includes('top_shell_thickness'))
})


test('desativa perfis variáveis sem apagar perfis de outros objetos',async()=>{
  const old=[0,.2,.2,.2,10,.2]
  const p=await openProject(geometryFixture({profiles:serializeProfiles({1:old,2:old}),cfg:{enable_prime_tower:'1'}}))
  const [c]=evaluateChanges(p,{alteracoes:[{chave:'altura_variavel',valor:{modo:'desativar',objetos:[2]}}]})
  assert.equal(c.status,'change',c.msg)
  const out=await openProject(new Uint8Array(await(await buildModified(p,[c])).arrayBuffer()))
  assert.deepEqual(out.layerProfiles[1],old);assert.equal(out.layerProfiles[2],undefined)
  const [removeAll]=evaluateChanges(out,{alteracoes:[{chave:'altura_variavel',valor:{modo:'desativar',objetos:[1]}}]})
  const fixed=await openProject(new Uint8Array(await(await buildModified(out,[removeAll])).arrayBuffer()))
  assert.deepEqual(fixed.layerProfiles,{})
  assert.equal(fixed.zip.entries.some(e=>e.name==='Metadata/layer_heights_profile.txt'),false)
})


test('sincroniza perfis idênticos para objetos de mesma altura sem desligar a torre',async()=>{
  const p=await openProject(geometryFixture({cfg:{enable_prime_tower:'1'}}))
  const sync={...request,valor:{...request.valor,objetos:[1,2],sincronizar:true}}
  const [c]=evaluateChanges(p,{alteracoes:[sync]})
  assert.equal(c.status,'change',c.msg)
  assert.deepEqual(c.after.perfis[1],c.after.perfis[2])
  const out=await openProject(new Uint8Array(await(await buildModified(p,[c])).arrayBuffer()))
  assert.equal(out.cfg.enable_prime_tower,'1')
  assert.deepEqual(out.layerProfiles[1],out.layerProfiles[2])
  assert.equal(evaluateChanges(out,{alteracoes:[sync]})[0].status,'same')
  p.geometry[0].height=9
  assert.match(evaluateChanges(p,{alteracoes:[sync]})[0].msg,/mesma altura/)
  assert.equal(evaluateChanges(out,{alteracoes:[{...sync,valor:{...sync.valor,objetos:[2]}}]})[0].status,'bad')
})
