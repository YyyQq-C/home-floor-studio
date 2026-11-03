import type {Project} from './project';
export const MAX_PROJECT_FILE_BYTES=20*1024*1024;
/** 尽量压缩备份，返回实际 UTF-8 文件大小是否超过导入限制。 */
export function serializeProjectBackup(project:Project,limit=MAX_PROJECT_FILE_BYTES):{text:string;oversized:boolean} {
  const bytes=(text:string)=>new TextEncoder().encode(text).byteLength;
  let text=JSON.stringify(project,null,2);
  if(bytes(text)>limit)text=JSON.stringify(project);
  return {text,oversized:bytes(text)>limit};
}
