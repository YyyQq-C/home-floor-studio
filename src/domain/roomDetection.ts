import {validRoomPolygon,type Point,type Wall} from './project';

const EPS=1e-6;
/** 将相交墙体分段，沿平面图的有向边寻找封闭的内部区域。 */
export function detectRooms(walls:Wall[]):Point[][] {
  if(walls.length>500)throw new Error('Too many walls');
  const lines=walls.filter(w=>Math.hypot(w.end.x-w.start.x,w.end.y-w.start.y)>EPS).map(w=>({a:w.start,b:w.end,cuts:[0,1]}));
  const cross=(a:Point,b:Point)=>a.x*b.y-a.y*b.x;
  // 每对线段求交，包含端点落在另一面墙上的 T 形连接。
  for(let i=0;i<lines.length;i++)for(let j=i+1;j<lines.length;j++){
    const p=lines[i],q=lines[j],r={x:p.b.x-p.a.x,y:p.b.y-p.a.y},s={x:q.b.x-q.a.x,y:q.b.y-q.a.y},d={x:q.a.x-p.a.x,y:q.a.y-p.a.y},den=cross(r,s);
    if(Math.abs(den)<EPS){if(Math.abs(cross(d,r))<EPS){const length=r.x*r.x+r.y*r.y,t0=(d.x*r.x+d.y*r.y)/length,t1=t0+(s.x*r.x+s.y*r.y)/length,overlap=Math.min(1,Math.max(t0,t1))-Math.max(0,Math.min(t0,t1));if(overlap>EPS)throw new Error('Overlapping walls');}continue}
    const t=cross(d,s)/den,u=cross(d,r)/den;if(t>=-EPS&&t<=1+EPS&&u>=-EPS&&u<=1+EPS){p.cuts.push(Math.max(0,Math.min(1,t)));q.cuts.push(Math.max(0,Math.min(1,u)))}
  }
  const points:Point[]=[],neighbors:Array<Set<number>>=[],keys=new Map<string,number>();
  const vertex=(p:Point)=>{const key=`${Math.round(p.x/EPS)},${Math.round(p.y/EPS)}`;const found=keys.get(key);if(found!==undefined)return found;if(points.length>=10000)throw new Error('Too many wall intersections');const index=points.length;keys.set(key,index);points.push(p);neighbors.push(new Set());return index};
  for(const line of lines){const cuts=line.cuts.sort((a,b)=>a-b).filter((t,i,array)=>i===0||t-array[i-1]>EPS);for(let i=0;i<cuts.length-1;i++){const at=(t:number)=>({x:line.a.x+(line.b.x-line.a.x)*t,y:line.a.y+(line.b.y-line.a.y)*t}),a=vertex(at(cuts[i])),b=vertex(at(cuts[i+1]));if(a!==b){neighbors[a].add(b);neighbors[b].add(a)}}}
  // 移除悬空墙体，避免支线使闭合房间的边界重复折返。
  const pending=neighbors.map((n,i)=>n.size<2?i:-1).filter(i=>i>=0);while(pending.length){const i=pending.pop()!;if(neighbors[i].size>=2)continue;for(const other of neighbors[i]){neighbors[other].delete(i);if(neighbors[other].size===1)pending.push(other)}neighbors[i].clear()}
  const sorted=neighbors.map((set,i)=>[...set].sort((a,b)=>Math.atan2(points[a].y-points[i].y,points[a].x-points[i].x)-Math.atan2(points[b].y-points[i].y,points[b].x-points[i].x)));
  const visited=new Set<string>(),rooms:Point[][]=[];
  for(let start=0;start<points.length;start++)for(const next of sorted[start]){const key=`${start}:${next}`;if(visited.has(key))continue;const polygon:Point[]=[];let a=start,b=next,closed=false;
    for(let steps=0;steps<=points.length*2+2;steps++){const edge=`${a}:${b}`;if(visited.has(edge))break;visited.add(edge);polygon.push(points[a]);const adjacent=sorted[b],index=adjacent.indexOf(a);if(index<0||!adjacent.length)break;const c=adjacent[(index-1+adjacent.length)%adjacent.length];a=b;b=c;if(a===start&&b===next){closed=true;break}}
    const signed=polygon.reduce((sum,p,i)=>{const n=polygon[(i+1)%polygon.length];return sum+p.x*n.y-n.x*p.y},0)/2;
    if(closed&&signed>EPS){if(!validRoomPolygon(polygon))throw new Error('Unsupported room outline');rooms.push(polygon)}
  }
  if(rooms.length>100)throw new Error('Too many detected rooms');
  // 不支持房间内的独立墙环，避免把中庭错误地填为重叠地面。
  const inside=(p:Point,poly:Point[])=>{let result=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)result=!result}return result};
  for(let i=0;i<rooms.length;i++)for(let j=0;j<rooms.length;j++)if(i!==j&&rooms[i].every(p=>inside(p,rooms[j])))throw new Error('Nested wall loops');
  return rooms;
}
