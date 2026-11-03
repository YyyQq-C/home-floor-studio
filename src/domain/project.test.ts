import { describe, it, expect } from 'vitest';
import { createDemoProject,createProject, parseProject, polygonArea, wallLength } from './project';
describe('户型数据', () => {
  it('示例项目可序列化并恢复', () => { const p = createProject(); expect(parseProject(JSON.parse(JSON.stringify(p)))).toEqual(p); });
  it('主动加载的完整示例包含房间、门窗、家具和设备',()=>{const p=createDemoProject();expect(p.name).toBe('示例户型');expect(p.rooms.length).toBeGreaterThan(0);expect(p.openings.length).toBeGreaterThan(0);expect(p.furniture.length).toBeGreaterThan(0);expect(p.markers.length).toBeGreaterThan(0);expect(parseProject(JSON.parse(JSON.stringify(p)))).toEqual(p)});
  it('示例房间覆盖完整户型，并包含 2D/3D 家具演示',()=>{const p=createDemoProject();expect(p.rooms).toHaveLength(4);expect(p.rooms.reduce((area,room)=>area+polygonArea(room.points),0)).toBe(600*400);expect(p.furniture.map(item=>item.kind)).toEqual(expect.arrayContaining(['sofa','bed','table','chair','tv-cabinet']));expect(p.walls.find(wall=>wall.id==='wall-4')?.end.y).toBe(500);expect(p.walls.find(wall=>wall.id==='wall-6')?.end.x).toBe(700)});
  it('拒绝无效墙体数据', () => { const p = createProject(); p.walls[0].height = -1; expect(() => parseProject(p)).toThrow(); });
  it('拒绝外部参考图片地址', () => { const p = createProject(); p.background='https://example.com/image.png'; expect(() => parseProject(p)).toThrow(); });
  it('拒绝空 ID 和跨类型重复 ID',()=>{const p=createDemoProject();p.markers[0].id=p.walls[0].id;expect(()=>parseProject(p)).toThrow('Duplicate or empty');p.markers[0].id='  ';expect(()=>parseProject(p)).toThrow('Duplicate or empty')});
  it('按坐标计算墙长', () => { expect(wallLength({id:'a',start:{x:0,y:0},end:{x:3,y:4},thickness:1,height:1})).toBe(5); });
});
