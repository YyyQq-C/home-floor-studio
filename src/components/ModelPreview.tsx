import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {markerHeight,projectScale,type Project} from '../domain/project';
import {markerGlyph} from '../domain/markerIcons';
import { createModel, disposeModel } from '../domain/model';
import {frameCamera} from '../domain/cameraFrame';

/** 根据户型墙体生成可交互的三维预览，并在卸载时释放渲染资源。 */
export default function ModelPreview({ project }: { project: Project }) {
  const host=useRef<HTMLDivElement>(null);
  const markerNodes=useRef(new Map<string,HTMLDivElement>());
  const [error,setError]=useState(false);
  const resetView=useRef<()=>void>(()=>{});
  useEffect(()=>{
    const node=host.current; if(!node) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer=new THREE.WebGLRenderer({antialias:true,alpha:true}); } catch(e) { console.error('Failed to initialize 3D renderer',e); setError(true); return; }
    setError(false); renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5)); node.appendChild(renderer.domElement);
    const scene=new THREE.Scene(); scene.background=new THREE.Color('#f2f5f2');
    const camera=new THREE.PerspectiveCamera(40,1,1,100000);
    const controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=true;
    scene.add(new THREE.HemisphereLight(0xffffff,0x8c9b8b,2)); const sun=new THREE.DirectionalLight(0xffffff,2); sun.position.set(300,700,400); scene.add(sun);
    const model=createModel(project); scene.add(model);
    const scale=projectScale(project);
    const markerPoints=project.markers.map(marker=>({id:marker.id,position:new THREE.Vector3(marker.position.x*scale,markerHeight(marker,project),marker.position.y*scale)}));
    /** 重新按当前窗口比例框选整个户型。 */
    const reframe=()=>{const width=node.clientWidth,height=node.clientHeight;if(!width||!height)return;controls.reset();controls.enableDamping=false;controls.update();controls.enableDamping=true;controls.target.copy(frameCamera(camera,model,width/height,markerPoints.map(marker=>marker.position)));controls.update();controls.saveState();};resetView.current=reframe;
    let framed=false;const resize=()=>{ const width=node.clientWidth,height=node.clientHeight; if(!width||!height)return; renderer.setSize(width,height);if(!framed){reframe();framed=true}else{camera.aspect=width/height;camera.updateProjectionMatrix()} }; const observer=new ResizeObserver(resize); observer.observe(node); resize();
    const projected=new THREE.Vector3();
    let frame=0; const render=()=>{ controls.update(); renderer.render(scene,camera);
      // 将设备空间坐标投影到预览画面，标记本身不包含在 GLB 模型中。
      for(const marker of markerPoints){const element=markerNodes.current.get(marker.id);if(!element)continue;const point=projected.copy(marker.position).project(camera);element.style.left=`${(point.x+1)*50}%`;element.style.top=`${(1-point.y)*50}%`;element.hidden=point.z< -1||point.z>1||Math.abs(point.x)>1||Math.abs(point.y)>1;}
      frame=requestAnimationFrame(render); }; render();
    return ()=>{ resetView.current=()=>{}; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); disposeModel(model); renderer.dispose(); renderer.domElement.remove(); };
  },[project.walls,project.openings,project.furniture,project.rooms,project.cmPerUnit,project.markers]);
  return <div className="model-preview" ref={host} aria-label="三维户型预览">{error?<p>无法初始化 3D 预览，请检查浏览器的 WebGL 支持。</p>:<><button className="reset-3d" onClick={()=>resetView.current()}>复位 3D 视角</button>{project.markers.map(marker=><div key={marker.id} className="preview-marker" aria-label={`3D 设备 ${marker.name}`} ref={node=>{if(node)markerNodes.current.set(marker.id,node);else markerNodes.current.delete(marker.id)}}><span>{markerGlyph(marker.icon)}</span><small>{marker.name}</small></div>)}</>}</div>;
}
