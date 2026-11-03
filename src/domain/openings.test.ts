import {describe,expect,it} from 'vitest';
import {createProject,doorSwingGeometry,parseProject,wallSegments,wallSolids,type DoorSwing} from './project';
import {createModel,disposeModel} from './model';
import * as THREE from 'three';
import {exportSvg} from './exportSvg';
import {exportHaProject,parseHaProject} from './haPackage';
describe('墙体门洞',()=>{
  it('旧项目导入后补充空门窗列表',()=>{const old=JSON.parse(JSON.stringify(createProject()));delete old.openings;expect(parseProject(old).openings).toEqual([])});
  it('门洞在 2D 留出缺口，在 3D 保留门楣',()=>{const p=createProject(),w=p.walls[0];p.openings=[{id:'door',wallId:w.id,kind:'door',center:.5,width:100,sill:0,height:210}];expect(wallSegments(w,p.openings)).toHaveLength(2);const solids=wallSolids(w,p.openings);expect(solids).toHaveLength(3);expect(solids.find(s=>s.start===250&&s.end===350)).toEqual({start:250,end:350,bottom:210,top:280});});
  it('门窗生成与开口一致的 3D 面板，不生成固定矩形地面',()=>{const p=createProject();p.openings=[{id:'glass',wallId:p.walls[0].id,kind:'window',center:.5,width:100,sill:90,height:120}];const model=createModel(p);const window=model.getObjectByName('opening-glass');expect(window?.position.x).toBe(400);expect(window?.position.y).toBe(150);expect(model.getObjectByName('floor')).toBeUndefined();disposeModel(model)});
  it('重叠的洞口不会产生互相覆盖的实体',()=>{const p=createProject(),w=p.walls[0];p.openings=[{id:'a',wallId:w.id,kind:'door',center:.5,width:100,sill:0,height:210},{id:'b',wallId:w.id,kind:'window',center:.5,width:100,sill:90,height:120}];const solids=wallSolids(w,p.openings);expect(solids.filter(s=>s.start===250&&s.end===350)).toEqual([{start:250,end:350,bottom:210,top:280}]);});
  it('四种开启方向在 2D、3D 和 HA 项目中保持一致',()=>{for(const [swing,x,y] of [['start-positive',350,200],['start-negative',350,0],['end-positive',450,200],['end-negative',450,0]] as [DoorSwing,number,number][]){const p=createProject(),w=p.walls[0];p.openings=[{id:'door',wallId:w.id,kind:'door',center:.5,width:100,sill:0,height:210,swing}];const shape=doorSwingGeometry(w,p.openings[0],1)!;expect(shape.tip).toEqual({x,y});expect(exportSvg(p)).toContain(`x2="${x}" y2="${y}"`);const model=createModel(p),door=model.getObjectByName('opening-door')!;expect(door.position.x).toBe(x);expect(door.position.z).toBe((100+y)/2);expect(parseHaProject(JSON.parse(exportHaProject(p))).openings[0].swing).toBe(swing);disposeModel(model)}});
  it('斜墙、不同校准比例及裁剪门洞的 2D 门板端点与 3D 门板一致',()=>{
    for(const [end,scale,center] of [[{x:400,y:400},.5,.5],[{x:100,y:700},2,.04],[{x:-200,y:300},1,1]] as [{x:number;y:number},number,number][]){
      for(const swing of ['start-positive','start-negative','end-positive','end-negative'] as DoorSwing[]){const p=createProject(),wall=p.walls[0];wall.end=end;p.cmPerUnit=scale;p.openings=[{id:'door',wallId:wall.id,kind:'door',center,width:80,sill:0,height:210,swing}];const shape=doorSwingGeometry(wall,p.openings[0],scale)!;const model=createModel(p),door=model.getObjectByName('opening-door') as THREE.Mesh;const width=(door.geometry as THREE.BoxGeometry).parameters.width,axis=new THREE.Vector3(1,0,0).applyEuler(door.rotation).multiplyScalar(width/2);const a=door.position.clone().sub(axis),b=door.position.clone().add(axis),expected=[new THREE.Vector3(shape.hinge.x*scale,105,shape.hinge.y*scale),new THREE.Vector3(shape.tip.x*scale,105,shape.tip.y*scale)];expect(Math.min(a.distanceTo(expected[0])+b.distanceTo(expected[1]),a.distanceTo(expected[1])+b.distanceTo(expected[0]))).toBeLessThan(1e-8);disposeModel(model)}
    }
  });
  it('拒绝不受支持的门方向或将门方向用于窗户',()=>{const p=createProject();p.openings=[{id:'d',wallId:p.walls[0].id,kind:'window',center:.5,width:100,sill:0,height:210,swing:'start-positive'}];expect(()=>parseProject(p)).toThrow()});
});
