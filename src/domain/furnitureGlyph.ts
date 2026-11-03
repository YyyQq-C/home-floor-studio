export type FurnitureKind='bed'|'sofa'|'table'|'cabinet'|'chair'|'toilet'|'sink'|'shower'|'tv-cabinet'|'kitchen-counter';
export const FURNITURE_LABELS:Record<FurnitureKind,string>={bed:'床',sofa:'沙发',table:'餐桌',cabinet:'柜子',chair:'椅子',toilet:'马桶',sink:'洗手台',shower:'淋浴区','tv-cabinet':'电视柜','kitchen-counter':'厨房地柜'};
type Shape={tag:'rect'|'ellipse'|'line';attrs:Record<string,string|number>};
/** 返回家具三维模型的默认颜色。 */
export function furnitureDefaultColor(kind:FurnitureKind):string {return ['cabinet','tv-cabinet','kitchen-counter'].includes(kind)?'#bca58a':kind==='table'||kind==='chair'?'#b59370':kind==='sofa'?'#aaa79d':['toilet','sink','shower'].includes(kind)?'#e6ebe8':'#d8d2c4';}
/** 构造可复用的俯视家具符号，坐标范围为 -50 到 50。 */
function baseFurnitureGlyph(kind:FurnitureKind):Shape[] {
  const rect=(x:number,y:number,width:number,height:number,fill:string,rx=3):Shape=>({tag:'rect',attrs:{x,y,width,height,rx,fill,stroke:'#938b80',strokeWidth:1}});
  const ellipse=(cx:number,cy:number,rx:number,ry:number,fill:string):Shape=>({tag:'ellipse',attrs:{cx,cy,rx,ry,fill,stroke:'#9b9d96',strokeWidth:1}});
  switch(kind){
    case 'bed':return [rect(-50,-50,100,100,'#bead99'),rect(-46,-43,92,88,'#f0ede6'),rect(-42,-39,39,21,'#ffffff'),rect(3,-39,39,21,'#ffffff'),rect(-46,23,92,19,'#cba78e')];
    case 'sofa':return [rect(-50,-50,100,100,'#8f938d',8),rect(-44,-38,42,70,'#c3c4bb',5),rect(2,-38,42,70,'#c3c4bb',5),rect(-50,31,100,15,'#a4a79f',5)];
    case 'table':return [rect(-50,-50,100,100,'#b99979',5),rect(-45,-45,90,90,'#d7bea0',4)];
    case 'tv-cabinet':return [rect(-50,-50,100,100,'#b89d80'),rect(-46,-45,44,90,'#ddcbb5'),rect(2,-45,44,90,'#ddcbb5')];
    case 'kitchen-counter':return [rect(-50,-50,100,100,'#bbad9b'),rect(-46,-43,92,86,'#e3d9c9'),rect(-40,-30,32,60,'#c5d0cc',6)];
    case 'cabinet':return [rect(-50,-50,100,100,'#cab69b'),rect(-45,-44,90,40,'#e0d0ba'),rect(-45,4,90,40,'#e0d0ba')];
    case 'chair':return [rect(-48,-48,96,96,'#b7aca0',10),rect(-40,-30,80,72,'#ded5c8',8),rect(-48,-48,96,17,'#a4998c')];
    case 'toilet':return [rect(-45,-50,90,30,'#efefeb',5),ellipse(0,10,38,39,'#f9f9f6'),ellipse(0,10,23,26,'#e2e9e7')];
    case 'sink':return [rect(-50,-50,100,100,'#dedbd2'),ellipse(0,5,38,35,'#f9faf7'),ellipse(0,-35,5,5,'#9fa9a6')];
    case 'shower':return [rect(-50,-50,100,100,'#e6edeb'),rect(-44,-44,88,88,'#f5f8f5'),ellipse(0,0,6,6,'#aeb9b5')];
  }
}
/** 将用户设置的颜色应用于家具轮廓，保留内部细节。 */
export function furnitureGlyph(kind:FurnitureKind,color?:string):Shape[] {const shapes=baseFurnitureGlyph(kind);if(color && shapes[0])shapes[0]={...shapes[0],attrs:{...shapes[0].attrs,fill:color}};return shapes;}
/** 将固定符号图元转换成可导出的 SVG 内容。 */
export function furnitureGlyphSvg(kind:FurnitureKind,color?:string):string {return furnitureGlyph(kind,color).map(shape=>{const attrs=Object.entries(shape.attrs).map(([key,value])=>`${key.replace(/[A-Z]/g,letter=>'-'+letter.toLowerCase())}="${value}"`).join(' ');return `<${shape.tag} ${attrs}/>`}).join('');}
