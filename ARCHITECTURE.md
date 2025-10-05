# LazyBox 架构设计

## 系统架构

```mermaid
flowchart TB
    subgraph Electron["Electron 应用"]
        Main["主进程<br/>Main Process"]
        Preload["预加载脚本<br/>Preload"]
        Renderer["渲染进程<br/>Renderer"]
    end
    
    subgraph Backend["后端服务"]
        FileSystem["文件系统<br/>Local FS"]
        Store["数据存储<br/>electron-store"]
        IPC["IPC 通信"]
    end
    
    subgraph Frontend["前端应用"]
        FileTree["文件树<br/>📁"]
        Editor["编辑器<br/>✍️"]
        Preview["预览<br/>👁️"]
        AI["AI 助手<br/>🤖"]
    end
    
    subgraph External["外部服务"]
        OpenAI["OpenAI API"]
        ImageBed["图床服务"]
        Search["搜索引擎"]
    end
    
    Main --> IPC
    Main --> FileSystem
    Main --> Store
    Preload --> IPC
    Renderer --> Preload
    
    Renderer --> FileTree
    Renderer --> Editor
    Renderer --> Preview
    Renderer --> AI
    
    AI --> OpenAI
    AI --> ImageBed
    AI --> Search
    
    style Main fill:#60a5fa
    style Renderer fill:#f472b6
    style AI fill:#4ade80
```

---

## 功能模块规划

```mermaid
mindmap
  root((LazyBox))
    文件管理
      树形结构
      拖拽移动
      搜索过滤
      元数据
      标签收藏
    编辑器
      Markdown 编辑
      语法高亮
      实时预览
      大纲视图
      主题切换
    AI 助手
      对话交互
      主题生成
      大纲创作
      内容续写
      智能改写
      联网搜索
      文生图
    导出发布
      HTML 导出
      Markdown 导出
      图片导出
      微信复制
```

---

## 开发阶段流程

```mermaid
gantt
    title LazyBox 开发时间线
    dateFormat YYYY-MM-DD
    section Phase 0
    基础框架搭建           :done, p0, 2025-10-01, 5d
    Electron 环境配置      :done, p0-1, 2025-10-05, 1d
    
    section Phase 1
    文件系统设计           :active, p1, 2025-10-06, 3d
    文件树 UI 开发         :p1-1, 2025-10-09, 4d
    拖拽和搜索            :p1-2, 2025-10-13, 3d
    元数据管理            :p1-3, 2025-10-16, 3d
    测试和优化            :p1-4, 2025-10-19, 2d
    
    section Phase 2
    布局系统重构           :p2, 2025-10-21, 5d
    标签页开发            :p2-1, 2025-10-26, 4d
    大纲视图              :p2-2, 2025-10-30, 4d
    主题系统              :p2-3, 2025-11-03, 3d
    编辑器升级            :p2-4, 2025-11-06, 7d
    
    section Phase 3
    AI 基础架构           :p3, 2025-11-13, 5d
    对话系统              :p3-1, 2025-11-18, 4d
    内容生成              :p3-2, 2025-11-22, 5d
    联网搜索              :p3-3, 2025-11-27, 4d
    文生图功能            :p3-4, 2025-12-01, 4d
    AI 优化              :p3-5, 2025-12-05, 3d
```

---

## 数据流向

### 文件管理数据流

```mermaid
sequenceDiagram
    participant User
    participant FileTree as 文件树 UI
    participant Store as Pinia Store
    participant IPC
    participant Main as 主进程
    participant FS as 文件系统
    
    User->>FileTree: 创建文件夹
    FileTree->>Store: dispatch(createFolder)
    Store->>IPC: invoke('create-folder')
    IPC->>Main: IPC Handler
    Main->>FS: fs.mkdir()
    FS-->>Main: 成功
    Main-->>IPC: 返回结果
    IPC-->>Store: 更新状态
    Store-->>FileTree: 重新渲染
    FileTree-->>User: 显示新文件夹
```

### AI 对话数据流

```mermaid
sequenceDiagram
    participant User
    participant AIPanel as AI 面板
    participant AIService as AI 服务
    participant OpenAI
    
    User->>AIPanel: 发送消息
    AIPanel->>AIService: chat(messages)
    AIService->>OpenAI: POST /chat/completions<br/>(stream: true)
    
    loop 流式响应
        OpenAI-->>AIService: 数据块
        AIService-->>AIPanel: yield chunk
        AIPanel-->>User: 逐字显示
    end
    
    OpenAI-->>AIService: [DONE]
    AIService-->>AIPanel: 完成
    AIPanel->>AIPanel: 保存对话历史
```

---

## 技术架构

### 主进程 (Main Process)

```typescript
// src/main/index.ts - 应用入口
// src/main/ipc.ts - IPC 通信处理
// src/main/menu.ts - 应用菜单
// src/main/store.ts - 数据持久化
// src/main/local.ts - 文件系统操作
// src/main/ai.ts - AI 服务管理 (新增)
```

### 渲染进程 (Renderer)

```typescript
// 核心模块
src/renderer/src/
├── stores/              // 状态管理
│   ├── fileSystem.ts   // 文件系统状态 (新增)
│   ├── editor.ts       // 编辑器状态
│   └── ai.ts          // AI 助手状态 (新增)
├── components/
│   ├── FileTree/       // 文件树组件 (新增)
│   ├── Editor/         // 编辑器组件
│   ├── Preview/        // 预览组件
│   └── AI/            // AI 面板组件 (新增)
├── services/
│   ├── fileService.ts  // 文件操作服务
│   ├── aiService.ts    // AI 服务抽象 (新增)
│   └── searchService.ts // 搜索服务 (新增)
└── utils/
    ├── markdown.ts     // Markdown 处理
    └── storage.ts      // 本地存储
```

---

## 关键技术决策

### 1. 文件系统管理

**选择：** 自定义文件树结构 + chokidar 监听

**理由：**
- 灵活控制树形结构
- 实时监听文件变化
- 支持元数据扩展

**替代方案：**
- ~~直接使用操作系统文件浏览器~~ (无法自定义)
- ~~Electron 原生对话框~~ (用户体验差)

### 2. 编辑器选择

**当前：** CodeMirror 5

**未来计划：** CodeMirror 6 或 Monaco Editor

**对比：**

| 特性 | CodeMirror 5 | CodeMirror 6 | Monaco |
|------|-------------|--------------|---------|
| 性能 | 中 | 高 | 高 |
| 扩展性 | 一般 | 优秀 | 优秀 |
| 体积 | 小 | 中 | 大 |
| TypeScript | 支持 | 原生支持 | 原生支持 |
| LSP | 困难 | 容易 | 内置 |

**决策：** 先保持 CodeMirror 5，待 v0.3.0 再升级

### 3. AI 服务架构

**选择：** 抽象层 + 多提供商支持

```typescript
// 统一接口
interface AIProvider {
  chat(messages: Message[]): Promise<string>
  stream(messages: Message[]): AsyncIterator<string>
}

// 支持多种实现
class OpenAIProvider implements AIProvider { }
class ClaudeProvider implements AIProvider { }
class LocalModelProvider implements AIProvider { }
```

**优势：**
- 易于切换 AI 提供商
- 支持本地大模型
- 统一的错误处理

### 4. 状态管理

**选择：** Pinia

**理由：**
- Vue 3 官方推荐
- TypeScript 友好
- 模块化设计
- 轻量级

**状态结构：**

```typescript
// fileSystemStore
interface FileSystemState {
  rootNodes: FileNode[]
  currentFile: FileNode | null
  selectedFiles: FileNode[]
  searchQuery: string
}

// aiStore
interface AIState {
  conversations: Conversation[]
  currentConversation: Conversation | null
  isGenerating: boolean
  settings: AISettings
}
```

---

## 性能优化策略

### 1. 大文件处理
- 虚拟滚动（只渲染可见区域）
- 分块加载（按需加载文件内容）
- Web Worker 处理（避免阻塞主线程）

### 2. AI 流式响应
- Server-Sent Events (SSE)
- 逐字渲染动画
- 取消请求支持

### 3. 文件树优化
- 懒加载子节点
- 虚拟列表（大量文件时）
- 节流和防抖

---

## 安全考虑

### 1. API Key 管理
- 使用 `safeStorage` 加密存储
- 不在日志中输出
- 支持环境变量配置

### 2. 文件访问权限
- 沙箱隔离
- 路径验证（防止目录遍历）
- 用户确认敏感操作

### 3. AI 内容审核
- 内容过滤
- 敏感词检测
- 用户可自定义规则

---

## 测试策略

### 单元测试
- 工具函数测试
- Store 逻辑测试
- 组件测试

### 集成测试
- IPC 通信测试
- 文件操作测试
- AI 服务测试

### E2E 测试
- 用户流程测试
- 跨平台测试
- 性能测试

---

## 部署架构

### 打包流程

```mermaid
flowchart LR
    Code[源代码] --> Build[Vite 构建]
    Build --> Main[主进程 .cjs]
    Build --> Renderer[渲染进程]
    Main --> Builder[Electron Builder]
    Renderer --> Builder
    Builder --> macOS[.dmg/.zip]
    Builder --> Windows[.exe/NSIS]
    Builder --> Linux[.AppImage/.deb]
```

### 更新机制
- 使用 `electron-updater`
- 增量更新支持
- 版本检查
- 自动下载安装

---

最后更新：2025-10-06
