# videosass-auto

自动化视频处理工具，提供视频转码、压缩、剪辑等功能。

## 功能特性

- 🎬 视频转码：支持多种格式互转（MP4、AVI、MOV、MKV 等）
- 📦 视频压缩：智能压缩，保持画质的同时减小文件体积
- ✂️ 视频剪辑：支持裁剪、拼接、提取片段
- 🖼️ 缩略图生成：自动生成视频封面图
- 📊 元数据提取：获取视频时长、分辨率、码率等信息
- ⚡ 批量处理：支持并发处理多个任务

## 安装

### 环境要求

- Node.js >= 16.0.0
- FFmpeg >= 4.0
- npm >= 8.0.0

### 安装 FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
从 [FFmpeg 官网](https://ffmpeg.org/download.html) 下载并添加至环境变量。

### 安装项目依赖

```bash
git clone https://github.com/your-org/videosaas-auto.git
cd videosaas-auto
npm install
```

## 快速开始

### 命令行使用

```bash
# 转码视频
npx videosaas-auto convert input.mp4 --format webm --output output.webm

# 压缩视频
npx videosaas-auto compress input.mp4 --quality medium --output compressed.mp4

# 剪辑视频片段
npx videosaas-auto trim input.mp4 --start 00:00:10 --end 00:00:30 --output clip.mp4

# 生成缩略图
npx videosaas-auto thumbnail input.mp4 --time 00:00:05 --output thumb.jpg

# 批量处理
npx videosaas-auto batch ./videos --format mp4 --quality high
```

### 作为 Node.js 模块使用

```javascript
const VideoAuto = require('videosaas-auto');

const processor = new VideoAuto({
  ffmpegPath: '/usr/local/bin/ffmpeg',
  concurrency: 4,
  tempDir: './tmp'
});

// 转码
await processor.convert('input.mp4', {
  format: 'webm',
  codec: 'libvpx-vp9',
  bitrate: '1000k',
  output: 'output.webm'
});

// 压缩
await processor.compress('input.mp4', {
  quality: 'medium',
  output: 'compressed.mp4'
});

// 剪辑
await processor.trim('input.mp4', {
  start: '00:00:10',
  end: '00:00:30',
  output: 'clip.mp4'
});

// 获取元数据
const metadata = await processor.getMetadata('input.mp4');
console.log(metadata);
// { duration: 120, width: 1920, height: 1080, bitrate: 5000000, codec: 'h264' }

// 批量处理
const results = await processor.batch(['video1.mp4', 'video2.mp4'], {
  format: 'mp4',
  quality: 'high'
});
```

## 配置

在项目根目录创建 `videosaas.config.js`:

```javascript
module.exports = {
  ffmpegPath: 'ffmpeg',
  ffprobePath: 'ffprobe',
  concurrency: 2,
  tempDir: './tmp',
  outputDir: './output',
  defaultQuality: 'medium',
  logLevel: 'info',
  retry: {
    maxAttempts: 3,
    delay: 1000
  }
};
```

## API 文档

### `new VideoAuto(options)`

创建视频处理实例。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| ffmpegPath | string | 'ffmpeg' | FFmpeg 可执行文件路径 |
| ffprobePath | string | 'ffprobe' | FFprobe 可执行文件路径 |
| concurrency | number | 2 | 并发处理数 |
| tempDir | string | './tmp' | 临时文件目录 |
| logLevel | string | 'info' | 日志级别 |

### `convert(input, options)`

转码视频。

| 选项 | 类型 | 必填 | 说明 |
|------|------|------|------|
| format | string | 是 | 目标格式 |
| codec | string | 否 | 视频编码器 |
| bitrate | string | 否 | 目标码率 |
| output | string | 是 | 输出文件路径 |

### `compress(input, options)`

压缩视频。

| 选项 | 类型 | 必填 | 说明 |
|------|------|------|------|
| quality | string | 是 | 'low' \| 'medium' \| 'high' |
| output | string | 是 | 输出文件路径 |

### `trim(input, options)`

剪辑视频片段。

| 选项 | 类型 | 必填 | 说明 |
|------|------|------|------|
| start | string\|number | 是 | 起始时间 |
| end | string\|number | 是 | 结束时间 |
| output | string | 是 | 输出文件路径 |

## 示例项目

查看 [examples](./examples) 目录获取完整示例：

- `examples/convert.js` - 基础转码示例
- `examples/batch-process.js` - 批量处理示例
- `examples/server.js` - Express 服务端示例

## 常见问题

### FFmpeg 未找到

确保 FFmpeg 已安装并配置在 PATH 中。可以通过 `ffmpeg -version` 验证。

### 内存占用过高

降低 `concurrency` 配置项的值，或升级到更高配置的机器。

### 处理速度慢

- 使用更快的预设（如 `ultrafast`）
- 启用 GPU 加速（需要 FFmpeg 支持）
- 调整并发数

## 开发

```bash
# 克隆仓库
git clone https://github.com/your-org/videosaas-auto.git

# 安装依赖
npm install

# 运行测试
npm test

# 代码风格检查
npm run lint

# 构建
npm run build
```

## 贡献指南

欢迎提交 Pull Request 或 Issue。请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交改动 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件。

## 联系方式

- 作者：VideoSaaS Team
- 邮箱：dev@videosaas.example.com
- 官网：https://videosaas.example.com
