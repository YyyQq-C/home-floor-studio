import {describe,it,expect} from 'vitest';
import {createProject,furnitureDefaults,parseProject} from './project';
import {createModel,disposeModel} from './model';
import {exportSvg} from './exportSvg';
describe('家具数据与导出',()=>{
  it('兼容没有家具字段的旧项目',()=>{const p=JSON.parse(JSON.stringify(createProject()));delete p.furniture;expect(parseProject(p).furniture).toEqual([])});
  it('家具同时进入 2D 和 3D，并保留位置和旋转',()=>{const p=createProject();p.furniture.push({id:'bed-1',kind:'bed',position:{x:250,y:300},rotation:90,...furnitureDefaults('bed')});expect(exportSvg(p)).toContain('translate(250 300) rotate(90)');const model=createModel(p);const f=model.getObjectByName('bed-1');expect(f?.position.x).toBe(250);expect(f?.position.z).toBe(300);expect(f?.rotation.y).toBeCloseTo(-Math.PI/2);disposeModel(model)});
  it('拒绝无效尺寸',()=>{const p=createProject();p.furniture.push({id:'a',kind:'table',position:{x:0,y:0},rotation:0,width:-1,depth:50,height:80});expect(()=>parseProject(p)).toThrow()});
});
