import * as THREE from 'three';
import { furnitureDefaultColor } from './furnitureGlyph';
import { wallSolids, wallSpans, doorSwingGeometry, projectScale, type Project } from '../domain/project';

/** 创建可随 GLB 一同导出的简化地面纹理；不可用时保留纯色。 */
export function createFloorTexture(style:'solid'|'wood'|'tile'|undefined):THREE.CanvasTexture|null {
  if(!style||style==='solid'||typeof document==='undefined')return null;
  try {
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas context unavailable');
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,128,128);ctx.strokeStyle=style==='wood'?'#d6cbbd':'#c6cbc6';ctx.lineWidth=2;
    if(style==='wood'){for(let y=0;y<=128;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(128,y);ctx.stroke();}for(let row=0;row<4;row++){ctx.beginPath();ctx.moveTo(row%2?96:32,row*32);ctx.lineTo(row%2?96:32,(row+1)*32);ctx.stroke();}}
    else {for(let n=0;n<=128;n+=64){ctx.beginPath();ctx.moveTo(0,n);ctx.lineTo(128,n);ctx.moveTo(n,0);ctx.lineTo(n,128);ctx.stroke();}}
    const texture=new THREE.CanvasTexture(canvas);texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(1/100,1/100);texture.colorSpace=THREE.SRGBColorSpace;return texture;
  }catch(error){console.error('Failed to create floor texture',error);return null;}
}

/** 将同一份户型数据转换为可导出的三维墙体和地面。 */
export function createModel(project: Project): THREE.Group {
  const group=new THREE.Group();
  const scale=projectScale(project);
  const wallMaterials=new Map<string,THREE.MeshStandardMaterial>();
  // 房间轮廓从二维坐标映射到水平地面，颜色与平面图一致。
  for(const room of project.rooms) {
    const shape=new THREE.Shape();room.points.forEach((point,index)=>{if(index===0)shape.moveTo(point.x*scale,-point.y*scale);else shape.lineTo(point.x*scale,-point.y*scale)});shape.closePath();
    const texture=createFloorTexture(room.floorStyle);const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshStandardMaterial({color:room.color,map:texture,side:THREE.DoubleSide}));mesh.rotation.x=-Math.PI/2;mesh.position.y=0.1;mesh.name=`room-${room.id}`;group.add(mesh);
  }
  for(const wall of project.walls) {
    const dx=wall.end.x-wall.start.x,dz=wall.end.y-wall.start.y,length=Math.hypot(dx,dz); if(!length)continue;
    const parts=wallSolids(wall,project.openings,scale);
    const color=wall.color||'#d7dbd4',finish=wall.finish||'matte',key=`${color}-${finish}`;
    const roughness=finish==='gloss'?.2:finish==='satin'?.6:1;
    if(parts.length&&!wallMaterials.has(key))wallMaterials.set(key,new THREE.MeshStandardMaterial({color,roughness}));
    for(const [index,part] of parts.entries()) {
      const mesh=new THREE.Mesh(new THREE.BoxGeometry((part.end-part.start)*scale,part.top-part.bottom,wall.thickness),wallMaterials.get(key)!);
      const along=(part.start+part.end)/2/length;
      mesh.position.set((wall.start.x+dx*along)*scale,(part.bottom+part.top)/2,(wall.start.y+dz*along)*scale);
      mesh.rotation.y=-Math.atan2(dz,dx); mesh.name=`${wall.id}-${index}`; group.add(mesh);
    }
    // 门窗采用简化面板，位置和范围与墙洞使用同一份数据。
    for(const opening of project.openings.filter(o=>o.wallId===wall.id)) {
      const part=wallSpans(wall,[opening],scale).parts[0];if(!part)continue;
      const along=(part.start+part.end)/2/length,glass=opening.kind==='window';
      const panelMaterial=new THREE.MeshStandardMaterial({color:glass?0x9bc2ca:0xc4a687,transparent:glass,opacity:glass?.48:1,depthWrite:!glass,roughness:glass?.2:.75,side:THREE.DoubleSide});
      const panel=new THREE.Mesh(new THREE.BoxGeometry((part.end-part.start)*scale,part.top-part.sill,glass?2:4),panelMaterial);
      const swing=doorSwingGeometry(wall,opening,scale);if(swing){panel.position.set((swing.hinge.x+swing.tip.x)*scale/2,(part.sill+part.top)/2,(swing.hinge.y+swing.tip.y)*scale/2);panel.rotation.y=-Math.atan2(swing.tip.y-swing.hinge.y,swing.tip.x-swing.hinge.x)}else{panel.position.set((wall.start.x+dx*along)*scale,(part.sill+part.top)/2,(wall.start.y+dz*along)*scale);panel.rotation.y=-Math.atan2(dz,dx)}panel.name=`opening-${opening.id}`;group.add(panel);
    }
  }
  // 按家具自身坐标系创建基础几何，随后整体旋转及定位。
  for(const item of project.furniture) {
    const furniture=new THREE.Group(); furniture.name=item.id;
    const color=item.color||furnitureDefaultColor(item.kind);
    const mat=new THREE.MeshStandardMaterial({color});
    const addBox=(width:number,height:number,depth:number,x:number,y:number,z:number)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),mat);mesh.position.set(x,y,z);furniture.add(mesh)};
    if(item.kind==='table') { const top=Math.min(8,item.height*.2);addBox(item.width,top,item.depth,0,item.height-top/2,0);for(const x of [-1,1]) for(const z of [-1,1]) addBox(6,item.height-top,6,x*(item.width/2-6),(item.height-top)/2,z*(item.depth/2-6)); }
    else if(item.kind==='tv-cabinet') {const base=item.height*.12;addBox(item.width,item.height-base,item.depth,0,(item.height+base)/2,0);addBox(item.width*.9,base,item.depth*.8,0,base/2,0);}
    else if(item.kind==='kitchen-counter') {const top=item.height*.08;addBox(item.width,item.height-top,item.depth,0,(item.height-top)/2,0);addBox(item.width,top,item.depth,0,item.height-top/2,0);}
    else if(item.kind==='chair') {const seat=item.height*.52;addBox(item.width,item.height*.1,item.depth,0,seat,0);addBox(item.width,item.height*.43,item.depth*.12,0,item.height*.78,-item.depth*.44);for(const x of [-1,1])for(const z of [-1,1])addBox(Math.min(5,item.width*.15),seat,Math.min(5,item.depth*.15),x*item.width*.4,seat/2,z*item.depth*.4);}
    else if(item.kind==='toilet') {addBox(item.width*.8,item.height*.52,item.depth*.65,0,item.height*.26,item.depth*.12);addBox(item.width,item.height*.9,item.depth*.25,0,item.height*.45,-item.depth*.375);}
    else if(item.kind==='sink') {addBox(item.width,item.height*.85,item.depth,0,item.height*.425,0);addBox(item.width,item.height*.15,item.depth,0,item.height*.925,0);}
    else if(item.kind==='shower') {const post=Math.min(3,item.width*.1,item.depth*.1);addBox(item.width,post,item.depth,0,post/2,0);for(const x of [-1,1])for(const z of [-1,1])addBox(post,item.height,post,x*(item.width-post)/2,item.height/2,z*(item.depth-post)/2);}
    else { addBox(item.width,item.height*(item.kind==='sofa'?.55:1),item.depth,0,item.height*(item.kind==='sofa'?.275:.5),0); if(item.kind==='sofa')addBox(item.width,item.height*.45,item.depth*.18,0,item.height*.775,-item.depth*.41); }
    furniture.position.set(item.position.x*scale,0,item.position.y*scale);furniture.rotation.y=-item.rotation*Math.PI/180;group.add(furniture);
  }
  return group;
}

/** 释放户型模型所占用的几何和材质资源。 */
export function disposeModel(group: THREE.Group) {
  const materials=new Set<THREE.Material>(); group.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();const list=Array.isArray(object.material)?object.material:[object.material];list.forEach(material=>materials.add(material));}}); materials.forEach(material=>{if(material instanceof THREE.MeshStandardMaterial)material.map?.dispose();material.dispose()});
}

/** 将户型模型导出为二进制 GLB。 */
export async function exportGlb(project: Project): Promise<ArrayBuffer> {
  const model=createModel(project);
  // 内部使用厘米，glTF 使用米；仅在导出时转换比例。
  model.scale.setScalar(0.01);
  try { const {GLTFExporter}=await import('three/examples/jsm/exporters/GLTFExporter.js'); const result=await new GLTFExporter().parseAsync(model,{binary:true}); if(!(result instanceof ArrayBuffer)) throw new Error('Unexpected GLB export result'); return result; }
  finally { disposeModel(model); }
}
