import {readFile,writeFile,mkdir,readdir,lstat} from 'node:fs/promises';
import {resolve,relative,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {zipSync,strToU8} from 'fflate';

const root=fileURLToPath(new URL('../',import.meta.url));

/** 收集构建产物，拒绝链接文件，避免意外包含外部目录。 */
async function collect(directory,prefix,files){
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const path=join(directory,entry.name),name=`${prefix}/${entry.name}`;
    if((await lstat(path)).isSymbolicLink())throw new Error('Release cannot contain symbolic links');
    if(entry.isDirectory())await collect(path,name,files);
    else if(entry.isFile())files[name]=new Uint8Array(await readFile(path));
  }
}

/** 打包可部署站点及中文说明，并记录文件校验值。 */
async function main(){
  const metadata=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
  if(!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(metadata.version))throw new Error('Invalid release version');
  const files={};await collect(resolve(root,'dist'),'site',files);
  for(const required of ['site/index.html','site/ha-release/home-floor-studio-card.js','site/licenses/third-party.json'])if(!files[required])throw new Error(`Missing release artifact: ${required}`);
  files['LICENSE']=new Uint8Array(await readFile(resolve(root,'LICENSE')));
  files['CHANGELOG.md']=new Uint8Array(await readFile(resolve(root,'CHANGELOG.md')));
  for(const entry of await readdir(resolve(root,'docs'))){if(entry.endsWith('.md'))files[`docs/${entry}`]=new Uint8Array(await readFile(resolve(root,'docs',entry)));}
  files['开始使用.txt']=strToU8(`Home Floor Studio ${metadata.version}（开发预览）\n\n将 site 目录的全部内容部署到静态服务器的根目录或子目录，保留 assets、ha-release 和 licenses。无需在服务器安装 Node.js。通过 HTTPS 打开部署地址；本机预览也可使用 localhost。不要双击 index.html 以 file:// 运行。\n\n首次使用见 docs/user-guide.md，HA 安装见 docs/ha-preview.md，AI 配置见 docs/ai-recognition.md，版本内容见 CHANGELOG.md。AI 仍需用户自行选择服务，真实服务尚未验证；家庭 HA 和真实设备仍需验证。\n\n项目自动保存在当前浏览器与网址下；更换网址或更新前先导出项目备份。更新站点时备份旧站点，完整替换 site 内容；回退可恢复旧站点，但新版本项目未必兼容旧版本，需同时保留更新前的项目备份。\n\n非商业使用免费，商业使用须联系授权；完整条款见 LICENSE。\n`);
  const hashes=Object.fromEntries(Object.entries(files).sort(([a],[b])=>a.localeCompare(b)).map(([name,data])=>[name,createHash('sha256').update(data).digest('hex')]));
  files['manifest.json']=strToU8(JSON.stringify({name:metadata.name,version:metadata.version,files:hashes},null,2)+'\n');
  const output=resolve(root,'releases');await mkdir(output,{recursive:true});
  const filename=`home-floor-studio-${metadata.version}.zip`,archive=zipSync(files,{level:6});
  await writeFile(join(output,filename),archive);
  await writeFile(join(output,`${filename}.sha256`),`${createHash('sha256').update(archive).digest('hex')}  ${filename}\n`);
  console.log(`Release package created: ${relative(root,join(output,filename))}`);
}

main().catch(error=>{console.error('Failed to package release',error);process.exitCode=1});
