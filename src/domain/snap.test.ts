import {describe,it,expect} from 'vitest';
import {nearestWallEndpoint,nearestWallTarget,wallDrawingPoint} from './snap';
import {createProject} from './project';
describe('墙体端点吸附',()=>{
  it('选择范围内最近的端点并允许排除当前墙体',()=>{const walls=createProject().walls;expect(nearestWallEndpoint({x:103,y:102},walls,10)).toEqual({x:100,y:100});expect(nearestWallEndpoint({x:103,y:102},walls,2)).toBeNull();expect(nearestWallEndpoint({x:103,y:102},walls,10,'wall-0')).toEqual({x:100,y:100})});
  it('吸附到墙身并优先端点，允许排除当前墙',()=>{const walls=[{id:'a',start:{x:0,y:0},end:{x:100,y:0},height:280,thickness:12}];expect(nearestWallTarget({x:50,y:4},walls,6)).toEqual({x:50,y:0});expect(nearestWallTarget({x:4,y:1},walls,6)).toEqual({x:0,y:0});expect(nearestWallTarget({x:50,y:4},walls,6,'a')).toBeNull();expect(nearestWallTarget({x:50,y:7},walls,6)).toBeNull()});
  it('斜墙吸附返回垂足',()=>{const walls=[{id:'a',start:{x:0,y:0},end:{x:100,y:100},height:280,thickness:12}];expect(nearestWallTarget({x:50,y:54},walls,6)).toEqual({x:52,y:52})});
  it('正交绘制保持起点坐标，并拒绝偏离轴线的吸附',()=>{const start={x:103,y:107},none=()=>null;expect(wallDrawingPoint({x:201,y:125},start,true,none).point).toEqual({x:200,y:107});expect(wallDrawingPoint({x:110,y:205},start,true,none).point).toEqual({x:103,y:210});expect(wallDrawingPoint({x:201,y:125},start,true,()=>({x:200,y:109})).target).toBeNull();expect(wallDrawingPoint({x:201,y:125},start,true,()=>({x:205,y:107})).point).toEqual({x:205,y:107})});
});
