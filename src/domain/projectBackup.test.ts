import {describe,expect,it} from 'vitest';
import {createEmptyProject} from './project';
import {serializeProjectBackup} from './projectBackup';
describe('项目备份大小',()=>{
  it('格式化结果过大时压缩，但内容保持可恢复',()=>{const p={...createEmptyProject(),name:'户型'};const compact=JSON.stringify(p),bytes=new TextEncoder().encode(compact).byteLength,result=serializeProjectBackup(p,bytes);expect(result.oversized).toBe(false);expect(result.text).toBe(compact);expect(JSON.parse(result.text)).toEqual(p)});
  it('按 UTF-8 字节数报告过大备份，仍保留完整内容',()=>{const p={...createEmptyProject(),name:'中文名称'};const result=serializeProjectBackup(p,10);expect(result.oversized).toBe(true);expect(JSON.parse(result.text)).toEqual(p)});
});
