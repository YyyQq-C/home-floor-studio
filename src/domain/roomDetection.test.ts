import {describe,it,expect} from 'vitest';
import {detectRooms} from './roomDetection';
import {polygonArea,type Wall} from './project';
import {createEmptyProject} from './project';
import {createModel,disposeModel} from './model';

/** 根据坐标构造测试墙体。 */
function wall(x1:number,y1:number,x2:number,y2:number):Wall{return{id:`${x1},${y1},${x2},${y2}`,start:{x:x1,y:y1},end:{x:x2,y:y2},height:280,thickness:12}}
describe('墙体提取房间',()=>{
  it('将相交与 T 形墙体拆分成两个房间，并忽略悬空支线',()=>{const walls=[wall(0,0,200,0),wall(200,0,200,100),wall(200,100,0,100),wall(0,100,0,0),wall(100,0,100,100),wall(0,50,20,50)];const rooms=detectRooms(walls);expect(rooms).toHaveLength(2);expect(rooms.map(polygonArea).sort((a,b)=>a-b)).toEqual([10000,10000])});
  it('未闭合墙体不生成房间',()=>{expect(detectRooms([wall(0,0,100,0),wall(100,0,100,100),wall(100,100,0,100)])).toEqual([])});
  it('生成的房间轮廓可用于 3D 地面',()=>{const walls=[wall(0,0,100,0),wall(100,0,100,100),wall(100,100,0,100),wall(0,100,0,0)],project=createEmptyProject();project.walls=walls;project.rooms=detectRooms(walls).map((points,i)=>({id:`r${i}`,name:'房间',color:'#e8dfcf',points}));const model=createModel(project);expect(model.getObjectByName('room-r0')).toBeDefined();disposeModel(model)});
  it('拒绝重叠墙体和独立嵌套墙环',()=>{expect(()=>detectRooms([wall(0,0,100,0),wall(20,0,80,0)])).toThrow('Overlapping walls');const ring=(x:number,y:number,n:number)=>[wall(x,y,x+n,y),wall(x+n,y,x+n,y+n),wall(x+n,y+n,x,y+n),wall(x,y+n,x,y)];expect(()=>detectRooms([...ring(0,0,200),...ring(50,50,50)])).toThrow('Nested wall loops')});
});
