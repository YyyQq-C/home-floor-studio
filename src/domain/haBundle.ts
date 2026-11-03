import {strToU8,zipSync} from 'fflate';
import {exportHaProject} from './haPackage';
import type {Project} from './project';

/** 从同一版本的静态资源生成可安装的 HA 文件包。 */
export async function exportHaBundle(project:Project):Promise<Uint8Array> {
  const base=`${import.meta.env.BASE_URL}ha-release/`;
  const files=['home-floor-studio-card.js','LICENSE.txt','THREE-LICENSE.txt'];
  const contents=await Promise.all(files.map(async name=>{const response=await fetch(`${base}${name}`,{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw new Error(`Release file unavailable: ${name}`);return new Uint8Array(await response.arrayBuffer())}));
  const cardText=new TextDecoder().decode(contents[0]);if(contents.some(content=>content.byteLength===0||content.byteLength>5000000)||!cardText.includes('home-floor-studio-card'))throw new Error('Invalid Home Assistant release files');
  const guide=`Home Floor Studio HA 安装包（开发预览）\n\n1. 备份现有 HA 配置及同名目录。\n2. 解压后，将 www/home-floor-studio 目录复制到 HA 配置目录的 www 下；最终应有 home-floor-ha.json 和 home-floor-studio-card.js 两个文件。\n3. 在 HA 仪表盘资源管理中添加 /local/home-floor-studio/home-floor-studio-card.js，资源类型选择 JavaScript 模块；如果已经注册，不要重复添加。\n4. 刷新浏览器，在仪表盘编辑模式添加 Home Floor Studio 卡片。户型路径填 /local/home-floor-studio/home-floor-ha.json，再为每个设备标记选择 HA 实体并保存。点击操作默认为查看详情；如需切换开关，请为支持的实体明确选择此操作。\n5. 检查 2D、3D、状态和实体详情，再按实际环境检查权限与显示。\n\n更新户型时先备份原文件，再替换 home-floor-ha.json。刷新仪表盘；在卡片配置界面可点击“重新加载户型”刷新标记列表。保留原项目的标记 ID 时，已有实体绑定和点击操作配置保留；删除后重新创建的标记会有新 ID，需要重新绑定。更新卡片脚本后如仍看到旧版本，尝试浏览器强制刷新。\n\n如卡片找不到户型，检查文件确实位于 HA 配置目录下的 www/home-floor-studio/，并在已登录 HA 的浏览器中打开上述 /local/ 路径检查。实体显示不可用时，检查实体 ID、状态和当前账号权限。\n\n本包不含参考底图或 AI 密钥；但户型与设备名称仍可能属于敏感信息。卡片默认打开 HA 实体详情；为支持的实体明确配置切换开关后，点击会调用对应的 HA toggle 服务。\n项目许可证见 LICENSE.txt，Three.js 许可见 THREE-LICENSE.txt。\n卡片已在本机隔离 HA 2024.12.5 中验证加载、2D/3D 切换和测试用 input_boolean 切换；家庭 HA 的完整安装、真实设备及平板仍需验证。\n`;
  return zipSync({'www/home-floor-studio/home-floor-ha.json':strToU8(exportHaProject(project)),'www/home-floor-studio/home-floor-studio-card.js':contents[0],'LICENSE.txt':contents[1],'THREE-LICENSE.txt':contents[2],'使用说明.txt':strToU8(guide)},{level:6});
}
