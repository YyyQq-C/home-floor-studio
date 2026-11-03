import {describe,it,expect} from 'vitest';
import {recordHistory,undoHistory,redoHistory} from './history';
describe('编辑历史',()=>{
  it('撤销重做并在新编辑后清除重做分支',()=>{let h={past:[] as number[],present:1,future:[] as number[]};h=recordHistory(h,2);h=recordHistory(h,3);h=undoHistory(h);expect(h.present).toBe(2);expect(redoHistory(h).present).toBe(3);h=recordHistory(h,4);expect(h.future).toEqual([])});
  it('限制历史数量并保持边界不变',()=>{let h={past:[] as number[],present:0,future:[] as number[]};for(let i=1;i<=55;i++)h=recordHistory(h,i);expect(h.past).toHaveLength(50);for(let i=0;i<50;i++)h=undoHistory(h);expect(h.present).toBe(5);expect(undoHistory(h)).toBe(h)});
});
