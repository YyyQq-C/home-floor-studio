import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {frameCamera} from './cameraFrame';

describe('3D 自动取景',()=>{
  it('在狭窄视口中覆盖远离原点的模型和设备',()=>{const model=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(1200,350,600));mesh.position.set(5000,175,-3000);model.add(mesh);const marker=new THREE.Vector3(6500,400,-3500),camera=new THREE.PerspectiveCamera(40,1,1,100000);const center=frameCamera(camera,model,.45,[marker]);const bounds=new THREE.Box3().setFromObject(model).expandByPoint(marker);for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const p=new THREE.Vector3(x,y,z).project(camera);expect(Math.abs(p.x)).toBeLessThan(1);expect(Math.abs(p.y)).toBeLessThan(1);expect(p.z).toBeGreaterThan(-1);expect(p.z).toBeLessThan(1)}expect(center.x).toBeGreaterThan(4000);mesh.geometry.dispose();(mesh.material as THREE.Material).dispose()});
  it('空模型仍返回有限的默认取景',()=>{const camera=new THREE.PerspectiveCamera(40,1,1,100000),center=frameCamera(camera,new THREE.Group(),1);expect(center.toArray().every(Number.isFinite)).toBe(true);expect(camera.position.toArray().every(Number.isFinite)).toBe(true)});
});
