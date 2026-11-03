import {describe,expect,it} from 'vitest';
import * as THREE from 'three';
import {createProject,parseProject} from './project';
import {createModel,disposeModel} from './model';
import {exportHaProject,parseHaProject} from './haPackage';
describe('墙面光泽',()=>{
  it('旧数据使用哑光，同色墙体可独立设置光泽并随 HA 数据保留',()=>{const p=createProject();p.walls[1].finish='satin';p.walls[2].finish='gloss';const model=createModel(p);for(const [id,roughness] of [['wall-0-0',1],['wall-1-0',.6],['wall-2-0',.2]] as [string,number][])expect(((model.getObjectByName(id) as THREE.Mesh).material as THREE.MeshStandardMaterial).roughness).toBe(roughness);disposeModel(model);expect(parseHaProject(JSON.parse(exportHaProject(p))).walls[2].finish).toBe('gloss')});
  it('拒绝未知表面类型',()=>{const p=createProject();(p.walls[0] as unknown as {finish:string}).finish='unknown';expect(()=>parseProject(p)).toThrow()});
});
