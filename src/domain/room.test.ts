import {describe,it,expect} from 'vitest';
import {createProject,parseProject,polygonArea,validRoomPolygon,roomLabelPosition} from './project';
import {createModel,disposeModel} from './model';
import {exportSvg} from './exportSvg';
import {exportHaProject,parseHaProject} from './haPackage';
describe('房间区域',()=>{
  it('计算面积并拒绝自交和退化边界',()=>{const pts=[{x:0,y:0},{x:300,y:0},{x:300,y:200},{x:0,y:200}];expect(polygonArea(pts)).toBe(60000);expect(validRoomPolygon(pts)).toBe(true);expect(validRoomPolygon([pts[0],pts[2],pts[1],pts[3]])).toBe(false)});
  it('凹形房间名称位于内部，矩形名称保留中心位置',()=>{const u=[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:80,y:100},{x:80,y:20},{x:20,y:20},{x:20,y:100},{x:0,y:100}];const label=roomLabelPosition(u);expect(label.x>0&&label.x<100&&label.y>0&&label.y<100&&(label.y<20||label.x<20||label.x>80)).toBe(true);expect(roomLabelPosition([{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}])).toEqual({x:50,y:50})});
  it('房间文字输出在家具之后，避免被家具盖住',()=>{const p=createProject();p.rooms.push({id:'r',name:'客厅',color:'#eeeeee',points:[{x:0,y:0},{x:300,y:0},{x:300,y:200},{x:0,y:200}]});p.furniture.push({id:'f',kind:'bed',position:{x:150,y:100},width:180,depth:200,height:50,rotation:0});const svg=exportSvg(p);expect(svg.indexOf('客厅')).toBeGreaterThan(svg.indexOf('translate(150 100)'));expect(svg).toContain('paint-order="stroke"')});
  it('2D、3D、HA 包保留同一房间',()=>{const p=createProject();p.rooms.push({id:'r',name:'客厅',color:'#eeeeee',points:[{x:0,y:0},{x:300,y:0},{x:300,y:200},{x:0,y:200}]});expect(exportSvg(p)).toContain('客厅');const model=createModel(p);expect(model.getObjectByName('room-r')).toBeDefined();disposeModel(model);expect(parseHaProject(JSON.parse(exportHaProject(p))).rooms).toEqual(p.rooms)});
  it('兼容不含房间的旧项目',()=>{const p=JSON.parse(JSON.stringify(createProject()));delete p.rooms;expect(parseProject(p).rooms).toEqual([])});
});
