import {describe,it,expect} from 'vitest';
import {createProject,furnitureDefaults,parseProject} from './project';
import {FURNITURE_LABELS,furnitureGlyph} from './furnitureGlyph';
import {createModel,disposeModel} from './model';
import {exportSvg} from './exportSvg';
describe('家具素材',()=>{
  it('每种素材均有符号、合法尺寸和三维对象',()=>{const p=createProject();for(const kind of Object.keys(FURNITURE_LABELS) as (keyof typeof FURNITURE_LABELS)[]){expect(furnitureGlyph(kind).length).toBeGreaterThan(1);p.furniture.push({id:kind,kind,position:{x:100,y:100},rotation:0,...furnitureDefaults(kind)})}expect(parseProject(p).furniture).toHaveLength(Object.keys(FURNITURE_LABELS).length);const model=createModel(p);for(const f of p.furniture)expect(model.getObjectByName(f.id)?.children.length).toBeGreaterThan(0);expect(exportSvg(p)).toContain('<ellipse');disposeModel(model)});
});
