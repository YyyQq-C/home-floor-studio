export type Crop={x:number;y:number;width:number;height:number};
export type Rotation=0|90|180|270;
/** 根据旋转后的尺寸计算裁剪像素矩形，并拒绝越界或空区域。 */
export function cropRect(width:number,height:number,rotation:Rotation,crop:Crop){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0||width*height>24000000)throw new Error('Unsupported image dimensions');
  const w=rotation%180===0?width:height,h=rotation%180===0?height:width;
  if(![crop.x,crop.y,crop.width,crop.height].every(Number.isFinite)||crop.x<0||crop.y<0||crop.width<=0||crop.height<=0||crop.x+crop.width>100||crop.y+crop.height>100)throw new Error('Invalid crop area');
  const left=Math.round(w*crop.x/100),top=Math.round(h*crop.y/100),right=Math.round(w*(crop.x+crop.width)/100),bottom=Math.round(h*(crop.y+crop.height)/100);
  if(right<=left||bottom<=top)throw new Error('Crop area is too small');return {rotatedWidth:w,rotatedHeight:h,left,top,width:right-left,height:bottom-top};
}
/** 将原图按中心顺时针旋转并绘制到目标画布。 */
export function drawRotated(ctx:CanvasRenderingContext2D,image:HTMLImageElement,rotation:Rotation,width:number,height:number){ctx.save();ctx.translate(width/2,height/2);ctx.rotate(rotation*Math.PI/180);const ratio=Math.min(width/(rotation%180?image.naturalHeight:image.naturalWidth),height/(rotation%180?image.naturalWidth:image.naturalHeight));ctx.drawImage(image,-image.naturalWidth*ratio/2,-image.naturalHeight*ratio/2,image.naturalWidth*ratio,image.naturalHeight*ratio);ctx.restore()}
/** 在浏览器内旋转和裁剪图片，保持原图格式和透明度。 */
export function transformImage(image:HTMLImageElement,source:string,rotation:Rotation,crop:Crop):string {
  const r=cropRect(image.naturalWidth,image.naturalHeight,rotation,crop);const canvas=document.createElement('canvas');canvas.width=r.width;canvas.height=r.height;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas is unavailable');ctx.translate(-r.left,-r.top);drawRotated(ctx,image,rotation,r.rotatedWidth,r.rotatedHeight);
  const mime=source.startsWith('data:image/jpeg;')?'image/jpeg':'image/png';const output=canvas.toDataURL(mime,.92);if(output.length>7000000)throw new Error('Adjusted image is too large');return output;
}
