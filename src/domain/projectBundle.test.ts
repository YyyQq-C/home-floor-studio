import {describe,expect,it} from 'vitest';
import {strFromU8,unzipSync} from 'fflate';
import {createProjectBundle} from './projectBundle';

describe('完整户型项目包',()=>{
  it('同时包含可编辑备份、2D/3D 成品和 HA 安装包',()=>{
    const files=unzipSync(createProjectBundle({
      projectJson:'{"version":1,"background":"data:image/png;base64,AAAA"}',
      svg:'<svg/>',
      png:new Uint8Array([137,80,78,71]),
      glb:new Uint8Array([103,108,84,70]),
      haBundle:new Uint8Array([80,75,3,4]),
    }));

    expect(JSON.parse(strFromU8(files['project/home-floor-studio.json'])).background).toContain('AAAA');
    expect(strFromU8(files['2d/home-floor-studio.svg'])).toBe('<svg/>');
    expect(files['2d/home-floor-studio.png']).toEqual(new Uint8Array([137,80,78,71]));
    expect(files['3d/home-floor-studio.glb']).toEqual(new Uint8Array([103,108,84,70]));
    expect(files['home-assistant/home-floor-studio-ha.zip']).toEqual(new Uint8Array([80,75,3,4]));
    expect(strFromU8(files['README.txt'])).toContain('解压后，在 Home Floor Studio 中选择“导入项目”');
  });
});
