import {parseHaProject} from './haPackage';

export const MAX_HA_PROJECT_BYTES=20*1024*1024;

/** 流式限制户型响应大小后再解析，兼容没有 Content-Length 的传输。 */
export async function readHaProjectResponse(response:Response,limit=MAX_HA_PROJECT_BYTES){
  if(!response.ok)throw new Error(`Project request failed: ${response.status}`);
  if(Number(response.headers.get('Content-Length'))>limit){await response.body?.cancel();throw new Error('Floor package exceeds size limit');}
  if(!response.body)throw new Error('Floor package body is empty');
  const reader=response.body.getReader(),decoder=new TextDecoder();let size=0,text='';
  try{
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
      if(size>limit){await reader.cancel();throw new Error('Floor package exceeds size limit');}
      text+=decoder.decode(value,{stream:true});
    }
    text+=decoder.decode();
  }finally{reader.releaseLock();}
  return parseHaProject(JSON.parse(text));
}
