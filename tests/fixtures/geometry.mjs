const enc=new TextEncoder()
export const vertices=[[0,0,0],[10,0,0],[10,6,0],[0,6,0],[0,0,4],[10,0,10],[10,6,10],[0,6,4]]
const tris=[[0,2,1],[0,3,2],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7],[4,5,6],[4,6,7]]
export const mesh=(points)=>'<mesh><vertices>'+points.map(([x,y,z])=>`<vertex x="${x}" y="${y}" z="${z}"/>`).join('')+'</vertices><triangles>'+tris.map(([v1,v2,v3])=>`<triangle v1="${v1}" v2="${v2}" v3="${v3}"/>`).join('')+'</triangles></mesh>'
function crc(bytes){let n=0xffffffff;for(const b of bytes){n^=b;for(let j=0;j<8;j++)n=(n>>>1)^((n&1)?0xedb88320:0);}return (n^0xffffffff)>>>0}
function zip(files){
  const chunks=[],central=[];let offset=0
  for(const [name,text] of Object.entries(files)){
    const n=enc.encode(name),b=enc.encode(text),c=crc(b)
    const h=new Uint8Array(30+n.length),v=new DataView(h.buffer)
    v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,c,true);v.setUint32(18,b.length,true);v.setUint32(22,b.length,true);v.setUint16(26,n.length,true);h.set(n,30)
    chunks.push(h,b)
    const ch=new Uint8Array(46+n.length),cv=new DataView(ch.buffer)
    cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint32(16,c,true);cv.setUint32(20,b.length,true);cv.setUint32(24,b.length,true);cv.setUint16(28,n.length,true);cv.setUint32(42,offset,true);ch.set(n,46);central.push(ch);offset+=h.length+b.length
  }
  const size=central.reduce((n,b)=>n+b.length,0),e=new Uint8Array(22),v=new DataView(e.buffer)
  v.setUint32(0,0x06054b50,true);v.setUint16(8,central.length,true);v.setUint16(10,central.length,true);v.setUint32(12,size,true);v.setUint32(16,offset,true)
  const all=[...chunks,...central,e],out=new Uint8Array(all.reduce((n,b)=>n+b.length,0));let at=0;for(const b of all){out.set(b,at);at+=b.length}return out
}
export function geometryFixture(options={}){
  const files={
    '[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>',
    '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" Target="/3D/3dmodel.model" Id="rel0"/></Relationships>',
    'Metadata/project_settings.config':JSON.stringify({printer_model:'Bambu Lab A1',nozzle_diameter:['0.4'],min_layer_height:['0.08'],max_layer_height:['0.28'],layer_height:'0.2',initial_layer_print_height:'0.2',enable_prime_tower:'0',enable_support:'0',filament_settings_id:['PLA'],...options.cfg}),
    'Metadata/model_settings.config':'<config><object id="2"><metadata key="name" value="Rampa"/><part id="10" subtype="normal_part"/></object><object id="5"><metadata key="name" value="Caixa plana"/></object><plate/></config>',
    // Build order differs from metadata order: native profile 1 is the box,
    // profile 2 is the ramp. The ramp mesh is in an external production part.
    '3D/3dmodel.model':'<model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06"><metadata name="Application">BambuStudio-02.08.02.61</metadata><resources><object id="2"><components><component objectid="10" p:path="/3D/Objects/ramp.model"/></components></object><object id="5">'+mesh(vertices.map(([x,y,z])=>[x,y,z?10:0]))+'</object></resources><build><item objectid="5"/><item objectid="2"/></build></model>',
    '3D/Objects/ramp.model':'<model unit="millimeter"><resources><object id="10">'+mesh(vertices)+'</object></resources></model>',
  }
  if(options.profiles)files['Metadata/layer_heights_profile.txt']=options.profiles
  return zip(files)
}
