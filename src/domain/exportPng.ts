import {exportBounds,exportSvg} from './exportSvg';
import type {Project} from './project';

/** 将不含参考底图的 SVG 按原比例渲染为指定最长边的 PNG。 */
export async function exportPng(project:Project,transparent=false,longEdge=1600,compact=false):Promise<Blob> {
  if(![1600,2400,3200].includes(longEdge))throw new Error('Invalid PNG resolution');
  const bounds=exportBounds(project,compact);const source=new Blob([exportSvg(project,bounds,transparent)],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(source);
  try {const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const item=new Image();item.onload=()=>resolve(item);item.onerror=()=>reject(new Error('Failed to render SVG'));item.src=url});
    const factor=longEdge/Math.max(bounds.width,bounds.height);const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bounds.width*factor));canvas.height=Math.max(1,Math.round(bounds.height*factor));const context=canvas.getContext('2d');if(!context)throw new Error('Canvas is unavailable');context.drawImage(image,0,0,canvas.width,canvas.height);
    return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG encoding failed')),'image/png'));
  }finally{URL.revokeObjectURL(url)}
}
