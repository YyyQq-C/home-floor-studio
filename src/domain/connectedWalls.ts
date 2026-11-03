import {validRoomPolygon,type Point,type Room,type Wall} from './project';

/** 移动指定墙体端点，并按需同步原位置相同的其他墙体端点。 */
export function moveConnectedWalls(walls:Wall[],wallId:string,end:'start'|'end',target:Point,keepConnected:boolean):Wall[] {
  const wall=walls.find(item=>item.id===wallId);if(!wall)throw new Error('Wall not found');
  const origin=wall[end];
  const matches=(point:Point)=>point.x===origin.x&&point.y===origin.y;
  const updated=walls.map(item=>{const moveStart=(item.id===wallId&&end==='start')||(keepConnected&&item.id!==wallId&&matches(item.start)),moveEnd=(item.id===wallId&&end==='end')||(keepConnected&&item.id!==wallId&&matches(item.end));return moveStart||moveEnd?{...item,start:moveStart?{...target}:item.start,end:moveEnd?{...target}:item.end}:item});
  if(updated.some((item,index)=>item!==walls[index]&&item.start.x===item.end.x&&item.start.y===item.end.y))throw new Error('Wall would have zero length');
  return updated;
}

/** 同步移动与墙端完全重合的房间顶点，并拒绝产生无效轮廓。 */
export function moveConnectedRoomPoints(rooms:Room[],origin:Point,target:Point):Room[] {
  return rooms.map(room=>{if(!room.points.some(point=>point.x===origin.x&&point.y===origin.y))return room;const points=room.points.map(point=>point.x===origin.x&&point.y===origin.y?{...target}:point);if(!validRoomPolygon(points))throw new Error('Room would become invalid');return {...room,points}});
}
