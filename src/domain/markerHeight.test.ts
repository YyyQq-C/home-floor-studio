import {describe,expect,it} from 'vitest';
import {createDemoProject,markerHeight,parseProject} from './project';
import {exportHaProject,parseHaProject} from './haPackage';

describe('设备空间属性',()=>{
  it('兼容旧标记，并允许地面高度为零',()=>{const p=createDemoProject(),marker=p.markers[0];expect(markerHeight(marker,p)).toBe(285);marker.height=0;expect(markerHeight(marker,p)).toBe(0);marker.height=180;marker.roomId=p.rooms[0].id;const restored=parseHaProject(JSON.parse(exportHaProject(p)));expect(restored.markers[0]).toMatchObject({height:180,roomId:p.rooms[0].id});expect(markerHeight(restored.markers[0],restored)).toBe(180)});
  it('拒绝非法高度及房间字段',()=>{const p=createDemoProject();p.markers[0].height=-1;expect(()=>parseProject(structuredClone(p))).toThrow();p.markers[0].height=10001;expect(()=>parseProject(structuredClone(p))).toThrow();p.markers[0].height=10;(p.markers[0] as unknown as {roomId:number}).roomId=42;expect(()=>parseProject(structuredClone(p))).toThrow()});
});
