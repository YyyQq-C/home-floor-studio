import {describe,it,expect,vi,afterEach} from 'vitest';
import {recognizeFloorplan,recognitionErrorMessage,RecognitionError} from './recognition';
const settings={endpoint:'https://example.com/vision',model:'model',key:'secret',image:'data:image/png;base64,AAAA',signal:new AbortController().signal};
describe('识别错误提示',()=>{
  afterEach(()=>vi.restoreAllMocks());
  it.each([[401,'auth'],[403,'auth'],[429,'rate-limit'],[503,'http']] as const)('区分 HTTP %i',async(status,code)=>{vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response('sensitive server response',{status}));try{await recognizeFloorplan(settings);throw new Error('Expected failure')}catch(error){expect(error).toBeInstanceOf(RecognitionError);expect((error as RecognitionError).code).toBe(code);expect(recognitionErrorMessage(error)).not.toContain('sensitive server response')}});
  it('区分网络、响应格式和地址错误',async()=>{const mock=vi.spyOn(globalThis,'fetch').mockRejectedValueOnce(new TypeError('network')).mockResolvedValueOnce(new Response('{bad',{status:200}));await expect(recognizeFloorplan(settings)).rejects.toMatchObject({code:'network'});await expect(recognizeFloorplan(settings)).rejects.toMatchObject({code:'format'});await expect(recognizeFloorplan({...settings,endpoint:'http://example.com'})).rejects.toMatchObject({code:'endpoint'});expect(mock).toHaveBeenCalledTimes(2)});
});
