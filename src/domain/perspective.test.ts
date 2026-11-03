import {describe,it,expect} from 'vitest';
import {squareToQuad,validQuad,perspectiveSize,type Quad} from './perspective';
describe('四点透视校正',()=>{
  it('将目标矩形四角映射到指定的梯形四角',()=>{const quad:Quad=[{x:.1,y:.1},{x:.9,y:.2},{x:.8,y:.9},{x:.2,y:.8}];const map=squareToQuad(quad);[[0,0],[1,0],[1,1],[0,1]].forEach(([u,v],index)=>{expect(map(u,v).x).toBeCloseTo(quad[index].x,8);expect(map(u,v).y).toBeCloseTo(quad[index].y,8)})});
  it('拒绝自交、反向及退化四边形并限制输出尺寸',()=>{expect(validQuad([{x:0,y:0},{x:1,y:1},{x:1,y:0},{x:0,y:1}])).toBe(false);expect(validQuad([{x:0,y:0},{x:0,y:1},{x:1,y:1},{x:1,y:0}])).toBe(false);expect(()=>squareToQuad([{x:0,y:0},{x:0,y:0},{x:1,y:1},{x:0,y:1}])).toThrow();const size=perspectiveSize(4000,3000,[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}]);expect(Math.max(size.width,size.height)).toBeLessThanOrEqual(1600)});
});
