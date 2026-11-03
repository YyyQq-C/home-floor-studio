import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {unzipSync,strFromU8,strToU8} from 'fflate';

const root=resolve('dist'),testUrl=new URL(process.env.HFS_E2E_URL||'https://studio.test/floor-studio/'),origin=testUrl.origin,prefix=testUrl.pathname.endsWith('/')?testUrl.pathname:`${testUrl.pathname}/`;
const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+XgE0AAAAASUVORK5CYII=','base64');
/** 在虚拟同源子目录提供构建产物，避免依赖测试机器可监听本地端口。 */
async function serveBuild(route){const url=new URL(route.request().url());if(!url.pathname.startsWith(prefix))return route.fulfill({status:404});const name=url.pathname.slice(prefix.length)||'index.html',file=resolve(root,name);if(!file.startsWith(root+sep))return route.fulfill({status:403});try{const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.txt':'text/plain'},body=await readFile(file);return route.fulfill({status:200,contentType:types[extname(file)]||'application/octet-stream',body})}catch(error){console.error('Failed to serve test artifact',error);return route.fulfill({status:404})}}
/** 未指定实际服务时使用隔离的虚拟地址；指定后直接访问目标服务。 */
async function configureBuild(page){if(!process.env.HFS_E2E_URL)await page.route(`${origin}/**`,serveBuild)}
/** 将画布坐标转换为当前浏览器中的点击位置。 */
async function canvasPoint(svg,x,y){return svg.evaluate((element,point)=>{const matrix=element.getScreenCTM();return{x:matrix.a*point.x+matrix.c*point.y+matrix.e,y:matrix.b*point.x+matrix.d*point.y+matrix.f}},{x,y})}
/** 点击导出并读取浏览器下载的文件。 */
async function download(page,name){const [file]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name,exact:true}).click()]);return readFile(await file.path())}

test('从底图经模拟 AI 到 2D、3D 和 HA 安装包',async({page})=>{
  const failures=[];page.on('pageerror',error=>failures.push(error.message));page.on('dialog',dialog=>dialog.accept());
  await configureBuild(page);
  // 模拟结果只包含墙体，后续由用户主动生成房间。
  await page.route(`${origin}/vision`,route=>route.fulfill({json:{choices:[{message:{content:JSON.stringify({walls:[{start:{x:100,y:100},end:{x:900,y:100}},{start:{x:900,y:100},end:{x:900,y:900}},{start:{x:900,y:900},end:{x:100,y:900}},{start:{x:100,y:900},end:{x:100,y:100}}],rooms:[],openings:[]})}}]}}));
  await page.goto(`${origin}${prefix}`);await expect(page).toHaveTitle('Home Floor Studio');
  await page.locator('.getting-started summary').click();await expect(page.locator('.getting-started')).toContainText('上传 PNG / JPG 户型图');
  const licenseInfo=await page.evaluate(async()=>{const entries=await(await fetch('./licenses/third-party.json')).json(),texts=await Promise.all(entries.map(entry=>fetch(`./licenses/${entry.file}`).then(response=>response.text()))),projectLicense=await(await fetch('./licenses/HOME-FLOOR-STUDIO-LICENSE.txt')).text();return{entries,texts,projectLicense}});expect(licenseInfo.entries.map(entry=>entry.name)).toEqual(expect.arrayContaining(['react','react-dom','scheduler','three','fflate','lucide-react']));expect(licenseInfo.texts.every(text=>text.includes('Copyright'))).toBe(true);expect(licenseInfo.projectLicense).toContain('非商业');
  await page.locator('input[type=file]').first().setInputFiles({name:'plan.png',mimeType:'image/png',buffer:pixel});
  await expect(page.getByText('底图已导入，请检查结构对齐并校准比例')).toBeVisible();
  await expect(page.locator('.getting-started')).toContainText('已上传参考底图');
  await page.locator('.recognition summary').click();await page.getByLabel('服务完整地址').fill(`${origin}/vision`);await page.getByLabel('视觉模型名称').fill('mock-vision');await page.getByRole('button',{name:'发送图片并识别'}).click();
  await expect(page.getByText(/识别到 4 面墙/)).toBeVisible();await page.getByRole('button',{name:'追加候选'}).click();
  await expect(page.locator('.getting-started')).toContainText('当前 4 面墙');
  await page.getByRole('button',{name:'房间',exact:true}).click();await page.getByRole('button',{name:'从墙体生成房间'}).click();await expect(page.getByText(/已生成 1 个房间/)).toBeVisible();
  await page.getByRole('button',{name:'选择',exact:true}).click();const svg=page.locator('svg[aria-label="户型编辑画布"]'),wall=await canvasPoint(svg,400,60);await page.mouse.click(wall.x,wall.y);await page.getByLabel('已知墙长 (cm)').fill('480');await page.getByRole('button',{name:'校准比例'}).click();await expect(page.getByText(/已校准 ·/)).toBeVisible();
  await page.getByRole('button',{name:'设备',exact:true}).click();const marker=await canvasPoint(svg,400,300);await page.mouse.click(marker.x,marker.y);await expect(page.getByLabel('设备标记 新设备')).toBeVisible();await page.getByRole('button',{name:'选择',exact:true}).click();await page.getByLabel('设备标记 新设备').click();await page.getByLabel('设备图标').selectOption('light');await expect(page.getByLabel('设备标记 新设备')).toContainText('☼');
  await expect(page.locator('footer')).toContainText('已保存');await page.reload();await expect(page.getByLabel('设备标记 新设备')).toBeVisible();await expect(page.getByText(/已校准 ·/)).toBeVisible();
  const image=await download(page,'导出 PNG');expect(image.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
  // 验证透明背景的真实 PNG 像素，而非仅检查文件头。
  await page.getByLabel('成图使用透明背景').check();const transparent=await download(page,'导出 PNG');const alpha=await page.evaluate(async base64=>{const image=new Image();image.src=`data:image/png;base64,${base64}`;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const context=canvas.getContext('2d');context.drawImage(image,0,0);return [context.getImageData(0,0,1,1).data[3],context.getImageData(600,400,1,1).data[3]]},transparent.toString('base64'));expect(alpha).toEqual([0,255]);
  const model=await download(page,'导出 GLB');expect(model.subarray(0,4).toString()).toBe('glTF');const jsonLength=model.readUInt32LE(12),gltf=JSON.parse(model.subarray(20,20+jsonLength).toString().trim());expect(gltf.nodes.some(node=>node.name?.startsWith('room-'))).toBe(true);expect(gltf.meshes.length).toBeGreaterThan(1);
  const archive=unzipSync(await download(page,'导出 HA 安装包')),ha=JSON.parse(strFromU8(archive['www/home-floor-studio/home-floor-ha.json']));expect(ha.project.background).toBeNull();expect(ha.project.walls).toHaveLength(4);expect(ha.project.rooms).toHaveLength(1);expect(ha.project.markers).toHaveLength(1);expect(ha.project.markers[0].icon).toBe('light');expect(archive['www/home-floor-studio/home-floor-studio-card.js'].length).toBeGreaterThan(1000);
  const bundle=unzipSync(await download(page,'导出完整项目包')),bundleProject=JSON.parse(strFromU8(bundle['project/home-floor-studio.json'])),nestedHa=unzipSync(bundle['home-assistant/home-floor-studio-ha.zip']);expect(bundleProject.walls).toHaveLength(4);expect(strFromU8(bundle['2d/home-floor-studio.svg'])).toContain('<svg');expect(Buffer.from(bundle['2d/home-floor-studio.png'].subarray(0,8)).toString('hex')).toBe('89504e470d0a1a0a');expect(Buffer.from(bundle['3d/home-floor-studio.glb'].subarray(0,4)).toString()).toBe('glTF');expect(nestedHa['www/home-floor-studio/home-floor-studio-card.js'].length).toBeGreaterThan(1000);expect(strFromU8(bundle['README.txt'])).toContain('导入项目');
  // 用打包后的实际脚本和户型模拟 HA，检查标记状态及详情事件。
  await page.route(`${origin}/local/home-floor-studio/**`,route=>{const name=new URL(route.request().url()).pathname.split('/').pop(),data=archive[`www/home-floor-studio/${name}`];return data?route.fulfill({status:200,contentType:name.endsWith('.js')?'text/javascript':'application/json',body:Buffer.from(data)}):route.fulfill({status:404})});
  await page.addScriptTag({url:`${origin}/local/home-floor-studio/home-floor-studio-card.js`,type:'module'});await page.evaluate(async markerId=>{await customElements.whenDefined('home-floor-studio-card');const card=document.createElement('home-floor-studio-card');document.body.append(card);card.setConfig({project_url:'/local/home-floor-studio/home-floor-ha.json',entities:{[markerId]:'light.test'}});card.hass={states:{'light.test':{state:'on'}}};window.testEntity=null;card.addEventListener('hass-more-info',event=>{window.testEntity=event.detail.entityId})},ha.project.markers[0].id);
  await expect(page.locator('home-floor-studio-card').getByRole('button',{name:'新设备：on'})).toHaveText('☼');
  await page.locator('home-floor-studio-card').getByRole('button',{name:'新设备：on'}).click();expect(await page.evaluate(()=>window.testEntity)).toBe('light.test');
  // 在真实 WebGL 场景中旋转，再验证标记投影回到初始位置。
  await page.locator('home-floor-studio-card').getByRole('button',{name:'3D 模型'}).click();const card=page.locator('home-floor-studio-card'),marker3d=card.getByRole('button',{name:'新设备：on'}),canvas3d=card.locator('canvas');await expect(canvas3d).toBeVisible();await expect(marker3d).toBeVisible();await expect.poll(async()=>marker3d.evaluate(element=>parseFloat(element.style.top))).not.toBe(50);
  const initial=await marker3d.evaluate(element=>({x:parseFloat(element.style.left),y:parseFloat(element.style.top)}));const box=await canvas3d.boundingBox();await page.mouse.move(box.x+box.width*.2,box.y+box.height*.2);await page.mouse.down();await page.mouse.move(box.x+box.width*.4,box.y+box.height*.3,{steps:8});await page.mouse.up();await expect.poll(async()=>marker3d.evaluate(element=>parseFloat(element.style.top))).not.toBeCloseTo(initial.y,1);
  await card.getByRole('button',{name:'复位 3D 视角'}).click();await expect.poll(async()=>marker3d.evaluate((element,x)=>Math.abs(parseFloat(element.style.left)-x),initial.x)).toBeLessThan(.5);await expect.poll(async()=>marker3d.evaluate((element,y)=>Math.abs(parseFloat(element.style.top)-y),initial.y)).toBeLessThan(.5);await card.getByRole('button',{name:'2D 平面'}).click();
  // 可视化编辑器只在明确选择后保存开关操作，并由模拟 HA 记录调用。
  await page.evaluate(async markerId=>{const editor=document.createElement('home-floor-studio-editor');document.body.append(editor);editor.setConfig({type:'custom:home-floor-studio-card',project_url:'/local/home-floor-studio/home-floor-ha.json',entities:{[markerId]:'light.test'}});editor.hass={states:{'light.test':{state:'on'}}};editor.addEventListener('config-changed',event=>window.actionConfig=event.detail.config)},ha.project.markers[0].id);
  await page.locator('home-floor-studio-editor').getByLabel('新设备 点击操作').selectOption('toggle');
  expect(await page.evaluate(markerId=>window.actionConfig.actions[markerId],ha.project.markers[0].id)).toBe('toggle');
  // 更新户型名称但保留标记 ID，重新加载后验证已有绑定与点击操作。
  ha.project.markers[0].name='更新后的设备';archive['www/home-floor-studio/home-floor-ha.json']=strToU8(JSON.stringify(ha));await page.locator('home-floor-studio-editor').getByRole('button',{name:'重新加载户型'}).click();await expect(page.locator('home-floor-studio-editor').getByLabel('更新后的设备 实体')).toHaveValue('light.test');await expect(page.locator('home-floor-studio-editor').getByLabel('更新后的设备 点击操作')).toHaveValue('toggle');
  ha.project.markers[0].name='新设备';archive['www/home-floor-studio/home-floor-ha.json']=strToU8(JSON.stringify(ha));

  await page.evaluate(()=>{const card=document.querySelector('home-floor-studio-card');window.calls=[];card.hass={states:{'light.test':{state:'on'}},callService:async(...args)=>window.calls.push(args)};card.setConfig(window.actionConfig)});
  await page.locator('home-floor-studio-card').getByRole('button',{name:'新设备：on'}).click();expect(await page.evaluate(()=>window.calls)).toEqual([['light','toggle',{entity_id:'light.test'}]]);
  await page.evaluate(()=>{const card=document.querySelector('home-floor-studio-card');card.hass={states:{'light.test':{state:'unavailable'}},callService:async(...args)=>window.calls.push(args)}});await expect(page.locator('home-floor-studio-card').getByRole('button',{name:'新设备：不可用'})).toBeDisabled();expect(await page.evaluate(()=>window.calls.length)).toBe(1);
  await page.evaluate(()=>{const card=document.querySelector('home-floor-studio-card');card.hass={states:{'sensor.test':{state:'on'}},callService:async(...args)=>window.calls.push(args)};card.setConfig({...window.actionConfig,entities:{[Object.keys(window.actionConfig.actions)[0]]:'sensor.test'}})});await page.locator('home-floor-studio-card').getByRole('button',{name:'新设备：on'}).click();await expect(page.locator('home-floor-studio-card').getByRole('status')).toContainText('不支持');expect(await page.evaluate(()=>window.calls.length)).toBe(1);
  // 模拟服务拒绝，检查错误提示和后续重试可用。
  await page.evaluate(()=>{const card=document.querySelector('home-floor-studio-card');card.hass={states:{'light.test':{state:'on'}},callService:async()=>{throw new Error('Simulated service failure')}};card.setConfig(window.actionConfig)});await page.locator('home-floor-studio-card').getByRole('button',{name:'新设备：on'}).click();await expect(page.locator('home-floor-studio-card').getByRole('status')).toContainText('操作失败');await expect(page.locator('home-floor-studio-card').getByRole('button',{name:'新设备：on'})).toBeEnabled();
  expect(failures).toEqual([]);
});

test('不同屏幕宽度下顶部操作保持可访问',async({page})=>{
  await configureBuild(page);await page.goto(`${origin}${prefix}`);
  for(const width of [390,901,1024,1280,1366,1440]){await page.setViewportSize({width,height:768});const last=page.getByRole('button',{name:'导出 HA 安装包'});await last.scrollIntoViewIfNeeded();const bounds=await last.evaluate(element=>{const rect=element.getBoundingClientRect(),header=element.closest('header').getBoundingClientRect();return{top:rect.top,bottom:rect.bottom,left:rect.left,right:rect.right,headerTop:header.top,headerBottom:header.bottom,documentWidth:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}});expect(bounds.top).toBeGreaterThanOrEqual(bounds.headerTop);expect(bounds.bottom).toBeLessThanOrEqual(bounds.headerBottom);expect(bounds.left).toBeGreaterThanOrEqual(0);expect(bounds.right).toBeLessThanOrEqual(width);expect(bounds.documentWidth).toBeLessThanOrEqual(bounds.viewport);if(width>=1280){const actions=await page.locator('.actions').evaluate(element=>({scrollWidth:element.scrollWidth,clientWidth:element.clientWidth}));expect(actions.scrollWidth).toBeLessThanOrEqual(actions.clientWidth)}const fits=await page.locator('.canvas-bar').evaluate(bar=>{const container=bar.getBoundingClientRect();return [...bar.querySelectorAll('button')].every(button=>{const rect=button.getBoundingClientRect();return rect.top>=container.top&&rect.bottom<=container.bottom&&rect.left>=container.left&&rect.right<=container.right})});expect(fits).toBe(true)}
});

test('手工绘墙可选择正交并在落点前预览',async({page})=>{
  await configureBuild(page);await page.goto(`${origin}${prefix}`);await page.getByRole('button',{name:'墙体',exact:true}).click();await page.getByLabel('正交绘制（水平或垂直）').check();
  const svg=page.locator('svg[aria-label="户型编辑画布"]'),start=await canvasPoint(svg,100,100),end=await canvasPoint(svg,300,130);await page.mouse.click(start.x,start.y);await page.mouse.move(end.x,end.y);
  const preview=page.getByLabel('墙体绘制预览');await expect(preview).toHaveAttribute('y1','100');await expect(preview).toHaveAttribute('y2','100');await page.mouse.click(end.x,end.y);await expect(preview).toHaveCount(0);
  await page.getByLabel('正交绘制（水平或垂直）').uncheck();const start2=await canvasPoint(svg,400,200),end2=await canvasPoint(svg,500,250);await page.mouse.click(start2.x,start2.y);await page.mouse.move(end2.x,end2.y);await expect(preview).toHaveAttribute('y2','250');await page.mouse.click(end2.x,end2.y);
  const project=JSON.parse((await download(page,'导出项目')).toString());expect(project.walls).toHaveLength(2);expect(project.walls[0].start).toEqual({x:100,y:100});expect(project.walls[0].end).toEqual({x:300,y:100});expect(project.walls[1].end).toEqual({x:500,y:250});
});

test('本地记录损坏后可导出原始记录并从备份恢复',async({page})=>{
  await configureBuild(page);await page.goto(`${origin}${prefix}`);await expect(page.getByRole('button',{name:'新建空白'})).toBeVisible();
  const broken={format:'hfs-storage-v1',revision:'broken',project:{version:999,name:'旧记录'}};await page.evaluate(value=>new Promise((resolve,reject)=>{const request=indexedDB.open('home-floor-studio');request.onsuccess=()=>{const tx=request.result.transaction('projects','readwrite');tx.objectStore('projects').put(value,'current');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)}}),broken);await page.reload();
  await expect(page.getByRole('heading',{name:'无法读取本地项目'})).toBeVisible();for(const width of [390,1024]){await page.setViewportSize({width,height:768});const size=await page.locator('.load-state>div').evaluate(element=>({width:element.getBoundingClientRect().width,viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));expect(size.width).toBeGreaterThan(200);expect(size.scroll).toBeLessThanOrEqual(size.viewport)}const raw=JSON.parse((await download(page,'导出原始记录')).toString());expect(raw.current).toEqual(broken);
  const file=page.locator('input[type=file]');await file.setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{broken')});await expect(page.getByRole('status')).toContainText('恢复失败');
  page.on('dialog',dialog=>dialog.accept());const project={version:1,name:'恢复后的户型',walls:[],openings:[],rooms:[],furniture:[],markers:[],background:null,cmPerUnit:null};await file.setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});await expect(page.locator('input.full').last()).toHaveValue('恢复后的户型');
  const values=await page.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('home-floor-studio');request.onsuccess=()=>{const tx=request.result.transaction('projects','readonly'),all=tx.objectStore('projects').getAll();all.onsuccess=()=>resolve(all.result);all.onerror=()=>reject(all.error)}}));expect(values.some(value=>value.format==='hfs-recovery-backup-v1'&&JSON.stringify(value.current)===JSON.stringify(broken))).toBe(true);await page.reload();await expect(page.locator('input.full').last()).toHaveValue('恢复后的户型');
});

test('编辑墙面和家具颜色后导出并恢复',async({page})=>{
  await configureBuild(page);page.on('dialog',dialog=>dialog.accept());await page.goto(testUrl.href);
  await page.getByRole('button',{name:'加载示例'}).click();
  const canvas=page.locator('svg[aria-label="户型编辑画布"]');const wall=await canvasPoint(canvas,500,100);await page.mouse.click(wall.x,wall.y);
  await page.getByLabel('墙面颜色').fill('#3377aa');
  await page.getByLabel('家具 床').click();await page.getByLabel('家具颜色').fill('#bb6644');
  const svg=(await download(page,'导出 2D')).toString();expect(svg).toContain('stroke="#3377aa"');expect(svg).toContain('fill="#bb6644"');
  const ha=JSON.parse((await download(page,'导出 HA 户型')).toString());expect(ha.project.walls[0].color).toBe('#3377aa');expect(ha.project.furniture.find(item=>item.kind==='bed').color).toBe('#bb6644');
  await expect(page.locator('footer')).toContainText('已保存');await page.reload();await page.getByLabel('家具 床').click();await expect(page.getByLabel('家具颜色')).toHaveValue('#bb6644');
});

test('设备房间和离地高度可编辑并随 HA 项目保存',async({page})=>{
  await configureBuild(page);page.on('dialog',dialog=>dialog.accept());await page.goto(testUrl.href);await page.getByRole('button',{name:'加载示例'}).click();
  await page.getByLabel('设备标记 示例灯光').click();await page.getByLabel('所属房间').selectOption('demo-room-living');await page.getByLabel('离地高度 (cm)').fill('180');
  const ha=JSON.parse((await download(page,'导出 HA 户型')).toString());expect(ha.project.markers[0]).toMatchObject({roomId:'demo-room-living',height:180});
  await expect(page.locator('footer')).toContainText('已保存');await page.reload();await page.getByLabel('设备标记 示例灯光').click();await expect(page.getByLabel('所属房间')).toHaveValue('demo-room-living');await expect(page.getByLabel('离地高度 (cm)')).toHaveValue('180');
});


test('编辑器 3D 预览提供复位视角',async({page})=>{await configureBuild(page);page.on('dialog',dialog=>dialog.accept());await page.goto(testUrl.href);await page.getByRole('button',{name:'加载示例'}).click();await page.getByRole('button',{name:'3D 预览'}).click();await expect(page.locator('.model-preview canvas')).toBeVisible();await page.getByRole('button',{name:'复位 3D 视角'}).click();});

test('反复切换 2D 与 3D 时释放画布并保留项目',async({page})=>{
  const failures=[];page.on('pageerror',error=>failures.push(error.message));page.on('dialog',dialog=>dialog.accept());
  await configureBuild(page);await page.goto(testUrl.href);await page.getByRole('button',{name:'加载示例'}).click();
  for(let index=0;index<12;index++){
    await page.getByRole('button',{name:'3D 预览'}).click();await expect(page.locator('.model-preview canvas')).toHaveCount(1);
    await page.getByRole('button',{name:'2D 编辑'}).click();await expect(page.locator('.model-preview canvas')).toHaveCount(0);
  }
  await expect(page.locator('footer')).toContainText('已保存');expect(failures).toEqual([]);
});

test('添加电视柜和厨房地柜并导出可编辑项目及模型',async({page})=>{
  await configureBuild(page);page.on('dialog',dialog=>dialog.accept());await page.goto(testUrl.href);await page.getByRole('button',{name:'加载示例'}).click();
  const svg=page.locator('svg[aria-label="户型编辑画布"]');
  for(const [kind,x,y] of [['tv-cabinet',500,200],['kitchen-counter',550,400]]){await page.getByRole('button',{name:'家具',exact:true}).click();await page.getByLabel('家具类型').selectOption(kind);const point=await canvasPoint(svg,x,y);await page.mouse.click(point.x,point.y)}
  await expect(page.getByLabel('家具 电视柜')).toHaveCount(2);await expect(page.getByLabel('家具 厨房地柜')).toBeVisible();
  const project=JSON.parse((await download(page,'导出项目')).toString());for(const kind of ['tv-cabinet','kitchen-counter'])expect(project.furniture.some(item=>item.kind===kind)).toBe(true);
  const ha=JSON.parse((await download(page,'导出 HA 户型')).toString());for(const kind of ['tv-cabinet','kitchen-counter'])expect(ha.project.furniture.some(item=>item.kind===kind)).toBe(true);
  const glb=await download(page,'导出 GLB');const length=glb.readUInt32LE(12),gltf=JSON.parse(glb.subarray(20,20+length).toString().trim());for(const item of project.furniture.filter(item=>['tv-cabinet','kitchen-counter'].includes(item.kind)))expect(gltf.nodes.some(node=>node.name===item.id)).toBe(true);
});

test('识别失败提供可操作提示且不显示服务响应',async({page})=>{
  await configureBuild(page);await page.route(`${origin}/vision-error`,route=>route.fulfill({status:401,body:'private provider response'}));await page.goto(testUrl.href);await page.locator('input[type=file]').first().setInputFiles({name:'plan.png',mimeType:'image/png',buffer:pixel});await page.locator('.recognition summary').click();await page.getByLabel('服务完整地址').fill(`${origin}/vision-error`);await page.getByLabel('视觉模型名称').fill('mock');await page.getByLabel('API 密钥（可选）').fill('private-key');await page.getByRole('button',{name:'发送图片并识别'}).click();await expect(page.locator('.recognition [role=status]')).toContainText('认证失败');await expect(page.locator('.recognition [role=status]')).not.toContainText('private provider response');await expect(page.locator('.recognition [role=status]')).not.toContainText('private-key');
});

test('替换识别候选需确认，取消保留候选并可撤销替换',async({page})=>{
  await configureBuild(page);let accept=true;page.on('dialog',dialog=>accept?dialog.accept():dialog.dismiss());await page.route(`${origin}/vision-replace`,route=>route.fulfill({json:{choices:[{message:{content:JSON.stringify({walls:[{start:{x:0,y:200},end:{x:1000,y:200}}],rooms:[],openings:[]})}}]}}));
  await page.goto(testUrl.href);await page.getByRole('button',{name:'加载示例'}).click();await page.locator('input[type=file]').first().setInputFiles({name:'plan.png',mimeType:'image/png',buffer:pixel});await page.locator('.recognition summary').click();await page.getByLabel('服务完整地址').fill(`${origin}/vision-replace`);await page.getByLabel('视觉模型名称').fill('mock');await page.getByRole('button',{name:'发送图片并识别'}).click();await expect(page.getByText(/识别到 1 面墙/)).toBeVisible();
  const original=JSON.parse((await download(page,'导出项目')).toString());accept=false;await page.getByRole('button',{name:'替换墙体和房间'}).click();await expect(page.getByRole('button',{name:'替换墙体和房间'})).toBeVisible();let current=JSON.parse((await download(page,'导出项目')).toString());expect(current.walls).toEqual(original.walls);expect(current.rooms).toEqual(original.rooms);
  accept=true;await page.getByRole('button',{name:'替换墙体和房间'}).click();current=JSON.parse((await download(page,'导出项目')).toString());expect(current.walls).toHaveLength(1);expect(current.rooms).toHaveLength(0);expect(current.markers).toEqual(original.markers);expect(current.furniture).toEqual(original.furniture);
  await page.getByRole('button',{name:'撤销',exact:true}).click();current=JSON.parse((await download(page,'导出项目')).toString());expect(current.walls).toEqual(original.walls);expect(current.rooms).toEqual(original.rooms);
});

test('房间删除后检查设备关联并可定位修复',async({page})=>{
  await configureBuild(page);page.on('dialog',dialog=>dialog.accept());await page.goto(testUrl.href);await page.getByRole('button',{name:'加载示例'}).click();await page.getByLabel('设备标记 示例灯光').click();await page.getByLabel('所属房间').selectOption('demo-room-living');
  await page.getByLabel('房间 客厅').click({position:{x:20,y:20}});await page.getByRole('button',{name:'删除房间'}).click();await page.getByRole('button',{name:'检查户型'}).click();const issue=page.locator('.diagnostic-item').filter({hasText:'关联的房间已删除'});await expect(issue).toBeVisible();await issue.getByRole('button',{name:'查看对象'}).click();await expect(page.getByLabel('所属房间')).toHaveValue('demo-room-living');await page.getByLabel('所属房间').selectOption('demo-room-bedroom');await expect(issue).toHaveCount(0);
});

test('PNG 可按所选分辨率导出并保持比例',async({page})=>{
  await configureBuild(page);page.on('dialog',dialog=>dialog.accept());await page.goto(testUrl.href);await page.getByRole('button',{name:'加载示例'}).click();
  for(const size of [1600,2400,3200]){await page.getByLabel('PNG 最长边').selectOption(String(size));const png=await download(page,'导出 PNG');const width=png.readUInt32BE(16),height=png.readUInt32BE(20);expect(Math.max(width,height)).toBe(size);expect(width/height).toBeCloseTo(4/3,2)}
});

test('手机宽度可以绘墙、放置家具并编辑属性',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const page=await context.newPage();await configureBuild(page);await page.goto(testUrl.href);
  const svg=page.locator('svg[aria-label="户型编辑画布"]');await page.getByRole('button',{name:'墙体',exact:true}).click();await svg.scrollIntoViewIfNeeded();let point=await canvasPoint(svg,200,150);await page.touchscreen.tap(point.x,point.y);point=await canvasPoint(svg,600,150);await page.touchscreen.tap(point.x,point.y);
  await page.getByRole('button',{name:'选择',exact:true}).click();point=await canvasPoint(svg,400,150);await page.touchscreen.tap(point.x,point.y);await expect(page.getByText('墙体属性')).toBeVisible();await page.getByLabel('墙面颜色').fill('#336699');
  await page.getByRole('button',{name:'家具',exact:true}).click();await page.getByLabel('家具类型').selectOption('tv-cabinet');await svg.scrollIntoViewIfNeeded();point=await canvasPoint(svg,400,350);await page.touchscreen.tap(point.x,point.y);await expect(page.getByLabel('家具 电视柜')).toBeVisible();await expect(page.getByText('家具属性')).toBeVisible();await page.getByLabel('家具颜色').fill('#aabbcc');
  const project=JSON.parse((await download(page,'导出项目')).toString());expect(project.walls[0].color).toBe('#336699');expect(project.furniture[0]).toMatchObject({kind:'tv-cabinet',color:'#aabbcc'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);await context.close();
});

test('墙面光泽在编辑器、HA 户型和 GLB 中保留',async({page})=>{
  await configureBuild(page);page.on('dialog',dialog=>dialog.accept());await page.goto(testUrl.href);await page.getByRole('button',{name:'加载示例'}).click();const svg=page.locator('svg[aria-label="户型编辑画布"]');const point=await canvasPoint(svg,500,100);await page.mouse.click(point.x,point.y);await page.getByLabel('墙面光泽').selectOption('gloss');
  const ha=JSON.parse((await download(page,'导出 HA 户型')).toString());expect(ha.project.walls[0].finish).toBe('gloss');const glb=await download(page,'导出 GLB');const length=glb.readUInt32LE(12),gltf=JSON.parse(glb.subarray(20,20+length).toString().trim());const wall=gltf.nodes.find(node=>node.name==='wall-0-0'),material=gltf.materials[gltf.meshes[wall.mesh].primitives[0].material];expect(material.pbrMetallicRoughness.roughnessFactor).toBeCloseTo(.2);
});

for(const specimen of [
  {name:'横向矩形',width:1200,height:800,points:[[100,150],[900,150],[900,850],[100,850]]},
  {name:'纵向矩形',width:800,height:1200,points:[[150,100],[850,100],[850,900],[150,900]]},
  {name:'方形异形',width:1000,height:1000,points:[[100,100],[900,100],[900,500],[500,500],[500,900],[100,900]]},
])test(`模拟识别 ${specimen.name} 底图并导出`,async({page})=>{
  await configureBuild(page);const points=specimen.points.map(([x,y])=>({x,y}));const walls=points.map((start,index)=>({start,end:points[(index+1)%points.length]}));
  await page.route(`${origin}/vision-case`,route=>route.fulfill({json:{choices:[{message:{content:JSON.stringify({walls,rooms:[{name:'测试房间',points}],openings:[]})}}]}}));await page.goto(testUrl.href);
  // 绘制本地合成线稿；服务响应为预设候选，不代表真实 AI 识别质量。
  const data=await page.evaluate(({width,height,points})=>{const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.strokeStyle='#111';ctx.lineWidth=12;ctx.beginPath();points.forEach(([x,y],index)=>index?ctx.lineTo(x*width/1000,y*height/1000):ctx.moveTo(x*width/1000,y*height/1000));ctx.closePath();ctx.stroke();return c.toDataURL('image/png').split(',')[1]},specimen);
  await page.locator('input[type=file]').first().setInputFiles({name:'synthetic-plan.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')});await expect(page.locator('footer')).toContainText('底图已导入');await page.locator('.recognition summary').click();await page.getByLabel('服务完整地址').fill(`${origin}/vision-case`);await page.getByLabel('视觉模型名称').fill('mock');await page.getByRole('button',{name:'发送图片并识别'}).click();await expect(page.getByText(new RegExp(`识别到 ${walls.length} 面墙、1 个房间`))).toBeVisible();await page.getByRole('button',{name:'追加候选'}).click();
  const project=JSON.parse((await download(page,'导出项目')).toString()),scale=Math.min(800/specimen.width,600/specimen.height),offsetX=(800-specimen.width*scale)/2,offsetY=(600-specimen.height*scale)/2;expect(project.walls).toHaveLength(walls.length);expect(project.rooms).toHaveLength(1);expect(project.walls[0].start.x).toBeCloseTo(offsetX+points[0].x/1000*specimen.width*scale);expect(project.walls[0].start.y).toBeCloseTo(offsetY+points[0].y/1000*specimen.height*scale);
  const svg=(await download(page,'导出 2D')).toString();expect(svg).toContain('测试房间');const glb=await download(page,'导出 GLB');expect(glb.subarray(0,4).toString()).toBe('glTF');const ha=JSON.parse((await download(page,'导出 HA 户型')).toString());expect(ha.project.rooms[0].points).toEqual(project.rooms[0].points);expect(ha.project.background).toBeNull();
});

test('HA 卡片加载户型失败后可主动重试',async({page})=>{
  await configureBuild(page);let attempts=0;const project={format:'home-floor-studio',version:1,project:{version:1,name:'重试户型',cmPerUnit:null,background:null,walls:[],rooms:[],openings:[],furniture:[],markers:[]}};
  await page.route(`${origin}/local/home-floor-studio/retry.json`,route=>{attempts++;return attempts===1?route.fulfill({status:503}):route.fulfill({json:project})});await page.goto(testUrl.href);await page.addScriptTag({url:`${origin}${prefix}ha-release/home-floor-studio-card.js`,type:'module'});
  await page.evaluate(async()=>{await customElements.whenDefined('home-floor-studio-card');const card=document.createElement('home-floor-studio-card');document.body.append(card);card.setConfig({project_url:'/local/home-floor-studio/retry.json'})});const card=page.locator('home-floor-studio-card');await expect(card.getByText('户型加载失败，请检查文件路径和格式')).toBeVisible();await card.getByRole('button',{name:'重新加载户型'}).click();await expect(card.getByRole('heading',{name:'重试户型'})).toBeVisible();await expect(card.getByRole('button',{name:'2D 平面'})).toBeVisible();expect(attempts).toBe(2);
});

test('跨标签页保存冲突时离开前触发保护',async({page,context})=>{
  await configureBuild(page);await page.goto(testUrl.href);await page.getByLabel('项目名称').fill('初始项目');await expect(page.locator('footer')).toContainText('已保存');const other=await context.newPage();await configureBuild(other);await other.goto(testUrl.href);await expect(other.getByLabel('项目名称')).toHaveValue('初始项目');
  await page.getByLabel('项目名称').fill('第一页修改');await expect(page.locator('footer')).toContainText('已保存');await other.getByLabel('项目名称').fill('第二页修改');await expect(other.locator('footer')).toContainText('保存冲突');
  const blocked=await other.evaluate(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented});expect(blocked).toBe(true);const saved=await page.evaluate(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented});expect(saved).toBe(false);
});

test('编辑器 3D 预览显示设备并反映离地高度',async({page})=>{
  await configureBuild(page);page.on('dialog',dialog=>dialog.accept());await page.goto(testUrl.href);await page.getByRole('button',{name:'加载示例'}).click();await page.getByLabel('设备标记 示例灯光').click();await page.getByLabel('设备图标').selectOption('light');await page.getByLabel('离地高度 (cm)').fill('0');await page.getByRole('button',{name:'3D 预览'}).click();const marker=page.getByLabel('3D 设备 示例灯光');await expect(marker).toBeVisible();await expect(marker).toContainText('☼');await expect.poll(async()=>marker.evaluate(el=>parseFloat(el.style.top))).not.toBeNaN();const ground=await marker.evaluate(el=>parseFloat(el.style.top));
  await page.getByRole('button',{name:'2D 编辑'}).click();await page.getByLabel('设备标记 示例灯光').click();await page.getByLabel('离地高度 (cm)').fill('200');await page.getByRole('button',{name:'3D 预览'}).click();await expect(marker).toBeVisible();await expect.poll(async()=>marker.evaluate(el=>parseFloat(el.style.top))).toBeLessThan(ground-1);
});

test('新手可下载并上传合成示例底图',async({page})=>{
  await configureBuild(page);await page.goto(testUrl.href);await page.locator('.getting-started summary').click();
  for(const [name,width,height] of [['横向示例',1200,800],['纵向示例',800,1200],['异形示例',1000,1000]]){const link=page.getByRole('link',{name,exact:true});await expect(link).toHaveAttribute('download');let data;if(process.env.HFS_E2E_URL){const [file]=await Promise.all([page.waitForEvent('download'),link.click()]);data=await readFile(await file.path())}else{const encoded=await link.evaluate(async element=>{const response=await fetch(element.href);if(!response.ok)throw new Error('Sample unavailable');return Array.from(new Uint8Array(await response.arrayBuffer()))});data=Buffer.from(encoded)}expect(data.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');expect(data.readUInt32BE(16)).toBe(width);expect(data.readUInt32BE(20)).toBe(height);if(name==='异形示例'){await page.locator('input[type=file]').first().setInputFiles({name:'sample.png',mimeType:'image/png',buffer:data});await expect(page.locator('footer')).toContainText('底图已导入')}}
});

test('无需 AI：从示例底图描墙、添加门并生成房间与模型',async({page})=>{
  await configureBuild(page);await page.goto(testUrl.href);const image=await readFile(resolve('public/examples/landscape.png'));await page.locator('input[type=file]').first().setInputFiles({name:'sample.png',mimeType:'image/png',buffer:image});await expect(page.locator('footer')).toContainText('底图已导入');
  const canvas=page.locator('svg[aria-label="户型编辑画布"]'),points=[[80,113.333],[720,113.333],[720,486.667],[80,486.667]];await page.getByRole('button',{name:'墙体',exact:true}).click();for(let i=0;i<points.length;i++){for(const [x,y] of [points[i],points[(i+1)%points.length]]){const at=await canvasPoint(canvas,x,y);await page.mouse.click(at.x,at.y)}}await expect(page.locator('footer')).toContainText('4 面墙');
  await page.getByRole('button',{name:'选择',exact:true}).click();const wall=await canvasPoint(canvas,250,113.333);await page.mouse.click(wall.x,wall.y);await page.getByLabel('已知墙长 (cm)').fill('640');await page.getByRole('button',{name:'校准比例'}).click();await page.getByRole('button',{name:'添加门'}).click();
  await page.getByRole('button',{name:'房间',exact:true}).click();await page.getByRole('button',{name:'从墙体生成房间'}).click();await expect(page.getByText(/已生成 1 个房间/)).toBeVisible();
  const project=JSON.parse((await download(page,'导出项目')).toString());expect(project.walls).toHaveLength(4);expect(project.openings).toHaveLength(1);expect(project.rooms).toHaveLength(1);expect(project.cmPerUnit).toBeCloseTo(1,1);const svg=(await download(page,'导出 2D')).toString();expect(svg).toContain('data-opening="door"');const glb=await download(page,'导出 GLB');const length=glb.readUInt32LE(12),gltf=JSON.parse(glb.subarray(20,20+length).toString().trim());expect(gltf.nodes.some(node=>node.name?.startsWith('opening-'))).toBe(true);expect(gltf.nodes.some(node=>node.name?.startsWith('room-'))).toBe(true);
});

test('底图不透明度和房间透视只影响编辑画面',async({page})=>{
  await configureBuild(page);page.on('dialog',dialog=>dialog.accept());await page.goto(testUrl.href);await page.getByRole('button',{name:'加载示例'}).click();const data=await readFile(resolve('public/examples/landscape.png'));await page.locator('input[type=file]').first().setInputFiles({name:'sample.png',mimeType:'image/png',buffer:data});await expect(page.locator('footer')).toContainText('底图已导入');
  const canvas=page.locator('svg[aria-label="户型编辑画布"]'),image=canvas.locator('image'),room=page.getByLabel('房间 客厅').locator('polygon').first();await expect(image).toHaveAttribute('opacity','0.55');await page.getByLabel('底图不透明度').fill('80');await expect(image).toHaveAttribute('opacity','0.8');await page.getByLabel('透过房间查看底图').check();await expect(room).toHaveAttribute('fill-opacity','0.4');const svg=(await download(page,'导出 2D')).toString();expect(svg).not.toContain('<image');expect(svg).not.toContain('fill-opacity="0.4"');await page.getByLabel('透过房间查看底图').uncheck();await expect(room).toHaveAttribute('fill-opacity','1');
});

test('识别前图片解码期间取消不会发送请求或停留在识别中',async({page})=>{
  await configureBuild(page);let calls=0;await page.route(`${origin}/vision-cancel`,route=>{calls++;return route.fulfill({status:500})});await page.goto(testUrl.href);await page.locator('input[type=file]').first().setInputFiles({name:'plan.png',mimeType:'image/png',buffer:pixel});await expect(page.locator('footer')).toContainText('底图已导入');await page.locator('.recognition summary').click();await page.getByLabel('服务完整地址').fill(`${origin}/vision-cancel`);await page.getByLabel('视觉模型名称').fill('mock');
  await page.evaluate(()=>{const Native=window.Image,descriptor=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');window.Image=function(){const image=new Native();Object.defineProperty(image,'src',{set(value){setTimeout(()=>descriptor.set.call(image,value),1500)},get(){return descriptor.get.call(image)}});return image}});
  await page.getByRole('button',{name:'发送图片并识别'}).click();await page.getByRole('button',{name:'取消',exact:true}).click();await expect(page.locator('.recognition [role=status]')).toContainText('识别已取消');await expect(page.getByRole('button',{name:'发送图片并识别'})).toBeEnabled();expect(calls).toBe(0);
});

test('导入过大项目时保留当前户型并提示大小限制',async({page})=>{
  await configureBuild(page);page.on('dialog',dialog=>dialog.accept());await page.goto(testUrl.href);await page.getByRole('button',{name:'加载示例'}).click();await page.locator('label').filter({hasText:'导入项目'}).locator('input').setInputFiles({name:'large.json',mimeType:'application/json',buffer:Buffer.alloc(20*1024*1024+1,32)});await expect(page.locator('footer')).toContainText('不超过 20 MB');await expect(page.getByLabel('项目名称')).toHaveValue('示例户型');await expect(page.getByLabel('设备标记 示例灯光')).toBeVisible();
});

test('较早选择但较晚读取的项目不会覆盖新的导入',async({page})=>{
  await configureBuild(page);page.on('dialog',dialog=>dialog.accept());await page.addInitScript(()=>{const original=File.prototype.text;File.prototype.text=async function(){if(this.name==='slow.json')await new Promise(resolve=>setTimeout(resolve,1200));return original.call(this)}});await page.goto(testUrl.href);
  const blank={version:1,name:'old',cmPerUnit:null,background:null,walls:[],rooms:[],openings:[],furniture:[],markers:[]},input=page.locator('label').filter({hasText:'导入项目'}).locator('input');await input.setInputFiles({name:'slow.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(blank))});await input.setInputFiles({name:'fast.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...blank,name:'new'}))});await expect(page.getByLabel('项目名称')).toHaveValue('new');await page.waitForTimeout(1500);await expect(page.getByLabel('项目名称')).toHaveValue('new');
});

test('项目备份导出后重新导入保留设备标记 ID 与属性',async({page})=>{
  await configureBuild(page);page.on('dialog',dialog=>dialog.accept());await page.goto(testUrl.href);await page.getByRole('button',{name:'加载示例'}).click();await page.getByLabel('设备标记 示例灯光').click();await page.getByLabel('设备图标').selectOption('light');await page.getByLabel('所属房间').selectOption('demo-room-living');await page.getByLabel('离地高度 (cm)').fill('180');
  const saved=await download(page,'导出项目'),before=JSON.parse(saved.toString());await page.getByRole('button',{name:'新建空白'}).click();await expect(page.getByLabel('设备标记 示例灯光')).toHaveCount(0);await page.locator('label').filter({hasText:'导入项目'}).locator('input').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:saved});await expect(page.getByLabel('设备标记 示例灯光')).toBeVisible();const after=JSON.parse((await download(page,'导出 HA 户型')).toString());expect(after.project.markers).toEqual(before.markers);expect(after.project.markers[0]).toMatchObject({id:'demo-light',icon:'light',height:180,roomId:'demo-room-living'});
});

test('较复杂合成户型可预览并导出 GLB',async({page})=>{
  await configureBuild(page);page.on('dialog',dialog=>dialog.accept());await page.goto(testUrl.href);
  const project={version:1,name:'性能验证户型',cmPerUnit:1,background:null,walls:Array.from({length:80},(_,i)=>({id:`w-${i}`,start:{x:30+(i%10)*70,y:30+Math.floor(i/10)*65},end:{x:85+(i%10)*70,y:30+Math.floor(i/10)*65},height:280,thickness:12})),rooms:[],openings:[],furniture:Array.from({length:20},(_,i)=>({id:`f-${i}`,kind:'table',position:{x:70+(i%5)*140,y:80+Math.floor(i/5)*125},width:90,depth:50,height:75,rotation:0})),markers:Array.from({length:20},(_,i)=>({id:`m-${i}`,name:`设备${i}`,kind:'sensor',position:{x:70+(i%5)*140,y:70+Math.floor(i/5)*125},height:100}))};
  await page.locator('label').filter({hasText:'导入项目'}).locator('input').setInputFiles({name:'large-floor.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});await expect(page.locator('footer')).toContainText('80 面墙');await page.getByRole('button',{name:'3D 预览'}).click();await expect(page.locator('.model-preview canvas')).toBeVisible();await expect(page.locator('.preview-marker')).toHaveCount(20);
  const glb=await download(page,'导出 GLB');const length=glb.readUInt32LE(12),gltf=JSON.parse(glb.subarray(20,20+length).toString().trim());expect(gltf.nodes.filter(node=>/^w-\d+-0$/.test(node.name||''))).toHaveLength(80);expect(gltf.nodes.filter(node=>/^f-\d+$/.test(node.name||''))).toHaveLength(20);
});

test('导出的 GLB 可由独立 glTF 加载器读取且尺寸单位为米',async({page})=>{
  await configureBuild(page);page.on('dialog',dialog=>dialog.accept());await page.goto(testUrl.href);
  const project={version:1,name:'模型校验',cmPerUnit:1,background:null,walls:[{id:'wall',start:{x:0,y:0},end:{x:400,y:0},height:280,thickness:12}],openings:[],rooms:[{id:'room',name:'房间',color:'#eeeedd',floorStyle:'solid',points:[{x:0,y:0},{x:400,y:0},{x:400,y:300},{x:0,y:300}]}],furniture:[],markers:[]};await page.locator('label').filter({hasText:'导入项目'}).locator('input').setInputFiles({name:'floor.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});await expect(page.getByLabel('项目名称')).toHaveValue('模型校验');const binary=await download(page,'导出 GLB');
  const {GLTFLoader}=await import('three/examples/jsm/loaders/GLTFLoader.js'),THREE=await import('three');const data=binary.buffer.slice(binary.byteOffset,binary.byteOffset+binary.byteLength),gltf=await new GLTFLoader().parseAsync(data,'');gltf.scene.updateMatrixWorld(true);const size=new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3());expect(size.x).toBeCloseTo(4,2);expect(size.y).toBeCloseTo(2.8,2);expect(size.z).toBeCloseTo(3.06,2);expect(gltf.scene.getObjectByName('room-room')).toBeTruthy();
});

test('GLB 包含木地板和瓷砖纹理资源',async({page})=>{
  await configureBuild(page);page.on('dialog',dialog=>dialog.accept());await page.goto(testUrl.href);const project={version:1,name:'地面纹理',cmPerUnit:1,background:null,walls:[],openings:[],furniture:[],markers:[],rooms:[{id:'wood',name:'木地板',color:'#e8dfcf',floorStyle:'wood',points:[{x:0,y:0},{x:300,y:0},{x:300,y:300},{x:0,y:300}]},{id:'tile',name:'瓷砖',color:'#eeeeee',floorStyle:'tile',points:[{x:300,y:0},{x:600,y:0},{x:600,y:300},{x:300,y:300}]}]};await page.locator('label').filter({hasText:'导入项目'}).locator('input').setInputFiles({name:'floor.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});await expect(page.getByLabel('项目名称')).toHaveValue('地面纹理');const glb=await download(page,'导出 GLB'),jsonLength=glb.readUInt32LE(12),gltf=JSON.parse(glb.subarray(20,20+jsonLength).toString().trim()),binStart=20+jsonLength+8;
  const pngs=[];for(const id of ['wood','tile']){const node=gltf.nodes.find(item=>item.name===`room-${id}`),mesh=gltf.meshes[node.mesh],material=gltf.materials[mesh.primitives[0].material],textureInfo=material.pbrMetallicRoughness.baseColorTexture,texture=gltf.textures[textureInfo.index],image=gltf.images[texture.source],view=gltf.bufferViews[image.bufferView],data=glb.subarray(binStart+(view.byteOffset||0),binStart+(view.byteOffset||0)+view.byteLength);expect(textureInfo.extensions?.KHR_texture_transform?.scale).toEqual([.01,.01]);expect(image.mimeType).toBe('image/png');expect(data.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');pngs.push(data)}expect(pngs[0].equals(pngs[1])).toBe(false);
  // 在浏览器中使用 glTF 加载器重新解析导出的二进制及内嵌纹理。
  const allowed=new Set(['build/three.module.js','build/three.core.js','examples/jsm/loaders/GLTFLoader.js','examples/jsm/utils/BufferGeometryUtils.js','examples/jsm/utils/SkeletonUtils.js']);await page.route(`${origin}/__three/**`,async route=>{const path=new URL(route.request().url()).pathname.slice('/__three/'.length);if(!allowed.has(path))return route.fulfill({status:404});return route.fulfill({contentType:'text/javascript',body:await readFile(resolve('node_modules/three',path))})});await page.addScriptTag({type:'importmap',content:JSON.stringify({imports:{three:`${origin}/__three/build/three.module.js`}})});
  const textures=await page.evaluate(async({moduleUrl,base64})=>{const {GLTFLoader}=await import(moduleUrl);const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0)),loaded=await new GLTFLoader().parseAsync(bytes.buffer,'');return ['wood','tile'].map(id=>{const mesh=loaded.scene.getObjectByName(`room-${id}`),map=mesh.material.map;return {width:map.image.width,height:map.image.height,repeatX:map.repeat.x,repeatY:map.repeat.y}})},{moduleUrl:`${origin}/__three/examples/jsm/loaders/GLTFLoader.js`,base64:glb.toString('base64')});for(const texture of textures){expect(texture.width).toBe(128);expect(texture.height).toBe(128);expect(texture.repeatX).toBeCloseTo(.01);expect(texture.repeatY).toBeCloseTo(.01)}
});

test('户型检查定位重叠墙体以便修正',async({page})=>{
  await configureBuild(page);page.on('dialog',dialog=>dialog.accept());await page.goto(testUrl.href);const project={version:1,name:'重叠墙',cmPerUnit:1,background:null,rooms:[],openings:[],furniture:[],markers:[],walls:[{id:'a',start:{x:100,y:100},end:{x:400,y:100},height:280,thickness:12},{id:'b',start:{x:300,y:100},end:{x:200,y:100},height:280,thickness:12}]};await page.locator('label').filter({hasText:'导入项目'}).locator('input').setInputFiles({name:'overlap.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});await page.getByRole('button',{name:'检查户型'}).click();const issue=page.locator('.diagnostic-item').filter({hasText:'中心线重叠'});await expect(issue).toHaveCount(1);await issue.getByRole('button',{name:'查看对象'}).click();await expect(page.getByText('墙体属性')).toBeVisible();await expect(page.getByLabel('起点 X（画布）')).toHaveValue('300');
});

test('大量检查问题会提示结果截断',async({page})=>{
  await configureBuild(page);page.on('dialog',dialog=>dialog.accept());await page.goto(testUrl.href);const project={version:1,name:'大量重叠',cmPerUnit:1,background:null,rooms:[],openings:[],furniture:[],markers:[],walls:Array.from({length:30},(_,i)=>({id:`w${i}`,start:{x:100,y:100},end:{x:400,y:100},height:280,thickness:12}))};await page.locator('label').filter({hasText:'导入项目'}).locator('input').setInputFiles({name:'many.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});await page.getByRole('button',{name:'检查户型'}).click();await expect(page.getByText('检查结果超过 200 条，仅显示前 200 条，请修正后重新检查。')).toBeVisible();await expect(page.locator('.diagnostic-item')).toHaveCount(201);
});

test('AI 返回首尾重复的房间轮廓可预览并应用',async({page})=>{
  await configureBuild(page);const points=[{x:100,y:100},{x:900,y:100},{x:900,y:900},{x:100,y:900},{x:100,y:100}];await page.route(`${origin}/vision-closed`,route=>route.fulfill({json:{choices:[{message:{content:JSON.stringify({walls:[],rooms:[{name:'闭合房间',points}],openings:[]})}}]}}));await page.goto(testUrl.href);await page.locator('input[type=file]').first().setInputFiles({name:'plan.png',mimeType:'image/png',buffer:pixel});await expect(page.locator('footer')).toContainText('底图已导入');await page.locator('.recognition summary').click();await page.getByLabel('服务完整地址').fill(`${origin}/vision-closed`);await page.getByLabel('视觉模型名称').fill('mock');await page.getByRole('button',{name:'发送图片并识别'}).click();await expect(page.getByText(/识别到 0 面墙、1 个房间/)).toBeVisible();await expect(page.getByLabel('AI 识别候选预览')).toBeVisible();await page.getByRole('button',{name:'追加候选'}).click();const project=JSON.parse((await download(page,'导出项目')).toString());expect(project.rooms[0].points).toHaveLength(4);expect(project.rooms[0].name).toBe('闭合房间');
});

test('3D 资源加载失败时仍可回到编辑并导出项目',async({page})=>{
  await configureBuild(page);await page.route('**/assets/ModelPreview-*.js',route=>route.abort('failed'));page.on('dialog',dialog=>dialog.accept());await page.goto(testUrl.href);await page.getByRole('button',{name:'加载示例'}).click();await page.getByRole('button',{name:'3D 预览'}).click();await expect(page.getByRole('alert')).toContainText('3D 预览加载失败');await page.getByRole('button',{name:'2D 编辑'}).click();await expect(page.getByLabel('户型编辑画布')).toBeVisible();const saved=JSON.parse((await download(page,'导出项目')).toString());expect(saved.name).toBe('示例户型');expect(saved.walls.length).toBeGreaterThan(0);
});

test('WebGL 不可用时可回到二维并保留项目',async({page})=>{
  await configureBuild(page);await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl'||type==='webgl2'||type==='experimental-webgl')return null;return original.call(this,type,...args)}});page.on('dialog',dialog=>dialog.accept());await page.goto(testUrl.href);await page.getByRole('button',{name:'加载示例'}).click();await page.getByRole('button',{name:'3D 预览'}).click();await expect(page.getByText('无法初始化 3D 预览，请检查浏览器的 WebGL 支持。')).toBeVisible();await page.getByRole('button',{name:'2D 编辑'}).click();await expect(page.getByLabel('设备标记 示例灯光')).toBeVisible();const project=JSON.parse((await download(page,'导出项目')).toString());expect(project.name).toBe('示例户型');
});

test('HA 卡片在 WebGL 不可用时回退二维',async({page})=>{
  await configureBuild(page);await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl'||type==='webgl2'||type==='experimental-webgl')return null;return original.call(this,type,...args)}});const project={format:'home-floor-studio',version:1,project:{version:1,name:'测试户型',cmPerUnit:null,background:null,walls:[],rooms:[],openings:[],furniture:[],markers:[]}};await page.route(`${origin}/local/home-floor-studio/no-webgl.json`,route=>route.fulfill({json:project}));await page.goto(testUrl.href);await page.addScriptTag({url:`${origin}${prefix}ha-release/home-floor-studio-card.js`,type:'module'});await page.evaluate(async()=>{await customElements.whenDefined('home-floor-studio-card');const card=document.createElement('home-floor-studio-card');document.body.append(card);card.setConfig({project_url:'/local/home-floor-studio/no-webgl.json'})});const card=page.locator('home-floor-studio-card');await card.getByRole('button',{name:'3D 模型'}).click();await expect(card.getByText('无法加载 3D，请切换到 2D')).toBeVisible();await expect(card.getByRole('button',{name:'复位 3D 视角'})).toHaveCount(0);await card.getByRole('button',{name:'2D 平面'}).click();await expect(card.getByRole('img',{name:'户型平面图'})).toBeVisible();
});

test('紧凑成图的 SVG 与 PNG 范围一致且不影响 HA 户型',async({page})=>{
  await configureBuild(page);page.on('dialog',dialog=>dialog.accept());await page.goto(testUrl.href);const project={version:1,name:'紧凑示例',cmPerUnit:1,background:null,rooms:[],openings:[],furniture:[],walls:[{id:'w',start:{x:300,y:200},end:{x:400,y:200},height:280,thickness:12}],markers:[{id:'m',name:'远处设备',kind:'sensor',position:{x:700,y:500}}]};await page.locator('label').filter({hasText:'导入项目'}).locator('input').setInputFiles({name:'floor.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});await page.getByLabel('紧凑成图范围').check();await page.getByLabel('成图包含设备标记').uncheck();const svg=(await download(page,'导出 2D')).toString(),match=svg.match(/viewBox="([^"]+)"/);const [, ,width,height]=match[1].split(' ').map(Number);expect(width).toBeLessThan(200);expect(height).toBeLessThan(100);expect(svg).not.toContain('远处设备');const png=await download(page,'导出 PNG');expect(png.readUInt32BE(16)/png.readUInt32BE(20)).toBeCloseTo(width/height,2);const ha=JSON.parse((await download(page,'导出 HA 户型')).toString());expect(ha.project.markers[0].id).toBe('m');
});
