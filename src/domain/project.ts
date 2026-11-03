import type {FurnitureKind} from './furnitureGlyph';
import {validMarkerIcon,type MarkerIcon} from './markerIcons';
export type Point = { x: number; y: number };
export type WallFinish='matte'|'satin'|'gloss';
export type Wall = { id: string; start: Point; end: Point; thickness: number; height: number; color?: string; finish?: WallFinish };
export type Marker = { id: string; name: string; kind: string; position: Point; height?: number; roomId?: string; icon?: MarkerIcon };
export type DoorSwing='closed'|'start-positive'|'start-negative'|'end-positive'|'end-negative';
export type Opening = { id: string; wallId: string; kind: 'door' | 'window'; center: number; width: number; sill: number; height: number; swing?:DoorSwing };
export type Furniture = { id: string; kind: FurnitureKind; position: Point; width: number; depth: number; height: number; rotation: number; color?: string };
export type Room = {id:string; name:string; points:Point[]; color:string; floorStyle?:'solid'|'wood'|'tile'};
export type Project = { version: 1; name: string; walls: Wall[]; markers: Marker[]; openings: Opening[]; furniture: Furniture[]; rooms: Room[]; cmPerUnit: number | null; background: string | null };

/** 创建不包含任何示例对象的空白户型。 */
export function createEmptyProject(): Project {return {version:1,name:'我的户型',cmPerUnit:null,background:null,markers:[],openings:[],furniture:[],rooms:[],walls:[]};}

/** 创建不包含个人信息的示例户型。 */
export function createProject(): Project {
  const points = [[100,100,700,100],[700,100,700,500],[700,500,100,500],[100,500,100,100],[350,100,350,300],[350,300,100,300],[350,300,550,300]];
  return { version: 1, name: '我的户型', cmPerUnit: null, background: null, markers: [], openings: [], furniture: [], rooms: [], walls: points.map(([x1,y1,x2,y2], index) => ({ id: `wall-${index}`, start: { x:x1,y:y1 }, end: { x:x2,y:y2 }, thickness: 12, height: 280 })) };
}

/** 创建带房间、家具和门窗的示例，仅在用户选择加载示例时使用。 */
export function createDemoProject():Project {
  const project=createProject();project.name='示例户型';
  // 示例隔墙围出四个完整房间，保证二维平面和三维地面覆盖整个户型。
  project.walls=project.walls.map(wall=>wall.id==='wall-4'?{...wall,end:{...wall.end,y:500}}:wall.id==='wall-6'?{...wall,end:{...wall.end,x:700}}:wall);
  project.rooms=[
    {id:'demo-room-living',name:'客厅',color:'#e8dfcf',floorStyle:'wood',points:[{x:100,y:100},{x:350,y:100},{x:350,y:300},{x:100,y:300}]},
    {id:'demo-room-bedroom',name:'卧室',color:'#e9e4dc',floorStyle:'wood',points:[{x:100,y:300},{x:350,y:300},{x:350,y:500},{x:100,y:500}]},
    {id:'demo-room-dining',name:'餐厅',color:'#e8e5dc',floorStyle:'tile',points:[{x:350,y:100},{x:700,y:100},{x:700,y:300},{x:350,y:300}]},
    {id:'demo-room-study',name:'书房',color:'#e6e9e4',floorStyle:'wood',points:[{x:350,y:300},{x:700,y:300},{x:700,y:500},{x:350,y:500}]}
  ];
  project.openings=[
    {id:'demo-window',wallId:'wall-0',kind:'window',center:.2,width:110,sill:90,height:120},
    {id:'demo-living-door',wallId:'wall-4',kind:'door',center:.25,width:80,sill:0,height:210},
    {id:'demo-bedroom-door',wallId:'wall-4',kind:'door',center:.75,width:80,sill:0,height:210},
    {id:'demo-door',wallId:'wall-5',kind:'door',center:.5,width:80,sill:0,height:210},
    {id:'demo-study-door',wallId:'wall-6',kind:'door',center:.5,width:80,sill:0,height:210}
  ];
  project.furniture=[
    {id:'demo-sofa',kind:'sofa',position:{x:200,y:215},rotation:0,width:160,depth:70,height:80},
    {id:'demo-bed',kind:'bed',position:{x:220,y:400},rotation:90,width:150,depth:180,height:50},
    {id:'demo-dining-table',kind:'table',position:{x:525,y:200},rotation:0,width:130,depth:80,height:75},
    {id:'demo-dining-chair',kind:'chair',position:{x:525,y:270},rotation:0,width:45,depth:45,height:85},
    {id:'demo-study-table',kind:'table',position:{x:500,y:400},rotation:0,width:120,depth:65,height:75},
    {id:'demo-study-cabinet',kind:'tv-cabinet',position:{x:670,y:400},rotation:90,width:160,depth:40,height:45}
  ];
  project.markers=[{id:'demo-light',name:'示例灯光',kind:'light',position:{x:300,y:160}}];return project;
}

/** 判断导入项目是否符合当前版本的基本结构。 */
export function parseProject(value: unknown): Project {
  if (!value || typeof value !== 'object') throw new Error('Invalid project format');
  const p = value as Project;
  // 旧项目没有门窗字段时使用空列表，保留版本 1 项目的兼容性。
  if ((p as Partial<Project>).openings === undefined) p.openings = [];
  if ((p as Partial<Project>).furniture === undefined) p.furniture = [];
  if ((p as Partial<Project>).rooms === undefined) p.rooms = [];
  if ((p as Partial<Project>).cmPerUnit === undefined) p.cmPerUnit = null;
  const point = (v: Point) => v && Number.isFinite(v.x) && Number.isFinite(v.y);
  if (p.version !== 1 || !(p.cmPerUnit === null || (Number.isFinite(p.cmPerUnit) && p.cmPerUnit >= 0.05 && p.cmPerUnit <= 20)) || typeof p.name !== 'string' || !Array.isArray(p.walls) || !Array.isArray(p.markers) || !(p.background === null || (typeof p.background === 'string' && p.background.length <= 7000000 && /^data:image\/(png|jpeg);base64,[a-z0-9+/=]+$/i.test(p.background))) || !p.walls.every(w => w && typeof w.id === 'string' && point(w.start) && point(w.end) && (w.color === undefined || (typeof w.color === 'string' && /^#[0-9a-f]{6}$/i.test(w.color))) && (w.finish === undefined || ['matte','satin','gloss'].includes(w.finish)) && Number.isFinite(w.height) && w.height > 0 && Number.isFinite(w.thickness) && w.thickness > 0) || !Array.isArray(p.openings) || !p.openings.every(o => o && typeof o.id === 'string' && typeof o.wallId === 'string' && p.walls.some(w=>w.id===o.wallId) && (o.kind==='door'||o.kind==='window') && (o.swing===undefined||(o.kind==='door'&&['closed','start-positive','start-negative','end-positive','end-negative'].includes(o.swing))) && Number.isFinite(o.center) && o.center >= 0 && o.center <= 1 && Number.isFinite(o.width) && o.width > 0 && Number.isFinite(o.height) && o.height > 0 && Number.isFinite(o.sill) && o.sill >= 0) || !Array.isArray(p.furniture) || !p.furniture.every(f=>f && typeof f.id==='string' && ['bed','sofa','table','cabinet','chair','toilet','sink','shower','tv-cabinet','kitchen-counter'].includes(f.kind) && point(f.position) && [f.width,f.depth,f.height].every(n=>Number.isFinite(n) && n>0 && n<=10000) && Number.isFinite(f.rotation) && (f.color === undefined || (typeof f.color === 'string' && /^#[0-9a-f]{6}$/i.test(f.color)))) || !Array.isArray(p.rooms) || !p.rooms.every(r=>r && typeof r.id==='string' && typeof r.name==='string' && (r.floorStyle===undefined||['solid','wood','tile'].includes(r.floorStyle)) && /^#[0-9a-f]{6}$/i.test(r.color) && Array.isArray(r.points) && r.points.length>=3 && r.points.length<=200 && r.points.every(point) && validRoomPolygon(r.points)) || !p.markers.every(m => m && typeof m.id === 'string' && typeof m.name === 'string' && typeof m.kind === 'string' && point(m.position) && (m.height === undefined || (Number.isFinite(m.height) && m.height >= 0 && m.height <= 10000)) && (m.roomId === undefined || typeof m.roomId === 'string') && (m.icon === undefined || validMarkerIcon(m.icon)))) throw new Error('Invalid project data');
  // 选择、门窗引用及 HA 绑定都依赖全局唯一 ID，禁止导入冲突数据。
  const ids=new Set<string>();for(const item of [...p.walls,...p.openings,...p.rooms,...p.furniture,...p.markers]){if(!item.id.trim()||ids.has(item.id))throw new Error('Duplicate or empty project object ID');ids.add(item.id);}
  return p;
}

/** 计算墙体在画布坐标系中的长度。 */
export function wallLength(wall: Wall): number { return Math.hypot(wall.end.x-wall.start.x, wall.end.y-wall.start.y); }

/** 根据墙长裁剪门窗区间，并合并重叠范围，保证生成几何有效。 */
export function wallSpans(wall: Wall, openings: Opening[], scale=1) {
  const length=wallLength(wall);
  const parts=openings.filter(o=>o.wallId===wall.id).map(o=>({start:Math.max(0,o.center*length-o.width/(2*scale)),end:Math.min(length,o.center*length+o.width/(2*scale)),sill:Math.min(wall.height,o.sill),top:Math.min(wall.height,o.sill+o.height)})).filter(o=>o.end>o.start&&o.top>o.sill).sort((a,b)=>a.start-b.start);
  return {length,parts};
}
/** 计算门铰链、开启门板端点和弧线方向，坐标位于画布平面。 */
export function doorSwingGeometry(wall:Wall,opening:Opening,scale:number) {
  if(opening.kind!=='door'||!opening.swing||opening.swing==='closed')return null;
  const {length,parts}=wallSpans(wall,[opening],scale),part=parts[0];if(!length||!part)return null;
  const ux=(wall.end.x-wall.start.x)/length,uy=(wall.end.y-wall.start.y)/length,startHinge=opening.swing.startsWith('start-'),side=opening.swing.endsWith('-positive')?1:-1,width=part.end-part.start;
  const at=(distance:number)=>({x:wall.start.x+ux*distance,y:wall.start.y+uy*distance});const hinge=at(startHinge?part.start:part.end),closed=at(startHinge?part.end:part.start),tip={x:hinge.x-uy*width*side,y:hinge.y+ux*width*side};
  return {hinge,closed,tip,width,sweep:(startHinge?side:-side)>0?1:0};
}
/** 将墙体按门窗分割成不重叠的实心矩形。 */
export function wallSolids(wall: Wall, openings: Opening[], scale=1) {
  const {length,parts}=wallSpans(wall,openings,scale);
  const edges=[...new Set([0,length,...parts.flatMap(p=>[p.start,p.end])])].sort((a,b)=>a-b);
  const solids:{start:number;end:number;bottom:number;top:number}[]=[];
  for(let i=0;i<edges.length-1;i++) {
    const start=edges[i],end=edges[i+1],mid=(start+end)/2;
    const cuts=parts.filter(p=>p.start<mid&&p.end>mid).map(p=>({bottom:p.sill,top:p.top})).sort((a,b)=>a.bottom-b.bottom);
    let bottom=0;
    for(const cut of cuts) { if(cut.bottom>bottom) solids.push({start,end,bottom,top:cut.bottom}); bottom=Math.max(bottom,cut.top); }
    if(bottom<wall.height) solids.push({start,end,bottom,top:wall.height});
  }
  return solids;
}
/** 计算俯视图中需要绘制的墙段，门窗位置留空。 */
export function wallSegments(wall: Wall, openings: Opening[], scale=1) {
  const {length,parts}=wallSpans(wall,openings,scale);
  if(!length)return [];
  const result:{start:Point;end:Point}[]=[]; let offset=0;
  const point=(distance:number)=>({x:wall.start.x+(wall.end.x-wall.start.x)*distance/length,y:wall.start.y+(wall.end.y-wall.start.y)*distance/length});
  for(const part of parts) { if(part.start>offset)result.push({start:point(offset),end:point(part.start)}); offset=Math.max(offset,part.end); }
  if(offset<length)result.push({start:point(offset),end:point(length)});
  return result;
}

/** 获取基础家具默认尺寸，单位为厘米。 */
export function furnitureDefaults(kind:Furniture['kind']): Pick<Furniture,'width'|'depth'|'height'> {
  switch(kind) { case 'bed':return {width:180,depth:200,height:50}; case 'sofa':return {width:200,depth:90,height:80}; case 'table':return {width:140,depth:80,height:75}; case 'cabinet':return {width:100,depth:45,height:180}; case 'tv-cabinet':return {width:180,depth:40,height:45}; case 'kitchen-counter':return {width:120,depth:60,height:90}; case 'chair':return {width:50,depth:50,height:85}; case 'toilet':return {width:40,depth:70,height:75}; case 'sink':return {width:60,depth:50,height:85}; case 'shower':return {width:90,depth:90,height:210}; }
}

/** 使用鞋带公式计算闭合多边形的面积，单位为画布单位的平方。 */
export function polygonArea(points: Point[]):number {
  if(points.length<3)return 0;
  return Math.abs(points.reduce((sum,p,index)=>{const next=points[(index+1)%points.length];return sum+p.x*next.y-next.x*p.y},0))/2;
}
/** 为房间名称寻找内部位置，凹形轮廓的中心在外部时使用最宽水平截面。 */
export function roomLabelPosition(points:Point[]):Point {
  const center=points.reduce((sum,p)=>({x:sum.x+p.x/points.length,y:sum.y+p.y/points.length}),{x:0,y:0});
  if(points.length<3)return center;
  const intersections=(y:number)=>{const xs:number[]=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a.y>y)!==(b.y>y))xs.push(a.x+(y-a.y)*(b.x-a.x)/(b.y-a.y))}return xs.sort((a,b)=>a-b)};
  const middle=intersections(center.y);for(let i=0;i+1<middle.length;i+=2)if(center.x>middle[i]&&center.x<middle[i+1])return center;
  const minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));let best=center,width=0;
  for(let sample=0;sample<64;sample++){const y=minY+(maxY-minY)*(sample+.5)/64,xs=intersections(y);for(let i=0;i+1<xs.length;i+=2){const span=xs[i+1]-xs[i];if(span>width||(span===width&&Math.abs(y-center.y)<Math.abs(best.y-center.y))){width=span;best={x:(xs[i]+xs[i+1])/2,y}}}}
  return best;
}
/** 判断房间轮廓是否具有面积且不存在非相邻边交叉。 */
export function validRoomPolygon(points: Point[]):boolean {
  if(points.length<3||points.length>200||polygonArea(points)<=0)return false;
  const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  const on=(a:Point,b:Point,c:Point)=>c.x>=Math.min(a.x,b.x)&&c.x<=Math.max(a.x,b.x)&&c.y>=Math.min(a.y,b.y)&&c.y<=Math.max(a.y,b.y);
  for(let i=0;i<points.length;i++) {const a=points[i],b=points[(i+1)%points.length];if(a.x===b.x&&a.y===b.y)return false;for(let j=i+1;j<points.length;j++) {if(j===i+1||(i===0&&j===points.length-1))continue;const c=points[j],d=points[(j+1)%points.length],ab1=cross(a,b,c),ab2=cross(a,b,d),cd1=cross(c,d,a),cd2=cross(c,d,b);if((ab1*ab2<0&&cd1*cd2<0)||(ab1===0&&on(a,b,c))||(ab2===0&&on(a,b,d))||(cd1===0&&on(c,d,a))||(cd2===0&&on(c,d,b)))return false;}}
  return true;
}

/** 获取画布单位对应的厘米；未校准时按示意比例显示。 */
export function projectScale(project: Project):number {return project.cmPerUnit ?? 1;}
/** 根据已知墙长计算比例，拒绝不合理或退化的尺寸。 */
export function calibratedScale(wall:Wall,actualCm:number):number {const length=wallLength(wall);const scale=actualCm/length;if(!Number.isFinite(scale)||scale<0.05||scale>20)throw new Error('Invalid calibration length');return scale;}

/** 取得设备的三维离地高度，旧项目沿用墙体上方的默认显示位置。 */
export function markerHeight(marker:Marker,project:Project):number {return marker.height ?? project.walls.reduce((height,wall)=>Math.max(height,wall.height+5),285);}
