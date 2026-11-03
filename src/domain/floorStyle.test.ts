import {describe,it,expect} from 'vitest';
import {createProject,parseProject} from './project';
import {exportSvg} from './exportSvg';
import {exportHaProject,parseHaProject} from './haPackage';
describe('平面图材质',()=>{
  it('房间纹理随项目和 HA 包保留，并输出至 SVG',()=>{const p=createProject();p.rooms.push({id:'r',name:'客厅',color:'#e8dfcf',floorStyle:'wood',points:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}]});expect(exportSvg(p)).toContain('fill="url(#floor-wood)"');expect(parseHaProject(JSON.parse(exportHaProject(p))).rooms[0].floorStyle).toBe('wood')});
  it('旧房间可以无材质字段，非法材质被拒绝',()=>{const p=createProject();p.rooms.push({id:'r',name:'客厅',color:'#eeeeee',points:[{x:0,y:0},{x:100,y:0},{x:100,y:100}]});expect(parseProject(p).rooms[0].floorStyle).toBeUndefined();expect(()=>parseProject({...p,rooms:[{...p.rooms[0],floorStyle:'invalid'}]})).toThrow()});
});
