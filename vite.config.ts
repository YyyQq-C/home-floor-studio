import {defineConfig} from 'vite';

// 使用相对路径，使静态构建可放在域名根目录或子目录。
export default defineConfig({base:'./',server:{port:3000},preview:{port:3001}});
