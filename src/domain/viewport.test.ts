import {describe,it,expect} from 'vitest';
import {DEFAULT_VIEW,fitView,zoomView} from './viewport';
describe('画布视图',()=>{
  it('围绕中心缩放并限制范围',()=>{const zoomed=zoomView(DEFAULT_VIEW,.5);expect(zoomed).toEqual({x:200,y:150,width:400,height:300});expect(zoomView(zoomed,.00001).width).toBe(200);expect(zoomView(DEFAULT_VIEW,1e10).width).toBe(10000000)});
  it('忽略无效缩放比例',()=>{expect(zoomView(DEFAULT_VIEW,NaN)).toBe(DEFAULT_VIEW)});
  it('完整显示超出默认画布的内容并允许从大视图继续放大',()=>{const bounds={x:-2000,y:-100,width:4000,height:1200},view=fitView(bounds);expect(view.x).toBeLessThan(bounds.x);expect(view.x+view.width).toBeGreaterThan(bounds.x+bounds.width);expect(view.y).toBeLessThan(bounds.y);expect(view.y+view.height).toBeGreaterThan(bounds.y+bounds.height);expect(zoomView(view,.8).width).toBeCloseTo(view.width*.8);expect(fitView({...bounds,width:NaN})).toEqual(DEFAULT_VIEW)});
});
