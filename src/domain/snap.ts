import type {Point,Wall} from './project';
/** 在指定画布距离内寻找最近的其他墙体端点。 */
export function nearestWallEndpoint(point:Point,walls:Wall[],radius:number,excludeWallId?:string):Point|null {
  if(!Number.isFinite(radius)||radius<=0)return null;let best:Point|null=null,bestDistance=radius;
  for(const wall of walls){if(wall.id===excludeWallId)continue;for(const candidate of [wall.start,wall.end]){const distance=Math.hypot(point.x-candidate.x,point.y-candidate.y);if(distance<=bestDistance){best=candidate;bestDistance=distance}}}return best?{...best}:null;
}

/** 端点优先吸附；没有附近端点时吸附到最近墙体线段的垂足。 */
export function nearestWallTarget(point:Point,walls:Wall[],radius:number,excludeWallId?:string):Point|null {
  if(!Number.isFinite(radius)||radius<=0)return null;
  const endpoint=nearestWallEndpoint(point,walls,radius,excludeWallId);if(endpoint)return endpoint;
  let best:Point|null=null,distance=radius;
  for(const wall of walls){if(wall.id===excludeWallId)continue;const dx=wall.end.x-wall.start.x,dy=wall.end.y-wall.start.y,length2=dx*dx+dy*dy;if(length2===0)continue;const t=((point.x-wall.start.x)*dx+(point.y-wall.start.y)*dy)/length2;if(t<0||t>1)continue;const candidate={x:wall.start.x+dx*t,y:wall.start.y+dy*t},d=Math.hypot(point.x-candidate.x,point.y-candidate.y);if(d<=distance){distance=d;best=candidate}}
  return best;
}

/** 计算绘墙落点：正交时保持起点所在轴，并仅接受同轴吸附。 */
export function wallDrawingPoint(raw:Point,start:Point|null,orthogonal:boolean,snap:(point:Point)=>Point|null):{point:Point;target:Point|null} {
  const constrained=!!start&&orthogonal,horizontal=constrained&&Math.abs(raw.x-start!.x)>=Math.abs(raw.y-start!.y);
  const projected=constrained?(horizontal?{x:raw.x,y:start!.y}:{x:start!.x,y:raw.y}):raw;
  let target=snap(projected);if(target&&constrained&&(horizontal?Math.abs(target.y-start!.y)>1e-6:Math.abs(target.x-start!.x)>1e-6))target=null;
  const point=target?{...target}:{x:Math.round(projected.x/10)*10,y:Math.round(projected.y/10)*10};
  if(constrained){if(horizontal)point.y=start!.y;else point.x=start!.x}
  return {point,target};
}
