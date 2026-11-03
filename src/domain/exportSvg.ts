import {wallSegments, wallSpans, doorSwingGeometry, projectScale, roomLabelPosition, type Project} from './project';
import {furnitureGlyphSvg} from './furnitureGlyph';
import {markerGlyph} from './markerIcons';

/** 转义 XML 文本，避免设备名称破坏导出的图像结构。 */
function escapeXml(value: string): string { return value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char] ?? char)); }

/** 计算包含户型内容的成图范围，可选择保留原画布或紧凑排版。 */
export function exportBounds(project:Project,compact=false):{x:number;y:number;width:number;height:number} {
  const scale=projectScale(project);let left=compact?Infinity:0,top=compact?Infinity:0,right=compact?-Infinity:800,bottom=compact?-Infinity:600;
  const include=(x:number,y:number,rx:number,ry:number)=>{left=Math.min(left,x-rx);right=Math.max(right,x+rx);top=Math.min(top,y-ry);bottom=Math.max(bottom,y+ry)};
  for(const wall of project.walls){const margin=wall.thickness/scale/2+10;include(wall.start.x,wall.start.y,margin,margin);include(wall.end.x,wall.end.y,margin,margin)}
  for(const opening of project.openings){const wall=project.walls.find(item=>item.id===opening.wallId);if(!wall)continue;const swing=doorSwingGeometry(wall,opening,scale);if(swing)include(swing.hinge.x,swing.hinge.y,swing.width+5,swing.width+5)}
  for(const room of project.rooms){for(const point of room.points)include(point.x,point.y,10,10);if(compact){const center=roomLabelPosition(room.points);include(center.x,center.y,Math.max(10,room.name.length*8),16)}}
  for(const item of project.furniture){const angle=item.rotation*Math.PI/180,c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle));include(item.position.x,item.position.y,(item.width*c+item.depth*s)/(2*scale)+10,(item.width*s+item.depth*c)/(2*scale)+10)}
  for(const marker of project.markers)include(marker.position.x,marker.position.y,Math.max(20,marker.name.length*7),35);
  if(!Number.isFinite(left))return {x:0,y:0,width:800,height:600};
  if(compact){left-=20;top-=20;right+=20;bottom+=20;}
  return {x:left,y:top,width:right-left,height:bottom-top};
}

/** 将已确认的墙体和设备标记导出为不包含参考底图的 SVG。 */
export function exportSvg(project: Project,bounds=exportBounds(project),transparent=false): string {
  const scale=projectScale(project);
  const rooms=project.rooms.map(room=>{const points=room.points.map(p=>`${p.x},${p.y}`).join(' ');const texture=room.floorStyle&&room.floorStyle!=='solid'?`<polygon points="${points}" fill="url(#floor-${room.floorStyle})"/>`:'';return `<polygon points="${points}" fill="${room.color}"/>${texture}`;}).join('');
  const labels=project.rooms.map(room=>{const center=roomLabelPosition(room.points);return `<text x="${center.x}" y="${center.y}" text-anchor="middle" font-size="14" fill="#605d54" stroke="#fafbf9" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${escapeXml(room.name)}</text>`}).join('');
  const walls=project.walls.flatMap(w=>wallSegments(w,project.openings,scale).map(segment=>`<line x1="${segment.start.x}" y1="${segment.start.y}" x2="${segment.end.x}" y2="${segment.end.y}" stroke="${w.color||'#3c4540'}" stroke-width="${w.thickness/scale}" stroke-linecap="butt"/>`)).join('');
  // 使用墙洞和 3D 门窗相同的裁剪范围绘制闭合门板及窗线。
  const openings=project.openings.map(o=>{const wall=project.walls.find(w=>w.id===o.wallId);if(!wall)return '';const {length,parts}=wallSpans(wall,[o],scale),part=parts[0];if(!length||!part)return '';const swing=doorSwingGeometry(wall,o,scale);if(swing)return `<g data-opening="door"><line x1="${swing.hinge.x}" y1="${swing.hinge.y}" x2="${swing.tip.x}" y2="${swing.tip.y}" stroke="#a77a53" stroke-width="4"/><path d="M ${swing.closed.x} ${swing.closed.y} A ${swing.width} ${swing.width} 0 0 ${swing.sweep} ${swing.tip.x} ${swing.tip.y}" fill="none" stroke="#a77a53" stroke-width="1.5"/></g>`;const x=(distance:number)=>wall.start.x+(wall.end.x-wall.start.x)*distance/length,y=(distance:number)=>wall.start.y+(wall.end.y-wall.start.y)*distance/length;return `<line data-opening="${o.kind}" x1="${x(part.start)}" y1="${y(part.start)}" x2="${x(part.end)}" y2="${y(part.end)}" stroke="${o.kind==='door'?'#a77a53':'#70a6b5'}" stroke-width="${o.kind==='door'?4:3}"/>`;}).join('');
  const furniture=project.furniture.map(f=>`<g transform="translate(${f.position.x} ${f.position.y}) rotate(${f.rotation}) scale(${f.width/(100*scale)} ${f.depth/(100*scale)})">${furnitureGlyphSvg(f.kind,f.color)}</g>`).join('');
  const markers=project.markers.map(m=>`<g transform="translate(${m.position.x} ${m.position.y})"><circle r="13" fill="#497a5b"/><text y="5" text-anchor="middle" fill="white" font-size="14">${markerGlyph(m.icon)}</text><text y="28" text-anchor="middle" font-size="12" fill="#26362b">${escapeXml(m.name)}</text></g>`).join('');
  const background=transparent?'':`<rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" fill="#fafbf9"/>`;
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}" width="${bounds.width}" height="${bounds.height}"><title>${escapeXml(project.name)}</title><defs><pattern id="floor-wood" width="45" height="24" patternUnits="userSpaceOnUse"><path d="M0 0H45 M0 24H45 M15 0V12 M35 12V24 M0 12H45" fill="none" stroke="#927960" stroke-opacity=".28" stroke-width="1"/></pattern><pattern id="floor-tile" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#818b84" stroke-opacity=".3" stroke-width="1"/></pattern></defs>${background}${rooms}${furniture}${walls}${openings}${labels}${markers}</svg>`;
}
