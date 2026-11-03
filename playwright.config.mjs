import {defineConfig} from '@playwright/test';

// 可通过环境变量使用本机浏览器；未设置时使用 Playwright 安装的 Chromium。
export default defineConfig({testDir:'./e2e',testMatch:'**/*.e2e.mjs',timeout:60000,use:{headless:true,launchOptions:process.env.HFS_BROWSER_PATH?{executablePath:process.env.HFS_BROWSER_PATH}:{}}});
