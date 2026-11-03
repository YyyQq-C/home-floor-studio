import {describe,it,expect} from 'vitest';
import {cropRect} from './imageAdjust';
describe('底图旋转裁剪',()=>{
  it('先旋转再按百分比计算裁剪像素',()=>{expect(cropRect(400,200,90,{x:0,y:25,width:50,height:50})).toEqual({rotatedWidth:200,rotatedHeight:400,left:0,top:100,width:100,height:200})});
  it('拒绝越界、空区域和过大图像',()=>{expect(()=>cropRect(100,100,0,{x:90,y:0,width:20,height:50})).toThrow();expect(()=>cropRect(100,100,0,{x:0,y:0,width:0,height:50})).toThrow();expect(()=>cropRect(6000,5000,0,{x:0,y:0,width:100,height:100})).toThrow()});
});
