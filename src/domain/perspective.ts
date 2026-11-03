export type Corner={x:number;y:number};
export type Quad=[Corner,Corner,Corner,Corner];

/** 校验顺时针排列的四个角，拒绝越界、自交和退化四边形。 */
export function validQuad(points:Quad):boolean {
  if(points.length!==4||!points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1))return false;
  let sign=0,area=0;for(let i=0;i<4;i++){const a=points[i],b=points[(i+1)%4],c=points[(i+2)%4],cross=(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);if(Math.abs(cross)<1e-6)return false;if(!sign)sign=Math.sign(cross);if(Math.sign(cross)!==sign)return false;area+=a.x*b.y-b.x*a.y}return sign>0&&area>.0002;
}

/** 计算单位正方形到四边形的投影变换。 */
export function squareToQuad(points:Quad):(u:number,v:number)=>Corner {
  if(!validQuad(points))throw new Error('Invalid perspective corners');const [p0,p1,p2,p3]=points;
  const dx1=p1.x-p2.x,dx2=p3.x-p2.x,dx3=p0.x-p1.x+p2.x-p3.x,dy1=p1.y-p2.y,dy2=p3.y-p2.y,dy3=p0.y-p1.y+p2.y-p3.y;
  let g=0,h=0;if(Math.abs(dx3)>1e-12||Math.abs(dy3)>1e-12){const determinant=dx1*dy2-dx2*dy1;if(Math.abs(determinant)<1e-12)throw new Error('Degenerate perspective transform');g=(dx3*dy2-dx2*dy3)/determinant;h=(dx1*dy3-dx3*dy1)/determinant}
  const a=p1.x-p0.x+g*p1.x,b=p3.x-p0.x+h*p3.x,c=p0.x,d=p1.y-p0.y+g*p1.y,e=p3.y-p0.y+h*p3.y,f=p0.y;
  return (u,v)=>{const k=g*u+h*v+1;return{x:(a*u+b*v+c)/k,y:(d*u+e*v+f)/k}};
}

/** 按四边形边长估算输出尺寸，并限制长边以控制浏览器内存。 */
export function perspectiveSize(width:number,height:number,quad:Quad){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2||width*height>24000000||!validQuad(quad))throw new Error('Unsupported perspective image');
  const length=(a:Corner,b:Corner)=>Math.hypot((a.x-b.x)*(width-1),(a.y-b.y)*(height-1));const w=(length(quad[0],quad[1])+length(quad[3],quad[2]))/2,h=(length(quad[0],quad[3])+length(quad[1],quad[2]))/2,scale=Math.min(1,1599/Math.max(w,h));return{width:Math.max(2,Math.round(w*scale)+1),height:Math.max(2,Math.round(h*scale)+1)};
}

/** 在本地进行透视重采样，分批让出主线程并支持取消。 */
export async function rectifyPerspective(image:HTMLImageElement,source:string,quad:Quad,signal:AbortSignal):Promise<string> {
  const width=image.naturalWidth,height=image.naturalHeight,size=perspectiveSize(width,height,quad),map=squareToQuad(quad),input=document.createElement('canvas'),output=document.createElement('canvas');input.width=width;input.height=height;output.width=size.width;output.height=size.height;
  const srcContext=input.getContext('2d',{willReadFrequently:true}),dstContext=output.getContext('2d');if(!srcContext||!dstContext)throw new Error('Canvas is unavailable');srcContext.drawImage(image,0,0);const src=srcContext.getImageData(0,0,width,height).data,dst=dstContext.createImageData(size.width,size.height),pixels=dst.data;
  for(let y=0;y<size.height;y++){if(signal.aborted)throw new DOMException('Operation aborted','AbortError');const v=y/(size.height-1);for(let x=0;x<size.width;x++){const p=map(x/(size.width-1),v),sx=Math.max(0,Math.min(width-1,p.x*(width-1))),sy=Math.max(0,Math.min(height-1,p.y*(height-1))),x0=Math.floor(sx),y0=Math.floor(sy),x1=Math.min(width-1,x0+1),y1=Math.min(height-1,y0+1),fx=sx-x0,fy=sy-y0,outputOffset=(y*size.width+x)*4;
    for(let c=0;c<4;c++){const a=src[(y0*width+x0)*4+c]*(1-fx)+src[(y0*width+x1)*4+c]*fx,b=src[(y1*width+x0)*4+c]*(1-fx)+src[(y1*width+x1)*4+c]*fx;pixels[outputOffset+c]=Math.round(a*(1-fy)+b*fy)}}
    if(y%32===31)await new Promise<void>(resolve=>setTimeout(resolve,0));
  }
  if(signal.aborted)throw new DOMException('Operation aborted','AbortError');dstContext.putImageData(dst,0,0);const mime=source.startsWith('data:image/jpeg;')?'image/jpeg':'image/png',result=output.toDataURL(mime,.92);if(result.length>7000000)throw new Error('Corrected image is too large');return result;
}
