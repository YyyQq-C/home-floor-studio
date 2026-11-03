import {describe,it,expect} from 'vitest';
import {moveConnectedRoomPoints,moveConnectedWalls} from './connectedWalls';
import {createDemoProject,createProject} from './project';

describe('移动相连墙体',()=>{
  it('同步移动共同端点，且不修改原数据',()=>{const walls=createProject().walls,next=moveConnectedWalls(walls,'wall-0','start',{x:80,y:90},true);expect(next[0].start).toEqual({x:80,y:90});expect(next[3].end).toEqual({x:80,y:90});expect(walls[0].start).toEqual({x:100,y:100})});
  it('关闭连接保持时只移动所选端点',()=>{const next=moveConnectedWalls(createProject().walls,'wall-0','start',{x:80,y:90},false);expect(next[3].end).toEqual({x:100,y:100})});
  it('拒绝使相邻墙体退化的移动',()=>{const walls=createProject().walls;expect(()=>moveConnectedWalls(walls,'wall-0','start',{x:100,y:500},true)).toThrow('Wall would have zero length')});
  it('同步完全重合的房间顶点并保留房间属性',()=>{const rooms=createDemoProject().rooms,next=moveConnectedRoomPoints(rooms,{x:100,y:100},{x:80,y:90});expect(next[0].points[0]).toEqual({x:80,y:90});expect(next[0].name).toBe('客厅');expect(next[1]).toBe(rooms[1]);expect(rooms[0].points[0]).toEqual({x:100,y:100})});
  it('拒绝使房间轮廓退化的移动',()=>{const rooms=createDemoProject().rooms;expect(()=>moveConnectedRoomPoints(rooms,{x:100,y:100},{x:350,y:100})).toThrow('Room would become invalid')});
});
