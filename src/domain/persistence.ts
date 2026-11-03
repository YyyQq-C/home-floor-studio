import {createEmptyProject,parseProject,type Project} from './project';

const DB_NAME='home-floor-studio';
const STORE='projects';
const KEY='current';
const LEGACY_KEY='hfs-project-v1';
const RECORD_FORMAT='hfs-storage-v1';
const LEGACY_REVISION='legacy';
let database:Promise<IDBDatabase>|undefined;
export type LoadedProject={project:Project;revision:string|null};

/** 表示其他标签页已经保存了不同版本。 */
export class ProjectConflictError extends Error {constructor(){super('Project changed in another tab');this.name='ProjectConflictError'}}

/** 打开浏览器本地数据库；打开失败不切换到旧存储，避免覆盖已有数据。 */
function openDatabase():Promise<IDBDatabase> {
  if(database)return database;
  database=new Promise((resolve,reject)=>{const request=indexedDB.open(DB_NAME,1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE)};request.onsuccess=()=>{request.result.onversionchange=()=>request.result.close();resolve(request.result)};request.onerror=()=>reject(request.error||new Error('Failed to open project database'));request.onblocked=()=>reject(new Error('Project database upgrade blocked'));});
  return database;
}
/** 识别旧版项目或带版本戳的项目记录。 */
function unpack(value:unknown):LoadedProject|null {
  if(value===undefined||value===null)return null;
  if(typeof value==='object'&&'format' in value&&(value as {format:unknown}).format===RECORD_FORMAT){const record=value as {revision?:unknown;project?:unknown};if(typeof record.revision!=='string'||!record.revision)throw new Error('Invalid project revision');return{project:parseProject(record.project),revision:record.revision}}
  return{project:parseProject(value),revision:LEGACY_REVISION};
}
/** 从本地数据库读取项目；首次编辑时再迁移旧版数据。 */
export async function loadProject():Promise<LoadedProject> {
  if(typeof indexedDB==='undefined') {const raw=localStorage.getItem(LEGACY_KEY);return raw?{project:parseProject(JSON.parse(raw)),revision:raw}:{project:createEmptyProject(),revision:null}}
  const db=await openDatabase();const value=await new Promise<unknown>((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),request=tx.objectStore(STORE).get(KEY);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error('Failed to read project'));tx.onabort=()=>reject(tx.error||new Error('Project read aborted'))});
  const loaded=unpack(value);if(loaded)return loaded;
  const legacy=localStorage.getItem(LEGACY_KEY);return{project:legacy?parseProject(JSON.parse(legacy)):createEmptyProject(),revision:null};
}
/** 读取未经解析的本地记录，供用户在恢复前导出留存。 */
export async function readRawProject():Promise<{format:string;current?:unknown;legacy:string|null}> {
  const legacy=localStorage.getItem(LEGACY_KEY);if(typeof indexedDB==='undefined')return {format:'hfs-raw-snapshot-v1',legacy};
  const db=await openDatabase();const current=await new Promise<unknown>((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),request=tx.objectStore(STORE).get(KEY);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error('Failed to read raw project'));tx.onabort=()=>reject(tx.error||new Error('Raw project read aborted'))});return{format:'hfs-raw-snapshot-v1',current,legacy};
}
/** 原子备份损坏记录并恢复已验证项目；若当前记录已被其他页面修复则拒绝覆盖。 */
export async function recoverProject(value:unknown):Promise<LoadedProject> {
  const project=parseProject(value),legacy=localStorage.getItem(LEGACY_KEY),revision=crypto.randomUUID(),backupKey=`recovery-backup-${revision}`;
  if(typeof indexedDB==='undefined'){if(legacy!==null){try{parseProject(JSON.parse(legacy));throw new ProjectConflictError()}catch(error){if(error instanceof ProjectConflictError)throw error}localStorage.setItem(backupKey,legacy)}const next=JSON.stringify(project);localStorage.setItem(LEGACY_KEY,next);return{project,revision:next}}
  const db=await openDatabase();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);let conflict=false;const request=store.get(KEY);
    request.onsuccess=()=>{let snapshot:unknown;try{snapshot=structuredClone(request.result)}catch(error){console.error('Failed to inspect recovery snapshot',error);tx.abort();return}let valid=false;try{valid=unpack(snapshot)!==null;if(!valid&&legacy!==null){parseProject(JSON.parse(legacy));valid=true}}catch(error){console.warn('Recovering invalid stored project',error instanceof Error?error.message:'UnknownError')}if(valid){conflict=true;tx.abort();return}store.put({format:'hfs-recovery-backup-v1',createdAt:new Date().toISOString(),current:request.result,legacy},backupKey);store.put({format:RECORD_FORMAT,revision,project},KEY)};
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('Failed to recover project'));tx.onabort=()=>reject(conflict?new ProjectConflictError():tx.error||new Error('Project recovery aborted'));
  });return{project,revision};
}
/** 在一个数据库事务内比较版本并保存，防止不同标签页覆盖彼此。 */
export async function saveProject(project:Project,expectedRevision:string|null):Promise<string> {
  if(typeof indexedDB==='undefined'){const current=localStorage.getItem(LEGACY_KEY);if(current!==expectedRevision)throw new ProjectConflictError();const next=JSON.stringify(project);localStorage.setItem(LEGACY_KEY,next);return next}
  const db=await openDatabase();const revision=crypto.randomUUID();return await new Promise<string>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);let conflict=false;const get=store.get(KEY);
    get.onsuccess=()=>{try{const current=unpack(get.result);if((current?.revision??null)!==expectedRevision){conflict=true;tx.abort();return}store.put({format:RECORD_FORMAT,revision,project},KEY)}catch(error){console.error('Failed to inspect stored project',error);tx.abort()}};
    tx.oncomplete=()=>resolve(revision);tx.onerror=()=>reject(tx.error||new Error('Failed to save project'));tx.onabort=()=>reject(conflict?new ProjectConflictError():tx.error||new Error('Project save aborted'));
  });
}
