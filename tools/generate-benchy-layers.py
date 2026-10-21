import json, sys
from pathlib import Path
import numpy as np

# Usage: python tools/generate-benchy-layers.py /path/to/3DBenchy.stl
# Requires numpy. Source model: Daniel Norée / Creative Tools, CC0.
source=Path(sys.argv[1])
tri=np.fromfile(source,dtype=np.dtype([('n','<f4',(3,)),('v','<f4',(3,3)),('a','<u2')]),offset=84)['v'].astype(np.float64)
lo=tri[:,:,2].min(axis=1)
hi=tri[:,:,2].max(axis=1)

def simplify(points,eps=.025):
    if len(points)<3: return points
    a,b=points[0],points[-1]
    d=b-a
    norm=float(d@d)
    if norm<1e-15: dist=np.linalg.norm(points-a,axis=1)
    else:
        t=np.clip(((points-a)@d)/norm,0,1)
        dist=np.linalg.norm(points-a-t[:,None]*d,axis=1)
    i=int(np.argmax(dist))
    if dist[i]<=eps:return points[[0,-1]]
    return np.concatenate((simplify(points[:i+1],eps)[:-1],simplify(points[i:],eps)))

positions=[]
layers=[]
for h in np.linspace(.137,47.97,152):
    t=tri[(lo<h)&(hi>h)]
    a=t[:,[0,1,2]]
    b=t[:,[1,2,0]]
    mask=((a[:,:,2]<h)&(b[:,:,2]>h))|((b[:,:,2]<h)&(a[:,:,2]>h))
    delta=b-a
    f=np.divide(h-a[:,:,2],delta[:,:,2],out=np.zeros_like(a[:,:,2]),where=delta[:,:,2]!=0)
    hits=(a+f[:,:,None]*delta)[mask].reshape((-1,2,3))
    nodes={}
    adjacent={}
    pairs=[]
    for seg in hits:
        keys=[]
        for p in seg:
            key=tuple(np.round(p[:2],4))
            nodes[key]=p[:2]
            keys.append(key)
        if keys[0]==keys[1]:continue
        edge=len(pairs)
        pairs.append(keys)
        for key in keys:adjacent.setdefault(key,[]).append(edge)
    used=set()
    paths=[]
    for seed,pair in enumerate(pairs):
        if seed in used:continue
        current=pair[0]
        path=[nodes[current]]
        edge=seed
        while edge not in used:
            used.add(edge)
            a,b=pairs[edge]
            current=b if current==a else a
            path.append(nodes[current])
            options=[e for e in adjacent[current] if e not in used]
            if not options:break
            edge=options[0]
        path=simplify(np.asarray(path))
        if len(path)>1 and np.linalg.norm(np.diff(path,axis=0),axis=1).sum()>.12:paths.append(path)
    start=len(positions)//3
    for path in sorted(paths,key=lambda p:-len(p)):
        for a,b in zip(path[:-1],path[1:]):
            for p in (a,b):positions.extend([round(float(p[0]-.8245)/16,5),round(float(h)/16,5),round(float(p[1])/16,5)])
    layers.append({'start':start,'count':len(positions)//3-start,'height':round(float(h)/16,5)})

out=Path(__file__).resolve().parents[1]/'public/models'
out.mkdir(exist_ok=True)
data={'source':'https://github.com/CreativeTools/3DBenchy/blob/master/Single-part/3DBenchy.stl','license':'CC0-1.0','layers':layers,'positions':positions}
(out/'benchy-layers.json').write_text(json.dumps(data,separators=(',',':')),encoding='utf-8')
assert all(layer['count']>0 and layer['count']%2==0 for layer in layers)
assert np.isfinite(positions).all()
print(f'{len(layers)} layers, {len(positions)//6} segments, {(out/"benchy-layers.json").stat().st_size} bytes')
