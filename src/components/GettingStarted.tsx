import type {Project} from '../domain/project';

/** 展示从底图到导出的操作顺序及当前项目的基本进度。 */
export default function GettingStarted({project}:{project:Project}){
  return <details className="getting-started"><summary>新手操作指引</summary><ol>
    <li><b>准备图纸</b><span>{project.background?'已上传参考底图。':'上传 PNG / JPG 户型图，或直接手工绘制。'}</span></li>
    <li><b>建立墙体</b><span>{project.walls.length?`当前 ${project.walls.length} 面墙。`:'选择“墙体”，依次点击起点和终点。'} 也可自行配置 AI 辅助识别，候选须人工应用并核对。</span></li>
    <li><b>创建房间</b><span>{project.rooms.length?`当前 ${project.rooms.length} 个房间。`:'选择“房间”，绘制边界或从闭合墙体生成。'} 未创建房间时 3D 不含地面。</span></li>
    <li><b>校准与布置</b><span>{project.cmPerUnit===null?'选择一面墙，在属性中输入实际墙长并校准。':'比例已校准，仍需核对其他尺寸。'} 可添加门窗、家具和设备标记。</span></li>
    <li><b>检查并导出</b><span>使用“检查户型”和“3D 预览”核对，可分别导出文件，也可一次打包项目备份、PNG / SVG、GLB 和 HA 安装包。</span></li>
  </ol><p>没有户型图？可下载合成示例，上传后用于练习描图：</p><div className="sample-links"><a href={`${import.meta.env.BASE_URL}examples/landscape.png`} download>横向示例</a><a href={`${import.meta.env.BASE_URL}examples/portrait.png`} download>纵向示例</a><a href={`${import.meta.env.BASE_URL}examples/l-shaped.png`} download>异形示例</a></div><p>示例仅供练习，不是施工图。</p><p>AI 会在点击发送后把图片传给所填服务；原图和密钥不会包含在 HA 安装包内。</p></details>;
}
