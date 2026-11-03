export type ViewBox={x:number;y:number;width:number;height:number};
export const DEFAULT_VIEW:ViewBox={x:0,y:0,width:800,height:600};
/** 围绕视图中心缩放，限制最大和最小范围。 */
export function zoomView(view:ViewBox,factor:number):ViewBox {
  if(!Number.isFinite(factor)||factor<=0)return view;const width=Math.max(200,Math.min(Math.max(10000000,view.width),view.width*factor));const height=width*.75;return{x:view.x+(view.width-width)/2,y:view.y+(view.height-height)/2,width,height};
}
/** 将完整内容及适当边距放入固定 4:3 画布视口。 */
export function fitView(bounds:ViewBox):ViewBox {
  if(![bounds.x,bounds.y,bounds.width,bounds.height].every(Number.isFinite)||bounds.width<=0||bounds.height<=0)return DEFAULT_VIEW;
  const width=Math.max(200,bounds.width*1.1,bounds.height*1.1/.75),height=width*.75;
  return{x:bounds.x+(bounds.width-width)/2,y:bounds.y+(bounds.height-height)/2,width,height};
}
