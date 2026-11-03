import 'fake-indexeddb/auto';
import {describe,it,expect,vi} from 'vitest';
import {loadProject,readRawProject,recoverProject,saveProject,ProjectConflictError} from './persistence';
import {createEmptyProject} from './project';

describe('项目保存冲突',()=>{
  it('同一版本的并发写入只有一个成功，旧版记录仍可迁移',async()=>{
    vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{}});
    const a=await loadProject(),b=await loadProject();expect(a.project.walls).toEqual([]);expect(a.project.background).toBeNull();
    const results=await Promise.allSettled([saveProject({...a.project,name:'第一页'},a.revision),saveProject({...b.project,name:'第二页'},b.revision)]);
    expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1);const failed=results.find(result=>result.status==='rejected');expect(failed?.status==='rejected'&&failed.reason).toBeInstanceOf(ProjectConflictError);
    const stored=await loadProject();expect(['第一页','第二页']).toContain(stored.project.name);
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('home-floor-studio');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
    await new Promise<void>((resolve,reject)=>{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put({version:1,name:'旧项目',walls:[],markers:[],background:null},'current');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});
    const legacy=await loadProject();expect(legacy.project.name).toBe('旧项目');await saveProject({...legacy.project,name:'已迁移'},legacy.revision);expect((await loadProject()).project.name).toBe('已迁移');db.close();
    vi.unstubAllGlobals();
  });
  it('保留损坏记录后恢复有效备份，并拒绝覆盖已经修复的项目',async()=>{
    vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{}});const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('home-floor-studio');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});const corrupted={format:'hfs-storage-v1',revision:'broken',project:{version:999,name:'损坏数据'}};
    await new Promise<void>((resolve,reject)=>{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put(corrupted,'current');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});
    await expect(loadProject()).rejects.toThrow();expect((await readRawProject()).current).toEqual(corrupted);const backup={...createEmptyProject(),name:'恢复项目'},restored=await recoverProject(backup);expect(restored.project.name).toBe('恢复项目');expect((await loadProject()).project.name).toBe('恢复项目');
    const saved=await new Promise<unknown[]>((resolve,reject)=>{const tx=db.transaction('projects','readonly'),request=tx.objectStore('projects').getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});expect(saved.some(item=>(item as {current?:unknown}).current&&JSON.stringify((item as {current:unknown}).current)===JSON.stringify(corrupted))).toBe(true);
    await expect(recoverProject({...backup,name:'不应覆盖'})).rejects.toBeInstanceOf(ProjectConflictError);expect((await loadProject()).project.name).toBe('恢复项目');db.close();vi.unstubAllGlobals();
  });
  it('localStorage 回退模式先备份损坏文本再恢复',async()=>{const values=new Map<string,string>([['hfs-project-v1','{broken']]);vi.stubGlobal('indexedDB',undefined);vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)});const restored=await recoverProject({...createEmptyProject(),name:'本地恢复'});expect(restored.project.name).toBe('本地恢复');expect([...values].some(([key,value])=>key.startsWith('recovery-backup-')&&value==='{broken')).toBe(true);expect((await loadProject()).project.name).toBe('本地恢复');vi.unstubAllGlobals()});
});
