import * as THREE from 'three';

/** 根据模型包围盒和设备位置设置初始相机，保证窄屏下也能看到完整内容。 */
export function frameCamera(camera:THREE.PerspectiveCamera,model:THREE.Object3D,aspect:number,points:THREE.Vector3[]=[]):THREE.Vector3 {
  const box=new THREE.Box3().setFromObject(model);
  for(const point of points)box.expandByPoint(point);
  // 空户型使用稳定的默认视野，避免空包围盒产生无效坐标。
  if(box.isEmpty())box.set(new THREE.Vector3(0,0,0),new THREE.Vector3(800,280,600));
  const sphere=box.getBoundingSphere(new THREE.Sphere()),radius=Math.max(sphere.radius,50),vertical=THREE.MathUtils.degToRad(camera.fov),horizontal=2*Math.atan(Math.tan(vertical/2)*Math.max(aspect,.01));
  const distance=radius/Math.sin(Math.min(vertical,horizontal)/2)*1.15;
  // 提高初始俯角，减少高墙遮挡房间地面和基础家具。
  const direction=new THREE.Vector3(1,6,1.4).normalize();camera.position.copy(sphere.center).addScaledVector(direction,distance);camera.near=Math.max(.01,radius/10000);camera.far=Math.max(100000,distance*100);camera.aspect=aspect;camera.lookAt(sphere.center);camera.updateProjectionMatrix();camera.updateMatrixWorld();return sphere.center;
}
