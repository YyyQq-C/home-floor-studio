/** 设备标记支持的内置图标，字符可用于 SVG 和 HA 卡片。 */
export const MARKER_ICONS={star:{label:'星标',glyph:'✦'},light:{label:'灯光',glyph:'☼'},power:{label:'开关',glyph:'⏻'},climate:{label:'温控',glyph:'❄'},sensor:{label:'传感器',glyph:'◎'},outlet:{label:'插座',glyph:'▣'},camera:{label:'摄像头',glyph:'◇'}} as const;
export type MarkerIcon=keyof typeof MARKER_ICONS;
/** 返回图标字符；旧项目未指定图标时保持原来的星标。 */
export function markerGlyph(icon?:MarkerIcon):string {return MARKER_ICONS[icon||'star']?.glyph||MARKER_ICONS.star.glyph;}
/** 校验导入的图标是否属于内置列表。 */
export function validMarkerIcon(value:unknown):value is MarkerIcon {return typeof value==='string'&&Object.hasOwn(MARKER_ICONS,value);}
