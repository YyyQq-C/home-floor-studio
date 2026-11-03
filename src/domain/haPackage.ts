import {parseProject, type Project} from './project';

/** 生成不含原始底图和凭据的 HA 户型数据。 */
export function exportHaProject(project: Project): string {
  // 只导出卡片需要的字段，避免导入项目中额外携带的私有数据进入安装包。
  const point=(p:{x:number;y:number})=>({x:p.x,y:p.y});
  const clean:Project={version:1,name:project.name,cmPerUnit:project.cmPerUnit,background:null,
    walls:project.walls.map(w=>({id:w.id,start:point(w.start),end:point(w.end),thickness:w.thickness,height:w.height,color:w.color,finish:w.finish})),
    openings:project.openings.map(o=>({id:o.id,wallId:o.wallId,kind:o.kind,center:o.center,width:o.width,height:o.height,sill:o.sill,swing:o.swing})),
    rooms:project.rooms.map(r=>({id:r.id,name:r.name,points:r.points.map(point),color:r.color,floorStyle:r.floorStyle})),
    furniture:project.furniture.map(f=>({id:f.id,kind:f.kind,position:point(f.position),width:f.width,depth:f.depth,height:f.height,rotation:f.rotation,color:f.color})),
    markers:project.markers.map(m=>({id:m.id,name:m.name,kind:m.kind,position:point(m.position),height:m.height,roomId:m.roomId,icon:m.icon}))};
  return JSON.stringify({format:'home-floor-studio',version:1,project:clean},null,2);
}

/** 校验 HA 使用的版本化户型包。 */
export function parseHaProject(value:unknown):Project {
  if(!value || typeof value!=='object') throw new Error('Invalid floor package');
  const wrapper=value as {format?:unknown;version?:unknown;project?:unknown};
  if(wrapper.format!=='home-floor-studio'||wrapper.version!==1)throw new Error('Unsupported floor package');
  const project=parseProject(wrapper.project);
  if(project.background!==null)throw new Error('Floor package must not contain background images');
  return project;
}
