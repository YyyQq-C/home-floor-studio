import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const out=resolve('public','ha-release');
await mkdir(out,{recursive:true});
await Promise.all([
  copyFile(resolve('dist-ha','home-floor-studio-card.js'),resolve(out,'home-floor-studio-card.js')),
  copyFile(resolve('LICENSE'),resolve(out,'LICENSE.txt')),
  copyFile(resolve('node_modules','three','LICENSE'),resolve(out,'THREE-LICENSE.txt')),
]);
// 将编辑器运行依赖的原始许可与版本一起放入静态构建产物。
const licenses=resolve('public','licenses');await mkdir(licenses,{recursive:true});
const packages=['react','react-dom','scheduler','three','fflate','lucide-react'];
const entries=await Promise.all(packages.map(asyncName));
/** 收集指定依赖的版本、许可类型和原始许可文本。 */
async function asyncName(name){const directory=resolve('node_modules',name),metadata=JSON.parse(await readFile(resolve(directory,'package.json'),'utf8')),file=`${name}-LICENSE.txt`;await copyFile(resolve(directory,'LICENSE'),resolve(licenses,file));return{name,version:metadata.version,license:metadata.license,file}}
await copyFile(resolve('LICENSE'),resolve(licenses,'HOME-FLOOR-STUDIO-LICENSE.txt'));
await writeFile(resolve(licenses,'third-party.json'),JSON.stringify(entries,null,2)+'\n','utf8');
console.log('Home Assistant release files staged');
