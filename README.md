# LazyBox

<div align="center">
  <img src="./resources/icon.png" alt="LazyBox Logo" width="120" height="120">
  <p>基于 doocs/md、Woocs 开发的微信 Markdown 编辑器桌面应用</p>
  <p>
    <a href="#特性">特性</a> •
    <a href="#环境要求">环境要求</a> •
    <a href="#快速开始">快速开始</a> •
    <a href="#开发">开发</a> •
    <a href="#故障排除">故障排除</a>
  </p>
</div>

---

## 特性

- 📝 **Markdown 编辑器** - 实时预览，所见即所得
- 🎨 **微信公众号样式** - 专为微信公众号排版优化
- 💾 **本地存储** - 文章自动保存到本地
- 📤 **多种导出** - 支持导出 Markdown、HTML 格式
- 🌈 **主题定制** - 支持自定义 CSS 样式
- 🖼️ **图片上传** - 支持多种图床服务
- ⚡ **快速启动** - Electron + Vite 极速开发体验

## 环境要求

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0
- **操作系统**: macOS / Windows / Linux

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd LazyBox
```

### 2. 配置镜像源（重要！）

在国内环境下，需要配置 Electron 镜像源以确保正常安装。项目已包含 `.npmrc` 配置文件：

```ini
# Electron 镜像源（使用淘宝镜像）
electron_mirror=https://npmmirror.com/mirrors/electron/

# npm 镜像源（可选，加速 npm 包下载）
registry=https://registry.npmmirror.com

# pnpm 设置
shamefully-hoist=true

# 允许 electron 运行 postinstall 脚本
enable-pre-post-scripts=true
```

如果 `.npmrc` 文件不存在，请创建它。

### 3. 安装依赖

```bash
pnpm install
```

**注意**：首次安装时 Electron 二进制文件（~90MB）会从镜像源下载，请耐心等待。

### 4. 启动开发服务器

```bash
pnpm dev
```

开发服务器启动后，会自动打开 Electron 应用窗口。

## 开发

### 项目结构

```
LazyBox/
├── build/                  # 构建资源（图标等）
├── resources/              # 应用资源
├── src/
│   ├── main/              # Electron 主进程
│   │   ├── index.ts       # 主进程入口
│   │   ├── ipc.ts         # IPC 通信
│   │   ├── menu.ts        # 应用菜单
│   │   ├── store.ts       # 数据存储
│   │   └── local.ts       # 本地文件操作
│   ├── preload/           # 预加载脚本
│   │   ├── index.ts       # 暴露 API 给渲染进程
│   │   └── index.d.ts     # 类型定义
│   └── renderer/          # 渲染进程（Vue 应用）
│       ├── src/
│       │   ├── components/  # UI 组件
│       │   ├── views/       # 页面视图
│       │   ├── stores/      # 状态管理
│       │   ├── utils/       # 工具函数
│       │   └── main.ts      # 渲染进程入口
│       └── index.html
├── out/                   # 构建输出
├── .npmrc                 # npm 配置（镜像源）
├── package.json
├── electron.vite.config.ts  # Electron Vite 配置
├── doocs.vite.config.ts     # 渲染进程 Vite 配置
└── electron-builder.yml     # 打包配置
```

### 可用命令

```bash
# 开发模式
pnpm dev

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint

# 代码格式化
pnpm format

# 构建（不打包）
pnpm build

# 打包（各平台）
pnpm build:win    # Windows
pnpm build:mac    # macOS
pnpm build:linux  # Linux
```

### 调试

#### 主进程调试
主进程输出会显示在终端中，可以使用 `console.log` 进行调试。

#### 渲染进程调试
1. 应用启动后，按 `Option + Command + I` (macOS) 或 `Ctrl + Shift + I` (Windows/Linux) 打开开发者工具
2. 或访问菜单：View → Toggle Developer Tools

## 故障排除

### 问题 1: Electron 安装失败

**错误信息**：
```
Error: Electron failed to install correctly
```

**原因**：Electron 二进制文件下载失败（网络问题）

**解决方案**：

1. 确保项目根目录存在 `.npmrc` 文件并配置了镜像源
2. 删除 `node_modules` 和 `pnpm-lock.yaml`
3. 重新安装：
   ```bash
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   ```

如果还是失败，可以手动下载并安装 Electron：

```bash
# 手动下载 Electron（针对 macOS ARM64）
mkdir -p ~/Library/Caches/electron/httpsgithub.comelectronelectronreleasesdownloadv28.1.0
curl -L "https://npmmirror.com/mirrors/electron/28.1.0/electron-v28.1.0-darwin-arm64.zip" \
  -o ~/Library/Caches/electron/httpsgithub.comelectronelectronreleasesdownloadv28.1.0/electron-v28.1.0-darwin-arm64.zip

# 然后重新安装
pnpm install
```

### 问题 2: 启动时报错 "require is not defined"

**错误信息**：
```
ReferenceError: require is not defined in ES module scope
```

**原因**：主进程和预加载脚本输出格式问题

**解决方案**：

确保 `package.json` 中的 `main` 字段指向 `.cjs` 文件：
```json
{
  "main": "./out/main/index.cjs"
}
```

确保 `electron.vite.config.ts` 配置正确：
```typescript
export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs'
        }
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs'
        }
      }
    }
  }
})
```

### 问题 3: 渲染进程无法访问 Electron API

**错误信息**：
```
Cannot read properties of undefined (reading 'onMessage')
```

**原因**：预加载脚本路径不正确

**解决方案**：

确保 `src/main/index.ts` 中的预加载脚本路径正确：
```typescript
webPreferences: {
  preload: join(__dirname, '../preload/index.cjs'),  // 注意是 .cjs
  sandbox: false
}
```

### 问题 4: 缺少 unenv 模块

**错误信息**：
```
Cannot find module 'unenv/mock/empty'
```

**原因**：`vite-plugin-node-polyfills@0.23.1` 版本有 bug

**解决方案**：

```bash
# 安装 unenv
pnpm add -D unenv

# 升级 vite-plugin-node-polyfills
pnpm update vite-plugin-node-polyfills@latest
```

### 问题 5: pnpm 阻止了构建脚本

**错误信息**：
```
Ignored build scripts: electron
```

**原因**：pnpm 的安全机制阻止了某些包的构建脚本

**解决方案**：

在 `.npmrc` 中添加：
```ini
enable-pre-post-scripts=true
```

## 技术栈

### 核心框架
- **Electron** `28.1.0` - 跨平台桌面应用框架
- **Vue** `3.5+` - 渐进式 JavaScript 框架
- **Vite** `4.5+` - 下一代前端构建工具
- **TypeScript** `5.7+` - 类型安全的 JavaScript 超集

### 主要依赖
- **electron-vite** - Electron 开发构建工具
- **electron-builder** - Electron 应用打包工具
- **electron-store** - Electron 数据持久化
- **Pinia** - Vue 状态管理
- **CodeMirror** `5.x` - 代码编辑器
- **Marked** - Markdown 解析器
- **Mermaid** - 图表渲染

### UI 框架
- **Radix Vue** - 无样式 UI 组件
- **TailwindCSS** - 原子化 CSS 框架
- **UnoCSS** - 即时原子化 CSS 引擎
- **Lucide Icons** - 美观的图标库

### 开发工具
- **ESLint** - 代码检查
- **Prettier** - 代码格式化
- **TypeScript ESLint** - TypeScript 代码检查

## 构建配置说明

### Electron Vite 配置

项目使用了两个 Vite 配置文件：

1. **`electron.vite.config.ts`** - 主进程和预加载脚本配置
2. **`doocs.vite.config.ts`** - 渲染进程配置

**重要配置点**：
- 主进程和预加载脚本必须输出为 CommonJS (`.cjs`) 格式
- 渲染进程使用 ES Module 格式
- 使用 `node-polyfills` 插件提供 Node.js API polyfill

### Electron Builder 配置

打包配置位于 `electron-builder.yml`，支持三大平台：
- macOS (dmg, zip)
- Windows (nsis, portable)
- Linux (AppImage, deb)

## 常见开发问题

### 如何添加新的 IPC 通信？

1. 在 `src/main/ipc.ts` 中添加处理函数
2. 在 `src/preload/index.ts` 中暴露 API
3. 在渲染进程中通过 `window.$api` 调用

### 如何添加新的菜单项？

编辑 `src/main/menu.ts`，参考现有菜单结构添加新项。

### 如何修改应用图标？

替换以下文件：
- `build/icon.icns` (macOS)
- `build/icon.ico` (Windows)
- `build/icon.png` (Linux)
- `resources/icon.png` (开发时显示)

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

[LICENSE](./LICENSE)

---

## 致谢

本项目基于以下优秀开源项目：

- [doocs/md](https://github.com/doocs/md) - 微信 Markdown 编辑器
- [electron-vite](https://github.com/alex8088/electron-vite) - Electron + Vite 开发工具

---

**注意**：如果在启动过程中遇到问题，请先查看[故障排除](#故障排除)章节。如果问题仍未解决，欢迎提交 Issue。