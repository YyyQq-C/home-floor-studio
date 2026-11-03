export type HassState={state:string;attributes?:{friendly_name?:string;unit_of_measurement?:string}};
export type Hass={states:Record<string,HassState>;callService?:(domain:string,service:string,data:Record<string,string>)=>Promise<unknown>};
export type MarkerAction='more-info'|'toggle';
export type Config={type:string;project_url:string;entities?:Record<string,string>;title?:string;view?:'2d'|'3d';actions?:Record<string,MarkerAction>};

/** 限制卡片只读取同源 HA 静态目录中的户型文件。 */
export function validProjectUrl(path:unknown):path is string {
  if(typeof path!=='string'||!path.startsWith('/local/')||path.includes('\\'))return false;
  try {const url=new URL(path,location.origin);return url.origin===location.origin&&url.pathname.startsWith('/local/')&&!/%2f|%5c/i.test(url.pathname)}catch(error){console.error('Invalid floor project URL',error);return false}
}
