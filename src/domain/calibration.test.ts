import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {createProject,calibratedScale,parseProject,polygonArea,wallSegments} from './project';
import {createModel,disposeModel} from './model';
import {exportSvg} from './exportSvg';
import {exportHaProject,parseHaProject} from './haPackage';
describe('比例校准',()=>{
  it('已知墙长换算比例并拒绝无效值',()=>{const p=createProject();expect(calibratedScale(p.walls[0],300)).toBe(.5);expect(()=>calibratedScale(p.walls[0],0)).toThrow();const old=JSON.parse(JSON.stringify(p));delete old.cmPerUnit;expect(parseProject(old).cmPerUnit).toBeNull()});
  it('二维门洞、三维墙体、家具位置和房间面积按相同比例换算',()=>{const p=createProject();p.cmPerUnit=.5;p.openings.push({id:'door',wallId:p.walls[0].id,kind:'door',center:.5,width:100,sill:0,height:210});p.furniture.push({id:'f',kind:'bed',position:{x:200,y:300},width:180,depth:200,height:50,rotation:0});const segments=wallSegments(p.walls[0],p.openings,.5);expect(segments[0].end.x).toBe(300);expect(segments[1].start.x).toBe(500);const m=createModel(p);const segment=m.getObjectByName('wall-0-0') as THREE.Mesh;segment.geometry.computeBoundingBox();expect(segment.geometry.boundingBox?.max.x).toBe(50);expect(m.getObjectByName('floor')).toBeUndefined();expect(m.getObjectByName('f')?.position.x).toBe(100);expect(exportSvg(p)).toContain('scale(3.6 4)');expect(polygonArea([{x:0,y:0},{x:200,y:0},{x:200,y:200},{x:0,y:200}])*.5*.5/10000).toBe(1);expect(parseHaProject(JSON.parse(exportHaProject(p))).cmPerUnit).toBe(.5);disposeModel(m)});
});
