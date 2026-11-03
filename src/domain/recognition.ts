import {validRoomPolygon,type Point,type Wall,type Room,type Opening} from './project';

const MAX_RECOGNITION_RESPONSE_BYTES=2*1024*1024;

/** 限制识别服务响应的读取字节数，避免异常大的响应占满浏览器内存。 */
async function readRecognitionResponse(response:Response):Promise<string> {
  const declaredLength=response.headers.get('Content-Length');
  if(declaredLength!==null&&Number(declaredLength)>MAX_RECOGNITION_RESPONSE_BYTES){await response.body?.cancel();throw new Error('Recognition response exceeds size limit');}
  if(!response.body)throw new Error('Recognition response body is empty');
  const reader=response.body.getReader(),decoder=new TextDecoder();let size=0,text='';
  try {
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
      if(size>MAX_RECOGNITION_RESPONSE_BYTES){await reader.cancel();throw new Error('Recognition response exceeds size limit');}
      text+=decoder.decode(value,{stream:true});
    }
    text+=decoder.decode();
  } finally {reader.releaseLock();}
  return text;
}

export type Candidate={walls:Wall[];rooms:Room[];openings:Opening[];ignoredWalls:number;ignoredRooms:number;ignoredOpenings:number};
type NormalPoint={x:number;y:number};
/** 将模型的归一化坐标映射到与 SVG 底图相同的等比显示区域。 */
export function imagePointToCanvas(point:NormalPoint,width:number,height:number):Point {
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error('Invalid image size');
  const scale=Math.min(800/width,600/height),displayWidth=width*scale,displayHeight=height*scale;
  return {x:(800-displayWidth)/2+point.x/1000*displayWidth,y:(600-displayHeight)/2+point.y/1000*displayHeight};
}
/** 验证服务返回的坐标并转换成可编辑的候选墙体和房间。 */
export function parseRecognition(value:unknown,width:number,height:number,id:()=>string=()=>crypto.randomUUID(),cmPerUnit=1):Candidate {
  if(!value||typeof value!=='object')throw new Error('Invalid recognition result');
  const obj=value as {walls?:unknown;rooms?:unknown;openings?:unknown};if(!Array.isArray(obj.walls)||!Array.isArray(obj.rooms)||obj.walls.length>500||obj.rooms.length>100)throw new Error('Invalid recognition collections');
  const point=(v:unknown):Point=>{if(!v||typeof v!=='object')throw new Error('Invalid recognition point');const p=v as NormalPoint;if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1000||p.y<0||p.y>1000)throw new Error('Recognition point out of bounds');return imagePointToCanvas(p,width,height)};
  // 保留原始下标映射，避免过滤无效墙体后门窗绑定到另一面墙。
  const walls:Wall[]=[],wallByIndex=new Map<number,Wall>();let ignoredWalls=0,ignoredRooms=0;
  obj.walls.forEach((raw:unknown,index:number)=>{try{if(!raw||typeof raw!=='object')throw new Error('Invalid wall');const w=raw as {start:unknown;end:unknown};const start=point(w.start),end=point(w.end);if(Math.hypot(start.x-end.x,start.y-end.y)<1)throw new Error('Invalid wall length');const wall={id:id(),start,end,thickness:12,height:280};walls.push(wall);wallByIndex.set(index,wall)}catch(error){console.warn('Ignored invalid recognition wall',error instanceof Error?error.message:'UnknownError');ignoredWalls++}});
  const rooms:Room[]=[];obj.rooms.forEach((raw:unknown)=>{try{if(!raw||typeof raw!=='object')throw new Error('Invalid room');const r=raw as {name:unknown;points:unknown};if(typeof r.name!=='string'||r.name.length>100||!Array.isArray(r.points)||r.points.length>201)throw new Error('Invalid room data');const points=r.points.map(point);if(points.length>1&&points[0].x===points[points.length-1].x&&points[0].y===points[points.length-1].y)points.pop();if(!validRoomPolygon(points))throw new Error('Invalid room polygon');rooms.push({id:id(),name:r.name||'未命名房间',points,color:'#e8dfcf'})}catch(error){console.warn('Ignored invalid recognition room',error instanceof Error?error.message:'UnknownError');ignoredRooms++}});
  if(!walls.length&&!rooms.length)throw new RecognitionError('empty');
  if(obj.openings!==undefined&&(!Array.isArray(obj.openings)||obj.openings.length>500))throw new Error('Invalid opening collection');
  const openings:Opening[]=[];let ignoredOpenings=0;
  for(const raw of (obj.openings||[]) as unknown[]) {try {
    if(!raw||typeof raw!=='object')throw new Error('Invalid opening');const o=raw as {wallIndex:unknown;kind:unknown;start:unknown;end:unknown};
    if(typeof o.wallIndex!=='number'||!Number.isInteger(o.wallIndex)||(o.kind!=='door'&&o.kind!=='window'))throw new Error('Invalid opening reference');
    const wall=wallByIndex.get(o.wallIndex);if(!wall)throw new Error('Invalid opening reference');const a=point(o.start),b=point(o.end),dx=wall.end.x-wall.start.x,dy=wall.end.y-wall.start.y,length=Math.hypot(dx,dy);
    const project=(p:Point)=>({t:((p.x-wall.start.x)*dx+(p.y-wall.start.y)*dy)/(length*length),distance:Math.abs((p.x-wall.start.x)*dy-(p.y-wall.start.y)*dx)/length});
    const pa=project(a),pb=project(b);if(pa.t<0||pa.t>1||pb.t<0||pb.t>1||pa.distance>20||pb.distance>20)throw new Error('Opening is outside wall');
    const width=Math.abs(pa.t-pb.t)*length*cmPerUnit;if(!Number.isFinite(width)||width<=1)throw new Error('Invalid opening width');
    openings.push({id:id(),wallId:wall.id,kind:o.kind,center:(pa.t+pb.t)/2,width,sill:o.kind==='door'?0:90,height:o.kind==='door'?210:120});
  }catch(error){console.warn('Ignored invalid recognition opening',error instanceof Error?error.message:'UnknownError');ignoredOpenings++}}
  return{walls,rooms,openings,ignoredWalls,ignoredRooms,ignoredOpenings};
}
export type RecognitionErrorCode='endpoint'|'model'|'auth'|'rate-limit'|'http'|'network'|'format'|'empty'|'timeout'|'cancelled';
/** 保存识别错误类别，避免展示服务商可能包含敏感信息的响应。 */
export class RecognitionError extends Error {
  constructor(public code:RecognitionErrorCode,public status?:number){super(`Recognition error: ${code}`);this.name='RecognitionError';}
}
/** 将识别错误转换成可操作的中文提示。 */
export function recognitionErrorMessage(error:unknown):string {
  if(!(error instanceof RecognitionError))return '识别结果无法处理，请检查图像和服务返回格式。';
  switch(error.code){case 'endpoint':return '服务地址无效：请使用 HTTPS，或使用本机 HTTP 地址。';case 'model':return '请填写视觉模型名称。';case 'auth':return '认证失败：请检查 API 密钥及模型访问权限。';case 'rate-limit':return '服务请求过于频繁或额度不足，请检查服务额度后重试。';case 'http':return `服务返回 HTTP ${error.status}，请检查地址、模型与服务状态。`;case 'network':return '无法连接服务：请检查网络、地址及服务是否允许浏览器跨域访问。';case 'format':return '服务响应格式不兼容：请确认接口返回 choices[0].message.content 中的 JSON。';case 'empty':return '未识别到有效墙体或房间，请更换清晰图片、调整识别服务或手动绘制。';case 'timeout':return '识别超时，请检查服务状态或重试。';case 'cancelled':return '识别已取消。';}
}
/** 限制密钥只发往用户输入的 HTTPS 服务或本机 HTTP 服务。 */
export function validateEndpoint(input:string):string {
  const url=new URL(input);if(url.username||url.password||url.hash || !(url.protocol==='https:' || (url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname))))throw new Error('Invalid recognition endpoint');return url.toString();
}
/** 调用用户指定的兼容视觉聊天接口，密钥不会写入项目文件。 */
export async function recognizeFloorplan(settings:{endpoint:string;model:string;key:string;image:string;signal:AbortSignal}):Promise<unknown> {
  let endpoint:string;try{endpoint=validateEndpoint(settings.endpoint)}catch{throw new RecognitionError('endpoint')}if(!settings.model.trim())throw new RecognitionError('model');
  let response:Response;try{response=await fetch(endpoint,{method:'POST',credentials:'omit',redirect:'error',signal:settings.signal,headers:{'Content-Type':'application/json',...(settings.key?{'Authorization':`Bearer ${settings.key}`}:{})},body:JSON.stringify({model:settings.model.trim(),messages:[{role:'user',content:[{type:'text',text:'Identify architectural wall centerlines, room polygons, and door and window openings in the floor plan image. Return JSON only: {"walls":[{"start":{"x":0,"y":0},"end":{"x":0,"y":0}}],"rooms":[{"name":"name","points":[{"x":0,"y":0}]}],"openings":[{"wallIndex":0,"kind":"door or window","start":{"x":0,"y":0},"end":{"x":0,"y":0}}]}. Coordinates are normalized to 0-1000 independently across original image width and height, top-left origin. wallIndex is the zero-based index in walls; opening endpoints must lie on that wall. kind must be exactly door or window. Do not guess dimensions. Rooms must be simple non-crossing polygons; list each vertex once without repeating the first vertex at the end. If uncertain omit the item.'},{type:'image_url',image_url:{url:settings.image}}]}],temperature:0})});}catch(error){if(settings.signal.aborted)throw error;throw new RecognitionError('network')}
  if(!response.ok)throw new RecognitionError(response.status===401||response.status===403?'auth':response.status===429?'rate-limit':'http',response.status);
  try{const payload=JSON.parse(await readRecognitionResponse(response)) as {choices?:{message?:{content?:unknown}}[]};const content=payload.choices?.[0]?.message?.content;if(typeof content!=='string'||content.length>1000000)throw new Error('Invalid recognition response');
    const trimmed=content.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');return JSON.parse(trimmed);
  }catch(error){if(settings.signal.aborted)throw error;throw new RecognitionError('format')}

}
