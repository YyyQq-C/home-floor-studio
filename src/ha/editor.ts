import {readHaProjectResponse} from '../domain/haResponse';
import type {Project} from '../domain/project';
import {validProjectUrl,type Config,type Hass} from './types';

/** 提供 HA 仪表盘中的可视化卡片配置和实体绑定。 */
class HomeFloorStudioEditor extends HTMLElement {
  private root:ShadowRoot; private config?:Config; private currentHass?:Hass; private project?:Project; private loadedPath=''; private controller?:AbortController; private message='请输入户型文件路径。'; private entitySignature=''; private pendingEntityUpdate=false;
  constructor(){super();this.root=this.attachShadow({mode:'open'});this.root.addEventListener('focusout',()=>{setTimeout(()=>{if(this.pendingEntityUpdate&&!this.root.activeElement){this.pendingEntityUpdate=false;this.render()}},0)})}
  /** 接收 HA 中保存的卡片配置。 */
  setConfig(config:Config){this.config=config;if(config.project_url!==this.loadedPath){this.project=undefined;this.loadProject(config.project_url)}this.render()}
  /** 接收可供选择的 HA 实体。 */
  set hass(value:Hass){this.currentHass=value;const signature=JSON.stringify(Object.entries(value?.states||{}).map(([id,state])=>[id,state.attributes?.friendly_name||'']).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))));if(signature!==this.entitySignature){this.entitySignature=signature;if(this.root.activeElement)this.pendingEntityUpdate=true;else this.render()}}
  /** 重新挂载时恢复户型标记读取。 */
  connectedCallback(){if(this.config&&!this.loadedPath){this.loadProject(this.config.project_url);this.render()}}
  /** 停止不再需要的户型文件请求。 */
  disconnectedCallback(){this.controller?.abort();this.loadedPath=''}
  /** 加载户型文件中的设备标记。 */
  private async loadProject(path:string){this.controller?.abort();this.loadedPath=path;if(!validProjectUrl(path)){this.message='请输入 /local/ 下的户型文件路径。';return}const controller=new AbortController();this.controller=controller;this.message='正在加载户型标记…';
    try{const response=await fetch(path,{credentials:'same-origin',cache:'no-store',signal:controller.signal});const project=await readHaProjectResponse(response);if(controller.signal.aborted)return;this.project=project;this.message=project.markers.length?'':'户型中没有设备标记。';this.render()}
    catch(error){if(controller.signal.aborted)return;console.error('Failed to load floor project for editor',error);this.project=undefined;this.message='无法读取户型，请检查路径和文件格式。';this.render()}}
  /** 通知 HA 保存更新后的卡片配置。 */
  private update(patch:Partial<Config>){if(!this.config)return;const next={...this.config,...patch};this.config=next;this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:next},bubbles:true,composed:true}));if(next.project_url!==this.loadedPath){this.project=undefined;this.loadProject(next.project_url)}this.render()}
  /** 使用文本节点构建配置界面，避免将设备名称解析为 HTML。 */
  private render(){if(!this.config)return;this.root.replaceChildren();const style=document.createElement('style');style.textContent=':host{display:block;color:var(--primary-text-color,#26312b);font:14px sans-serif}label{display:block;margin:14px 0}input,select{display:block;box-sizing:border-box;width:100%;padding:9px;margin-top:6px;background:var(--card-background-color,#fff);color:inherit;border:1px solid var(--divider-color,#ccc);border-radius:5px;font:inherit}p{color:var(--secondary-text-color,#66736a);line-height:1.5}';this.root.append(style);
    const input=(labelText:string,value:string,onChange:(value:string)=>void)=>{const label=document.createElement('label');label.textContent=labelText;const field=document.createElement('input');field.value=value;field.addEventListener('change',()=>onChange(field.value.trim()));label.append(field);this.root.append(label)};
    input('户型文件路径',this.config.project_url||'',value=>this.update({project_url:value}));const reload=document.createElement('button');reload.type='button';reload.textContent='重新加载户型';reload.addEventListener('click',()=>{if(!this.config)return;this.project=undefined;this.loadProject(this.config.project_url);this.render()});this.root.append(reload);input('标题',this.config.title||'',value=>this.update({title:value}));
    const modeLabel=document.createElement('label');modeLabel.textContent='默认视图';const mode=document.createElement('select');for(const [value,text] of [['2d','2D 平面'],['3d','3D 模型']]){const option=document.createElement('option');option.value=value;option.textContent=text;mode.append(option)}mode.value=this.config.view||'2d';mode.addEventListener('change',()=>this.update({view:mode.value as '2d'|'3d'}));modeLabel.append(mode);this.root.append(modeLabel);
    if(!this.project){const info=document.createElement('p');info.textContent=this.message;this.root.append(info);return}
    for(const marker of this.project.markers){const label=document.createElement('label');label.textContent=marker.name;const select=document.createElement('select');select.setAttribute('aria-label',`${marker.name} 实体`);const none=document.createElement('option');none.value='';none.textContent='不绑定';select.append(none);const current=this.config.entities?.[marker.id]||'';const states=this.currentHass?.states||{};const ids=Object.keys(states).sort();if(current&&!ids.includes(current)){const missing=document.createElement('option');missing.value=current;missing.textContent=`${current}（当前不可用）`;select.append(missing)}for(const id of ids){const option=document.createElement('option');option.value=id;option.textContent=`${states[id].attributes?.friendly_name||id} (${id})`;select.append(option)}select.value=current;select.addEventListener('change',()=>{const entities={...(this.config?.entities||{})};if(select.value)entities[marker.id]=select.value;else delete entities[marker.id];this.update({entities})});label.append(select);this.root.append(label);
      const actionLabel=document.createElement('label');actionLabel.textContent=`${marker.name} 点击操作`;const action=document.createElement('select');action.setAttribute('aria-label',`${marker.name} 点击操作`);
      for(const [value,text] of [['more-info','查看详情（默认）'],['toggle','切换开关（灯、开关、风扇及辅助开关）']]){const option=document.createElement('option');option.value=value;option.textContent=text;action.append(option)}
      action.value=this.config.actions?.[marker.id]||'more-info';action.addEventListener('change',()=>{const actions={...(this.config?.actions||{})};if(action.value==='toggle')actions[marker.id]='toggle';else delete actions[marker.id];this.update({actions})});actionLabel.append(action);this.root.append(actionLabel)}
  }
}
if(!customElements.get('home-floor-studio-editor'))customElements.define('home-floor-studio-editor',HomeFloorStudioEditor);
