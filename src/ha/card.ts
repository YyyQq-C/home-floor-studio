import {exportBounds,exportSvg} from '../domain/exportSvg';
import {readHaProjectResponse} from '../domain/haResponse';
import {markerGlyph} from '../domain/markerIcons';
import type {Project} from '../domain/project';
import {mountThreeView} from './threeView';
import {validProjectUrl,type Config,type Hass} from './types';
import './editor';

/** 展示已导入户型及设备状态，按用户配置执行点击操作。 */
class HomeFloorStudioCard extends HTMLElement {
  private root:ShadowRoot;
  private config?:Config;
  private project?:Project;
  private currentHass?:Hass;
  private message='正在加载户型…';
  private loadFailed=false;
  private controller?:AbortController;
  private imageUrl?:string;
  private mode:'2d'|'3d'='2d';
  private disposeView?:()=>void;
  private buttons=new Map<string,HTMLButtonElement>();
  private entries=new Map<string,HTMLElement>();
  private pending=new Set<string>();
  private actionMessage?:HTMLElement;
  constructor(){super();this.root=this.attachShadow({mode:'open'});}
  /** 创建供 HA 调用的可视化配置元素。 */
  static getConfigElement(){return document.createElement('home-floor-studio-editor')}
  /** 提供添加卡片时的初始配置。 */
  static getStubConfig(){return {type:'custom:home-floor-studio-card',project_url:'/local/home-floor-studio/home-floor-ha.json',view:'2d',entities:{}}}
  /** 接收 HA 卡片配置并加载同源户型文件。 */
  setConfig(config:Config) {
    if(!config || !validProjectUrl(config.project_url)) throw new Error('project_url must use a /local/ path');
    if(config.view && !['2d','3d'].includes(config.view))throw new Error('Invalid floor view');
    if(config.actions && (typeof config.actions!=='object'||Object.values(config.actions).some(action=>action!=='more-info'&&action!=='toggle')))throw new Error('Invalid marker action');
    this.config=config;this.mode=config.view||'2d';this.project=undefined;this.message='正在加载户型…';this.loadProject(config.project_url);this.render();
  }
  /** 接收 HA 的当前实体快照。 */
  set hass(value:Hass) {this.currentHass=value;this.updateStates();}
  /** 返回卡片在仪表盘中的建议高度。 */
  getCardSize(){return 5;}
  /** 断开连接时释放网络请求及底图资源。 */
  disconnectedCallback(){this.disposeView?.();this.disposeView=undefined;this.controller?.abort();if(this.imageUrl){URL.revokeObjectURL(this.imageUrl);this.imageUrl=undefined;}}
  /** 重新挂载时恢复被中断的加载。 */
  connectedCallback(){if(this.config&&!this.imageUrl)this.loadProject(this.config.project_url);}
  /** 加载并验证用户放在 HA 静态目录的户型包。 */
  private async loadProject(path:string){
    this.controller?.abort();const controller=new AbortController();this.controller=controller;this.loadFailed=false;this.message='正在加载户型…';
    try {const response=await fetch(path,{signal:controller.signal,credentials:'same-origin',cache:'no-store'});const project=await readHaProjectResponse(response);if(controller.signal.aborted)return;
      if(this.imageUrl)URL.revokeObjectURL(this.imageUrl);this.project=project;this.imageUrl=URL.createObjectURL(new Blob([exportSvg({...project,markers:[]},exportBounds(project))],{type:'image/svg+xml'}));this.render();
    } catch(error) {if(controller.signal.aborted)return;console.error('Failed to load floor project',error);this.project=undefined;this.loadFailed=true;this.message='户型加载失败，请检查文件路径和格式';this.render();}
  }
  /** 创建 DOM 节点并填充文本，避免将配置或实体状态解释为 HTML。 */
  private el(tag:string,text?:string,className?:string){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
  /** 根据用户明确选择的行为打开详情或切换支持的实体。 */
  private async activateMarker(markerId:string){
    const entity=this.config?.entities?.[markerId],state=entity?this.currentHass?.states[entity]:undefined;
    if(!entity||!state||['unknown','unavailable'].includes(state.state)||this.pending.has(markerId))return;
    if(this.config?.actions?.[markerId]!=='toggle'){this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:entity},bubbles:true,composed:true}));return;}
    const domain=entity.split('.')[0];
    if(!['light','switch','fan','input_boolean'].includes(domain)||!['on','off'].includes(state.state)||!this.currentHass?.callService){if(this.actionMessage)this.actionMessage.textContent='该实体不支持开关操作，请改用查看详情。';return;}
    const hass=this.currentHass;this.pending.add(markerId);if(this.actionMessage)this.actionMessage.textContent='';this.updateStates();
    try{await hass.callService!(domain,'toggle',{entity_id:entity});}
    catch(error){console.error('Failed to toggle floor entity',error);if(this.actionMessage)this.actionMessage.textContent='操作失败，请检查实体权限和服务。';}
    finally{this.pending.delete(markerId);this.updateStates();}
  }
  /** 按当前实体快照更新平面图与状态。 */
  private render(){
    this.disposeView?.();this.disposeView=undefined;this.buttons.clear();this.entries.clear();this.root.replaceChildren();const style=this.el('style');style.textContent=`:host{display:block}ha-card{display:block;padding:16px;color:var(--primary-text-color,#26312b)}h2{margin:0 0 12px;font-size:18px}.stage{position:relative;aspect-ratio:4/3;background:#fafbf9;overflow:hidden}.stage img,.floor-canvas{display:block;width:100%;height:100%}.floor-canvas{touch-action:none}.switcher{display:flex;gap:8px;margin-bottom:10px}.switcher button{border:1px solid #cdd8cf;border-radius:5px;background:transparent;color:inherit;padding:6px 12px;cursor:pointer}.switcher button.active{background:#dcebe0;color:#315b3d}.marker[hidden]{display:none}.marker{position:absolute;transform:translate(-50%,-50%);border:2px solid white;border-radius:50%;width:30px;height:30px;background:#668571;color:white;cursor:pointer;box-shadow:0 1px 5px #0003}.marker.on{background:#c99132}.marker.off{background:#728079}.marker.unavailable{background:#999;cursor:default}.legend{display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:12px;font-size:12px}.entry{color:var(--secondary-text-color,#69766b)}.message{padding:24px;color:var(--secondary-text-color,#69766b)}`;this.root.append(style);const card=this.el('ha-card');this.root.append(card);card.append(this.el('h2',this.config?.title||this.project?.name||'户型'));
    if(!this.project||!this.imageUrl){card.append(this.el('div',this.message,'message'));if(this.loadFailed&&this.config){const retry=this.el('button','重新加载户型') as HTMLButtonElement;retry.type='button';retry.addEventListener('click',()=>{if(!this.config)return;void this.loadProject(this.config.project_url);this.render()});card.append(retry)}return;}
    const switcher=this.el('div',undefined,'switcher');for(const mode of ['2d','3d'] as const){const button=this.el('button',mode==='2d'?'2D 平面':'3D 模型',mode===this.mode?'active':'') as HTMLButtonElement;button.addEventListener('click',()=>{if(this.mode!==mode){this.mode=mode;this.render()}});switcher.append(button)}card.append(switcher);
    const stage=this.el('div',undefined,'stage');const bounds=exportBounds(this.project);stage.style.aspectRatio=`${bounds.width} / ${bounds.height}`;const legend=this.el('div',undefined,'legend');
    if(this.mode==='2d'){const image=this.el('img') as HTMLImageElement;image.src=this.imageUrl;image.alt='户型平面图';stage.append(image)}
    for(const marker of this.project.markers){const button=this.el('button',markerGlyph(marker.icon),'marker') as HTMLButtonElement;button.style.left=`${(marker.position.x-bounds.x)/bounds.width*100}%`;button.style.top=`${(marker.position.y-bounds.y)/bounds.height*100}%`;button.addEventListener('click',()=>{void this.activateMarker(marker.id)});stage.append(button);this.buttons.set(marker.id,button);const entry=this.el('span',undefined,'entry');this.entries.set(marker.id,entry);legend.append(entry);}
    this.actionMessage=this.el('p','','entry');this.actionMessage.setAttribute('role','status');card.append(stage,legend,this.actionMessage);if(this.mode==='3d'&&this.project.rooms.length===0)card.append(this.el('p','户型未绘制房间，3D 模型不含地面。','entry'));this.updateStates();
    if(this.mode==='3d')try {const reset=this.el('button','复位 3D 视角') as HTMLButtonElement;reset.type='button';this.disposeView=mountThreeView(stage,this.project,this.buttons,reset);switcher.append(reset);}catch(error){console.error('Failed to initialize 3D floor view',error);this.buttons.forEach(button=>{button.hidden=true});stage.append(this.el('p','无法加载 3D，请切换到 2D','message'));}
  }
  /** 原位刷新实体状态，避免每次 HA 更新都重建 3D 场景。 */
  private updateStates(){if(!this.project)return;for(const marker of this.project.markers){const button=this.buttons.get(marker.id),entry=this.entries.get(marker.id);if(!button||!entry)continue;const entity=this.config?.entities?.[marker.id],state=entity?this.currentHass?.states[entity]:undefined,available=!!state&&!['unavailable','unknown'].includes(state.state),status=!entity?'未绑定':!available?'不可用':state!.state;button.className=`marker ${available?(state!.state==='on'?'on':'off'):'unavailable'}`;button.title=`${marker.name}：${status}`;button.setAttribute('aria-label',button.title);button.disabled=!available||this.pending.has(marker.id);entry.textContent=`${marker.name}：${status}${available&&state?.attributes?.unit_of_measurement?` ${state.attributes.unit_of_measurement}`:''}`;}

  }
}
if(!customElements.get('home-floor-studio-card'))customElements.define('home-floor-studio-card',HomeFloorStudioCard);

const registry=window as Window & {customCards?:Array<{type:string;name:string;description:string}>};
registry.customCards=registry.customCards||[];
if(!registry.customCards.some(card=>card.type==='home-floor-studio-card'))registry.customCards.push({type:'home-floor-studio-card',name:'Home Floor Studio',description:'2D / 3D 户型展示'});
