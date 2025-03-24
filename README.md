# 在线音频格式转换工具

一个基于浏览器的音频格式转换工具，可以转换各种常见音频格式，如MP3、WAV、AAC、FLAC等。该工具使用WebAssembly技术，所有转换过程均在浏览器端完成，无需上传文件到服务器，保障用户隐私和数据安全。

## 主要功能

- **支持多种音频格式**：MP3、WAV、AAC、AC3、WMA、OGG、M4A、FLAC、OPUS、APE、AMR等
- **批量处理**：支持同时上传并转换多个音频文件
- **自定义输出参数**：可设置输出格式、音频码率、采样率、声道等参数
- **批量下载**：处理完成后可一键下载所有转换后的文件
- **无需安装**：完全基于浏览器的Web应用，无需下载安装任何软件

## 技术实现

- **前端界面**：HTML, CSS, JavaScript
- **音频处理**：FFmpeg WebAssembly (ffmpeg.wasm)
- **浏览器API**：Web Audio API, File API

## 开发说明

### 项目结构
```
audio-converter/
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   └── ffmpeg.min.js
├── index.html
└── README.md
```

### 文件说明
- `index.html`: 主页面结构
- `css/style.css`: 样式表
- `js/app.js`: 主要应用逻辑
- `js/ffmpeg.min.js`: FFmpeg WebAssembly模拟实现

## 部署指南

### 本地运行
直接在浏览器中打开`index.html`文件即可使用。

### 服务器部署
1. 将整个项目目录上传到Web服务器
2. 配置服务器以支持跨域资源共享(CORS)
3. 确保服务器支持正确的MIME类型

### 使用云平台部署
推荐以下静态网站托管服务：
- GitHub Pages
- Netlify
- Vercel
- 国内推荐: 阿里云OSS静态网站托管

## 注意事项

1. **浏览器兼容性**：本应用需要现代浏览器支持，推荐使用Chrome、Firefox、Edge等最新版本
2. **内存使用**：处理大文件时可能消耗较多内存，请注意浏览器资源使用情况
3. **格式支持**：当前版本使用模拟转换，实际应用需引入完整的ffmpeg.wasm库

## 未来计划

- 添加音频剪辑功能
- 添加音频合并功能
- 添加音频效果处理(均衡器、音量归一化等)
- 优化移动端体验
- 添加批量下载为ZIP功能 