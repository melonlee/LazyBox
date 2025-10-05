# LazyBox 开发路线图

## 当前版本：v0.1.0

基础 Markdown 编辑器已完成，支持微信公众号排版和本地文件管理。

---

## 📋 下一步开发计划

### 🎯 Phase 1: 文件管理增强 (v0.2.0)

#### 1.1 文件夹结构管理
- [ ] 树形目录展示
  - [ ] 实现文件夹树形组件
  - [ ] 支持文件夹折叠/展开
  - [ ] 显示文件夹图标和文件数量
  - [ ] 支持多级嵌套文件夹

- [ ] 文件夹操作
  - [ ] 新建文件夹
  - [ ] 重命名文件夹
  - [ ] 删除文件夹（带确认）
  - [ ] 移动文件夹（拖拽）
  - [ ] 文件夹右键菜单

- [ ] 文件操作增强
  - [ ] 文件拖拽到文件夹
  - [ ] 文件移动（剪切/粘贴）
  - [ ] 文件复制
  - [ ] 批量操作（多选支持）
  - [ ] 文件搜索/过滤

#### 1.2 工作区管理
- [ ] 多工作区支持
  - [ ] 创建/切换工作区
  - [ ] 工作区设置独立存储
  - [ ] 最近打开的工作区列表

- [ ] 文件收藏/标记
  - [ ] 收藏文件标记
  - [ ] 快速访问收藏列表
  - [ ] 文件标签系统（可自定义标签）

#### 1.3 文件元数据
- [ ] 文件信息面板
  - [ ] 创建时间/修改时间
  - [ ] 字数统计
  - [ ] 阅读时长估算
  - [ ] 文件大小

- [ ] Front Matter 支持
  - [ ] 解析 YAML Front Matter
  - [ ] 可视化编辑 Front Matter
  - [ ] 自定义元数据字段

#### 技术方案
```typescript
// 文件系统结构
interface FileNode {
  id: string
  name: string
  type: 'file' | 'folder'
  path: string
  parentId?: string
  children?: FileNode[]
  metadata?: {
    createdAt: Date
    updatedAt: Date
    tags: string[]
    starred: boolean
    wordCount?: number
  }
}

// 使用递归组件实现树形结构
// 使用 electron-store 存储文件夹结构
// 使用 chokidar 监听文件系统变化
```

**预计工作量**: 2-3 周

---

### 🎨 Phase 2: 编辑器布局重构 (v0.3.0)

#### 2.1 布局系统
- [ ] 灵活布局引擎
  - [ ] 支持三栏布局（文件树 | 编辑器 | 预览/大纲）
  - [ ] 可调整分栏宽度（拖拽分隔线）
  - [ ] 布局配置保存/恢复
  - [ ] 全屏模式（专注写作）

- [ ] 标签页系统
  - [ ] 多文件标签页
  - [ ] 标签页拖拽排序
  - [ ] 标签页右键菜单（关闭、关闭其他等）
  - [ ] 最近打开文件列表

#### 2.2 编辑器增强
- [ ] 编辑器工具栏优化
  - [ ] 浮动工具栏（选中文本时显示）
  - [ ] 快捷插入面板（表格、代码块等）
  - [ ] 自定义工具栏按钮

- [ ] 编辑功能增强
  - [ ] Markdown 语法高亮优化
  - [ ] 代码片段（Snippets）
  - [ ] Vim/Emacs 模式支持（可选）
  - [ ] 查找替换功能增强（正则支持）

#### 2.3 预览区域重构
- [ ] 智能预览
  - [ ] 实时滚动同步
  - [ ] 点击预览定位到编辑位置
  - [ ] 预览区域可编辑（所见即所得）

- [ ] 多视图模式
  - [ ] 仅编辑模式
  - [ ] 仅预览模式
  - [ ] 左右分栏模式
  - [ ] 上下分栏模式

- [ ] 大纲视图
  - [ ] 提取文档标题结构
  - [ ] 点击标题快速跳转
  - [ ] 拖拽标题调整结构
  - [ ] 显示当前阅读位置

#### 2.4 交互优化
- [ ] 快捷键系统
  - [ ] 可自定义快捷键
  - [ ] 快捷键面板（Ctrl+K 模式）
  - [ ] 常用操作快捷键提示

- [ ] 主题系统
  - [ ] 编辑器主题切换（VS Code 风格）
  - [ ] 预览主题切换
  - [ ] 深色模式支持

#### 技术方案
```typescript
// 使用 Vue Splitpanes 或自定义实现
import { Splitpanes, Pane } from 'splitpanes'

// 布局配置
interface LayoutConfig {
  mode: 'edit' | 'preview' | 'split'
  splitDirection: 'horizontal' | 'vertical'
  panesSizes: number[]
  showOutline: boolean
  showFileTree: boolean
}

// 考虑升级到 CodeMirror 6
// 或使用 Monaco Editor（VS Code 的编辑器）
```

**预计工作量**: 3-4 周

---

### 🤖 Phase 3: AI 写作助手 (v0.4.0)

#### 3.1 AI 基础架构
- [ ] AI 服务集成
  - [ ] OpenAI API 集成
  - [ ] 自定义 API 端点支持（兼容本地大模型）
  - [ ] API Key 配置管理（加密存储）
  - [ ] 多 AI 模型切换（GPT-4、Claude、本地模型等）
  - [ ] Token 使用统计

- [ ] AI 面板设计
  - [ ] 右侧 AI 助手面板（可折叠）
  - [ ] 对话式交互界面
  - [ ] 历史对话记录
  - [ ] 快速操作按钮组

#### 3.2 主题与大纲生成
- [ ] 主题创作
  - [ ] 根据关键词生成文章主题
  - [ ] 主题多样性选择（正式、轻松、专业等）
  - [ ] 热点话题推荐
  - [ ] 主题收藏和管理

- [ ] 大纲生成
  - [ ] 根据主题生成文章大纲
  - [ ] 大纲结构调整（拖拽、删除、修改）
  - [ ] 大纲扩展（生成小节内容）
  - [ ] 根据已有文本优化大纲

- [ ] 快速成文
  - [ ] 一键生成全文（基于大纲）
  - [ ] 分段生成（避免生成过长）
  - [ ] 风格控制（字数、语气、专业度）

#### 3.3 内容辅助
- [ ] 智能续写
  - [ ] 基于上下文续写段落
  - [ ] 多版本建议（可选择）
  - [ ] 自动续写模式（流式输出）

- [ ] 内容改写
  - [ ] 润色优化
  - [ ] 扩写/缩写
  - [ ] 语气转换
  - [ ] 翻译功能

- [ ] 智能问答
  - [ ] 选中文本提问
  - [ ] 解释专业术语
  - [ ] 事实核查建议

#### 3.4 联网搜索
- [ ] 搜索引擎集成
  - [ ] Google/Bing 搜索 API
  - [ ] 实时资讯获取
  - [ ] 引用来源管理

- [ ] 内容引用
  - [ ] 搜索结果卡片展示
  - [ ] 一键引用到文档
  - [ ] 自动生成参考文献

#### 3.5 文生图
- [ ] 图片生成
  - [ ] DALL-E / Stable Diffusion 集成
  - [ ] 根据文本描述生成配图
  - [ ] 图片风格选择
  - [ ] 生成图片尺寸自定义

- [ ] 图片管理
  - [ ] 本地图片库
  - [ ] 图片自动上传到图床
  - [ ] 生成图片历史记录

#### 3.6 AI 与文件管理结合
- [ ] 智能分类
  - [ ] AI 自动建议文件分类
  - [ ] 根据内容自动打标签
  - [ ] 相关文章推荐

- [ ] 内容提取
  - [ ] 自动生成文档摘要
  - [ ] 提取关键词
  - [ ] 生成 Front Matter

#### 技术方案
```typescript
// AI 服务抽象层
interface AIService {
  chat(messages: Message[]): Promise<string>
  stream(messages: Message[]): AsyncIterator<string>
  generateImage(prompt: string, options?: ImageOptions): Promise<string>
  search(query: string): Promise<SearchResult[]>
}

// 支持多种 AI 提供商
class OpenAIService implements AIService { /* ... */ }
class LocalModelService implements AIService { /* ... */ }

// AI 对话管理
interface AIConversation {
  id: string
  messages: Message[]
  context?: {
    documentId: string
    selectedText?: string
  }
}

// 使用 streaming 提高用户体验
// 使用 Worker 避免阻塞主线程
```

**预计工作量**: 4-5 周

---

## 🔧 技术栈更新计划

### 编辑器升级
- **CodeMirror 6** 或 **Monaco Editor**
  - 更好的性能
  - 更丰富的扩展生态
  - LSP 支持（代码提示）

### 状态管理优化
- 考虑引入 **Zustand** 或继续使用 **Pinia**
- 文件系统状态分离管理

### AI 相关依赖
```json
{
  "openai": "^4.0.0",           // OpenAI SDK
  "langchain": "^0.1.0",        // LLM 编排框架
  "sse": "^0.0.8",              // Server-Sent Events (流式响应)
  "cheerio": "^1.0.0",          // 网页解析（搜索结果）
  "marked-extended": "^latest"   // Markdown 增强
}
```

### UI 组件增强
```json
{
  "splitpanes": "^3.0.0",       // 分栏布局
  "@dnd-kit/core": "^6.0.0",    // 拖拽功能
  "react-markdown": "^9.0.0",   // 如果需要更好的预览
  "prism-react-renderer": "^2.0.0" // 代码高亮
}
```

---

## 📊 开发优先级

### 高优先级（P0）
1. ✅ 基础编辑器功能
2. ✅ 本地文件管理
3. 🔄 文件夹树形结构
4. 🔄 布局系统重构
5. 🔄 AI 对话基础

### 中优先级（P1）
1. 标签页系统
2. 大纲视图
3. AI 内容生成
4. 主题系统

### 低优先级（P2）
1. 工作区管理
2. 文生图
3. 联网搜索
4. Vim 模式

---

## 🎯 里程碑

### v0.2.0 - 文件管家 (预计 2 周后)
- 完整的文件夹树形结构
- 文件拖拽移动
- 文件搜索功能
- 元数据显示

### v0.3.0 - 编辑器升级 (预计 1.5 月后)
- 新的三栏布局
- 标签页系统
- 大纲视图
- 主题切换

### v0.4.0 - AI 助手 (预计 3 月后)
- AI 对话面板
- 主题和大纲生成
- 内容续写和改写
- 基础图片生成

### v1.0.0 - 完整版 (预计 4 月后)
- 所有功能稳定
- 完善的文档
- 性能优化
- 单元测试覆盖

---

## 📝 开发规范

### 分支管理
- `main` - 稳定版本
- `develop` - 开发分支
- `feature/*` - 功能分支
- `fix/*` - 修复分支

### Commit 规范
```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
perf: 性能优化
test: 测试相关
chore: 构建/工具相关
```

### 代码审查
- 每个 PR 需要自测通过
- 重大功能需要设计文档
- 保持代码简洁可读

---

## 🤝 贡献指南

欢迎贡献！在开始开发前：

1. 查看 [ROADMAP.md](./ROADMAP.md) 了解计划
2. 在 Issues 中讨论你的想法
3. Fork 项目并创建功能分支
4. 提交 PR 时关联相关 Issue

---

## 💡 创意池

未来可能实现的功能：

- 📊 数据可视化支持（图表生成）
- 🎙️ 语音输入转文字
- 📖 导出为 PDF/EPUB
- 🌐 WebDAV 同步支持
- 👥 多人协作编辑
- 🔌 插件系统（扩展生态）
- 📱 移动端适配

---

最后更新：2025-10-06
