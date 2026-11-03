import {describe,it,expect} from 'vitest';
import {readHaProjectResponse} from './haResponse';
import {createEmptyProject} from './project';
import {exportHaProject} from './haPackage';

describe('HA 户型响应限制',()=>{
  it('按实际字节数读取分块 UTF-8 并校验户型',async()=>{
    const project=createEmptyProject();project.name='中文户型';const data=new TextEncoder().encode(exportHaProject(project));let offset=0;
    const body=new ReadableStream({pull(controller){if(offset===data.length){controller.close();return}controller.enqueue(data.slice(offset,++offset));}});
    expect(await readHaProjectResponse(new Response(body),data.length)).toEqual(project);
  });
  it('响应头超过限制时取消读取',async()=>{
    let cancelled=false;const body=new ReadableStream({cancel(){cancelled=true}});
    await expect(readHaProjectResponse(new Response(body,{headers:{'Content-Length':'101'}}),100)).rejects.toThrow('size limit');expect(cancelled).toBe(true);
  });
  it('没有长度或长度不可信时仍按流内容拒绝超限',async()=>{
    for(const headers of [new Headers(),new Headers({'Content-Length':'1'})]){let cancelled=false;const body=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(101))},cancel(){cancelled=true}});
      await expect(readHaProjectResponse(new Response(body,{headers}),100)).rejects.toThrow('size limit');expect(cancelled).toBe(true);
    }
  });
  it('拒绝 HTTP 错误和不兼容的包',async()=>{
    await expect(readHaProjectResponse(new Response('{}',{status:404}))).rejects.toThrow('404');
    await expect(readHaProjectResponse(new Response('{}'))).rejects.toThrow('Unsupported floor package');
  });
});
