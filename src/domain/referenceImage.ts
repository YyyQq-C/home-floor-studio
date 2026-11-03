/** 读取并解码参考图片，确保它能被当前编辑与图像处理流程使用。 */
export async function readReferenceImage(file:File):Promise<string> {
  if(!['image/png','image/jpeg'].includes(file.type)||file.size===0||file.size>5*1024*1024)throw new Error('Unsupported image file');
  const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>typeof reader.result==='string'?resolve(reader.result):reject(new Error('Invalid image data'));reader.onerror=()=>reject(reader.error||new Error('Image read failed'));reader.onabort=()=>reject(new Error('Image read aborted'));reader.readAsDataURL(file)});
  if(data.length>7000000)throw new Error('Image data is too large');
  await new Promise<void>((resolve,reject)=>{const image=new Image();image.onload=()=>{if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>24000000)reject(new Error('Unsupported image dimensions'));else resolve()};image.onerror=()=>reject(new Error('Image decode failed'));image.src=data});
  return data;
}
