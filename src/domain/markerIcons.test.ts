import {describe,expect,it} from 'vitest';
import {createDemoProject,parseProject} from './project';
import {exportSvg} from './exportSvg';
import {exportHaProject,parseHaProject} from './haPackage';
import {MARKER_ICONS,markerGlyph} from './markerIcons';

describe('设备标记图标',()=>{
  it('旧项目保持星标，各种内置图标随项目、平面图和 HA 数据保留',()=>{const p=createDemoProject();expect(markerGlyph(p.markers[0].icon)).toBe('✦');for(const icon of Object.keys(MARKER_ICONS) as (keyof typeof MARKER_ICONS)[]){p.markers[0].icon=icon;expect(exportSvg(p)).toContain(`>${markerGlyph(icon)}</text>`);expect(parseHaProject(JSON.parse(exportHaProject(p))).markers[0].icon).toBe(icon)}});
  it('拒绝未知图标，避免不可信内容插入 SVG',()=>{const p=createDemoProject();(p.markers[0] as unknown as {icon:string}).icon='<script>';expect(()=>parseProject(p)).toThrow()});
});
