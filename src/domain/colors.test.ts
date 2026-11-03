import {describe,expect,it} from 'vitest';
import * as THREE from 'three';
import {createDemoProject,parseProject} from './project';
import {exportSvg} from './exportSvg';
import {createModel,disposeModel} from './model';
import {exportHaProject,parseHaProject} from './haPackage';

describe('墙面与家具颜色',()=>{
  it('兼容旧项目，并拒绝不合法的颜色',()=>{const p=createDemoProject();expect(parseProject(structuredClone(p)).walls[0].color).toBeUndefined();p.walls[0].color='red';expect(()=>parseProject(structuredClone(p))).toThrow();p.walls[0].color='#aabbcc';p.furniture[0].color='#123';expect(()=>parseProject(structuredClone(p))).toThrow()});
  it('在项目、2D、3D 和 HA 户型中保留选择的颜色',()=>{const p=createDemoProject();p.walls[0].color='#3377aa';p.furniture[0].color='#bb6644';const imported=parseProject(JSON.parse(JSON.stringify(p)));const svg=exportSvg(imported);expect(svg).toContain('stroke="#3377aa"');expect(svg).toContain('fill="#bb6644"');const model=createModel(imported);const wall=model.getObjectByName('wall-0-0') as THREE.Mesh;const sofa=model.getObjectByName('demo-sofa')!;const furniture=sofa.children[0] as THREE.Mesh;expect((wall.material as THREE.MeshStandardMaterial).color.getHexString()).toBe('3377aa');expect((furniture.material as THREE.MeshStandardMaterial).color.getHexString()).toBe('bb6644');disposeModel(model);const ha=parseHaProject(JSON.parse(exportHaProject(imported)));expect(ha.walls[0].color).toBe('#3377aa');expect(ha.furniture[0].color).toBe('#bb6644')});
});
