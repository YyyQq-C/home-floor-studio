import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {createModel,disposeModel} from '../domain/model';
import {projectScale, markerHeight, type Project} from '../domain/project';
import {frameCamera} from '../domain/cameraFrame';

/** 创建可旋转的 HA 户型场景并持续投影设备标记。 */
export function mountThreeView(stage:HTMLElement,project:Project,buttons:Map<string,HTMLButtonElement>,resetButton:HTMLButtonElement):()=>void {
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.domElement.className='floor-canvas';stage.prepend(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#f2f5f2');const scale=projectScale(project);const camera=new THREE.PerspectiveCamera(40,1,1,100000);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
  scene.add(new THREE.HemisphereLight(0xffffff,0x8c9b8b,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(300,700,400);scene.add(light);const model=createModel(project);scene.add(model);
  // 户型数据不在场景运行时改变，预先计算设备空间坐标并复用投影向量。
  const markerPoints=project.markers.map(marker=>({id:marker.id,position:new THREE.Vector3(marker.position.x*scale,markerHeight(marker,project),marker.position.y*scale)}));
  const projected=new THREE.Vector3();
  /** 更新相机比例和渲染缓冲区。 */
  const reframe=()=>{const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;controls.reset();controls.enableDamping=false;controls.update();controls.enableDamping=true;controls.target.copy(frameCamera(camera,model,w/h,markerPoints.map(marker=>marker.position)));controls.update();controls.saveState();};resetButton.addEventListener('click',reframe);
  let framed=false;const resize=()=>{const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h);if(!framed){reframe();framed=true}else{camera.aspect=w/h;camera.updateProjectionMatrix()}};const observer=new ResizeObserver(resize);observer.observe(stage);resize();
  /** 将设备世界坐标转换为屏幕坐标。 */
  const positionMarker=(marker:typeof markerPoints[number])=>{const button=buttons.get(marker.id);if(!button)return;const v=projected.copy(marker.position).project(camera);button.style.left=`${(v.x+1)*50}%`;button.style.top=`${(1-v.y)*50}%`;button.hidden=v.z< -1||v.z>1||Math.abs(v.x)>1||Math.abs(v.y)>1;};
  let frame=0;const render=()=>{controls.update();renderer.render(scene,camera);markerPoints.forEach(positionMarker);frame=requestAnimationFrame(render)};render();
  /** 清理动画、监听器和 WebGL 资源。 */
  return ()=>{resetButton.removeEventListener('click',reframe);cancelAnimationFrame(frame);observer.disconnect();controls.dispose();disposeModel(model);renderer.dispose();renderer.domElement.remove()};
}
