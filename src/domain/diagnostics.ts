import {projectScale,wallLength,type Point,type Project,type Wall} from './project';

export type Diagnostic={key:string;message:string;target?:string;focus?:Point};
/** 判断端点是否位于另一墙体线段上，包括 T 形连接。 */
function pointOnWall(point:Point,wall:Wall):boolean {
  const dx=wall.end.x-wall.start.x,dy=wall.end.y-wall.start.y,length2=dx*dx+dy*dy;if(length2<=1e-12)return false;
  const t=((point.x-wall.start.x)*dx+(point.y-wall.start.y)*dy)/length2;if(t<0||t>1)return false;
  return Math.hypot(point.x-(wall.start.x+t*dx),point.y-(wall.start.y+t*dy))<=1e-6;
}
/** 查找两面共线墙体的重叠中点，仅端点相接不算重叠。 */
function overlappingWallMidpoint(a:Wall,b:Wall):Point|null {
  const dx=a.end.x-a.start.x,dy=a.end.y-a.start.y,length=Math.hypot(dx,dy),otherLength=wallLength(b);if(length<=1e-6||otherLength<=1e-6)return null;
  const ux=dx/length,uy=dy/length;const project=(p:Point)=>({along:(p.x-a.start.x)*ux+(p.y-a.start.y)*uy,offset:Math.abs((p.x-a.start.x)*uy-(p.y-a.start.y)*ux)});
  const first=project(b.start),last=project(b.end);if(first.offset>1e-6||last.offset>1e-6)return null;
  const start=Math.max(0,Math.min(first.along,last.along)),end=Math.min(length,Math.max(first.along,last.along));if(end-start<=1e-6)return null;
  return {x:a.start.x+ux*(start+end)/2,y:a.start.y+uy*(start+end)/2};
}
/** 检查影响成图的常见缺项及门窗裁剪，结果仅供人工核对。 */
export function inspectProject(project:Project):Diagnostic[] {
  const issues:Diagnostic[]=[];const scale=projectScale(project),walls=project.walls.slice(0,500),openingsToCheck=project.openings.slice(0,500);let truncated=false;
  /** 限制报告数量，防止大量重复问题撑爆界面。 */
  const addIssue=(issue:Diagnostic)=>{if(issues.length<200)issues.push(issue);else truncated=true};
  if(project.walls.length>walls.length)addIssue({key:'wall-check-limit',message:`共有 ${project.walls.length} 面墙，本次仅检查前 ${walls.length} 面，其他墙体未纳入连接及重叠判断。`});
  if(project.openings.length>openingsToCheck.length)addIssue({key:'opening-check-limit',message:`共有 ${project.openings.length} 个门窗，本次仅检查前 ${openingsToCheck.length} 个，其他门窗未检查。`});
  if(!project.walls.length)addIssue({key:'no-walls',message:'尚未绘制墙体，3D 模型不会生成墙面。'});
  if(!project.rooms.length)addIssue({key:'no-rooms',message:'尚未创建房间，3D 模型不会生成房间地面。'});
  if(project.cmPerUnit===null)addIssue({key:'uncalibrated',message:'尚未校准比例，长度与面积仅为示意。请选择墙体并输入已知墙长。'});
  for(const [index,wall] of walls.entries()){
    const length=wallLength(wall)*scale;
    if(length<=1e-6)addIssue({key:`wall-${wall.id}`,target:wall.id,message:`第 ${index+1} 面墙长度为零，无法生成墙体。`});
    if(length>1e-6)for(const end of ['start','end'] as const){const point=wall[end];if(!walls.some((other,i)=>i!==index&&pointOnWall(point,other)))addIssue({key:`loose-${wall.id}-${end}`,target:wall.id,focus:point,message:`第 ${index+1} 面墙的${end==='start'?'起点':'终点'}未连接其他墙体，可能影响房间闭合；悬空墙可忽略。`})}
    const openings=openingsToCheck.filter(opening=>opening.wallId===wall.id);
    for(const opening of openings){const label=opening.kind==='door'?'门':'窗',half=opening.width/2,center=opening.center*length,focus={x:wall.start.x+(wall.end.x-wall.start.x)*opening.center,y:wall.start.y+(wall.end.y-wall.start.y)*opening.center};
      if(center-half < -1e-6||center+half > length+1e-6)addIssue({key:`width-${opening.id}`,target:opening.id,focus,message:`第 ${index+1} 面墙的${label}超出墙体长度，成图会裁剪。`});
      if(opening.sill+opening.height>wall.height+1e-6)addIssue({key:`height-${opening.id}`,target:opening.id,focus,message:`第 ${index+1} 面墙的${label}超出墙体高度，3D 会裁剪或不显示。`});
    }
    // 二维和三维共用墙洞，提示水平范围重叠的门窗以便人工判断。
    const spans=openings.map(o=>({opening:o,start:o.center*length-o.width/2,end:o.center*length+o.width/2})).sort((a,b)=>a.start-b.start);
    for(let i=0;i<spans.length;i++)for(let j=i+1;j<spans.length&&spans[j].start<spans[i].end-1e-6;j++)addIssue({key:`overlap-${spans[i].opening.id}-${spans[j].opening.id}`,target:spans[j].opening.id,message:`第 ${index+1} 面墙存在水平重叠的门窗，请核对位置。`});
  }
  // 提示共线重叠墙体，避免自动识别房间时只能得到笼统错误。
  for(let i=0;i<walls.length;i++)for(let j=i+1;j<walls.length;j++){const focus=overlappingWallMidpoint(walls[i],walls[j]);if(focus)addIssue({key:`wall-overlap-${walls[i].id}-${walls[j].id}`,target:walls[j].id,focus,message:`第 ${i+1} 面墙与第 ${j+1} 面墙的中心线重叠，请调整或删除重复墙体。`})}
  // 保留设备绑定数据并提示用户重新选择被删除的房间。
  for(const marker of project.markers)if(marker.roomId&&!project.rooms.some(room=>room.id===marker.roomId))addIssue({key:`missing-room-${marker.id}`,target:marker.id,focus:marker.position,message:`设备“${marker.name}”关联的房间已删除，请重新选择所属房间。`});
  if(truncated)issues.push({key:'issue-check-limit',message:'检查结果超过 200 条，仅显示前 200 条，请修正后重新检查。'});
  return issues;
}
