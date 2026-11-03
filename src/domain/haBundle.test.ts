import {afterEach,describe,expect,it,vi} from 'vitest';
import {strFromU8,unzipSync} from 'fflate';
import {createProject} from './project';
import {exportHaBundle} from './haBundle';
describe('HA 安装包',()=>{
  afterEach(()=>vi.restoreAllMocks());
  it('包含卡片、许可证及不含参考图的户型数据',async()=>{const mock=vi.spyOn(globalThis,'fetch').mockImplementation(async input=>new Response(String(input).includes('card.js')?'customElements.define("home-floor-studio-card",class{})':'许可文本',{status:200}));const project=createProject();project.background='data:image/png;base64,AAAA';const files=unzipSync(await exportHaBundle(project));expect(strFromU8(files['www/home-floor-studio/home-floor-ha.json'])).not.toContain('AAAA');expect(strFromU8(files['www/home-floor-studio/home-floor-studio-card.js'])).toContain('home-floor-studio-card');expect(files['LICENSE.txt']).toBeDefined();expect(files['THREE-LICENSE.txt']).toBeDefined();const guide=strFromU8(files['使用说明.txt']);expect(guide).toContain('明确配置切换开关');expect(guide).toContain('绑定和点击操作配置保留');expect(guide).not.toContain('不直接调用设备服务');expect(mock).toHaveBeenCalledTimes(3)});
  it('拒绝缺失或被 HTML 页面替代的卡片文件',async()=>{vi.spyOn(globalThis,'fetch').mockImplementation(async()=>new Response('<html>Not found</html>',{status:200}));await expect(exportHaBundle(createProject())).rejects.toThrow('Invalid Home Assistant release files')});
});
