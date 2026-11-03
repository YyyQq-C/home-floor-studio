import {strToU8,zipSync} from 'fflate';

/** 将可编辑项目、2D 成图、3D 模型和 HA 安装包整理为单个交付 ZIP。 */
export function createProjectBundle(files:{projectJson:string;svg:string;png:Uint8Array;glb:Uint8Array;haBundle:Uint8Array}):Uint8Array {
  const guide=`Home Floor Studio 户型项目包（开发预览）\n\nproject/home-floor-studio.json：可再次导入编辑器的项目备份，可能包含参考底图。\n2d/home-floor-studio.svg 与 .png：根据导出面板当前设置生成的二维成图。\n3d/home-floor-studio.glb：简化三维模型，尺寸单位为米。\nhome-assistant/home-floor-studio-ha.zip：配套卡片、户型数据、许可和 HA 安装说明。\n\n继续编辑：解压后，在 Home Floor Studio 中选择“导入项目”，导入 project/home-floor-studio.json。\n安装 HA：解压内层 HA ZIP，按其中的“使用说明.txt”复制文件、注册卡片资源并绑定实体。\n\n项目备份可能包含原始户型图和设备名称，请妥善保管。上传给 AI 服务的图片不会另行打包，AI 密钥不会写入项目。输出仅供设计示意，尺寸和结构需人工核对，不能作为施工图。\n`;
  return zipSync({
    'project/home-floor-studio.json':strToU8(files.projectJson),
    '2d/home-floor-studio.svg':strToU8(files.svg),
    '2d/home-floor-studio.png':files.png,
    '3d/home-floor-studio.glb':files.glb,
    'home-assistant/home-floor-studio-ha.zip':files.haBundle,
    'README.txt':strToU8(guide),
  },{level:6});
}
