# LazyBox v0.2.0 更新日志

## 🎯 Phase 1: 文件管理增强

### ✅ 已完成功能

#### 工作区管理（类 VS Code / Atom 编辑器模式）
- ✅ 用户可选择任意文件夹作为工作区
- ✅ 欢迎界面：提示用户打开文件夹
- ✅ 最近打开的工作区列表（最多保存 10 个）
- ✅ 工作区切换功能
- ✅ 关闭工作区功能
- ✅ 自动保存和恢复上次打开的工作区

#### 1. 树形目录展示
- ✅ 实现递归文件树组件 `FileTreeNode.vue`
- ✅ 支持文件夹折叠/展开功能
- ✅ 显示文件夹图标（打开/关闭状态）和文件图标
- ✅ 显示文件夹内文件数量
- ✅ 支持多级嵌套文件夹
- ✅ 按类型（文件夹在前）和名称自动排序

#### 2. 文件夹操作
- ✅ 新建文件夹
- ✅ 重命名文件夹
- ✅ 删除文件夹（带确认对话框）
- ✅ 右键菜单支持所有文件夹操作

#### 3. 文件操作增强
- ✅ 新建文件（支持在指定文件夹下创建）
- ✅ 重命名文件
- ✅ 删除文件（带确认对话框）
- ✅ 文件拖拽到文件夹（移动文件）
- ✅ 文件复制（Ctrl/Cmd + 拖拽）
- ✅ 文件搜索/过滤功能（实时搜索）

#### 4. 用户体验优化
- ✅ 搜索时自动展开匹配的文件夹
- ✅ 右键菜单操作
- ✅ 拖拽时的视觉反馈
- ✅ 选中状态高亮显示
- ✅ 暗色模式支持
- ✅ 自动保存文件内容（防抖 1 秒）

### 🎨 用户体验改进

#### 欢迎界面
- 首次启动或未打开工作区时显示欢迎界面
- 引导用户打开文件夹
- 显示最近打开的工作区列表，可快速重新打开

#### 工作区管理
- 工具栏新增"工作区"下拉菜单
  - 打开文件夹
  - 关闭工作区
  - 最近打开列表（显示最近 5 个）
- 工作区路径自动保存到本地存储

### 📦 新增/修改文件

#### 主进程（Main Process）
- **src/main/local.ts** - 新增功能：
  - `createFolder()` - 创建文件夹
  - `renameFolder()` - 重命名文件夹
  - `removeFolder()` - 删除文件夹（递归）
  - `moveFileOrFolder()` - 移动文件或文件夹
  - `copyFile()` - 复制文件
  - `readDirectoryTree()` - 递归读取目录树

#### IPC 通信
- **src/main/ipc.ts** - 新增 IPC 处理器：
  - `read-directory-tree` - 读取文件树（支持自定义工作区路径）
  - `select-workspace-folder` - 选择工作区文件夹对话框
  - `create-folder` - 创建文件夹
  - `rename-folder` - 重命名文件夹
  - `remove-folder` - 删除文件夹
  - `create-file` - 创建文件
  - `rename-file` - 重命名文件
  - `remove-file` - 删除文件
  - `read-file` - 读取文件
  - `update-file` - 更新文件
  - `move-file-or-folder` - 移动文件/文件夹
  - `copy-file` - 复制文件

#### 渲染进程（Renderer Process）
- **src/renderer/src/components/FileTree/FileTreeNode.vue** - 树形节点组件
  - 递归渲染子节点
  - 拖拽支持
  - 右键菜单
  - 折叠/展开动画

- **src/renderer/src/components/FileTree/FileTree.vue** - 文件树容器组件
  - 搜索过滤功能
  - 右键菜单管理
  - 拖拽操作处理
  - 展开/折叠状态管理

- **src/renderer/src/components/CodemirrorEditor/FileTreePanel.vue** - 文件树面板
  - 集成文件树和对话框
  - 处理文件/文件夹的 CRUD 操作
  - 与编辑器集成（自动保存、加载文件）

- **src/renderer/src/stores/fileTree.ts** - 文件树状态管理
  - 文件树数据管理
  - 工作区管理（当前工作区、最近打开列表）
  - 文件操作的业务逻辑
  - 错误处理和用户提示
  - 使用 `useStorage` 持久化工作区信息

#### 类型定义
- **src/renderer/src/types/index.ts** - 新增类型：
  - `FileNode` - 文件节点接口
  - `FileMetadata` - 文件元数据接口
  - `FileTreeState` - 文件树状态接口
  - `FileOperationOptions` - 文件操作选项接口

- **src/preload/index.d.ts** - 更新类型定义
  - `LazyBoxAPI` - 完整的 API 类型定义
  - `FileNodeData` - 文件节点数据类型

### 🔧 技术实现

#### 架构设计
```
主进程（Main Process）
  ├─ local.ts - 文件系统操作
  ├─ ipc.ts - IPC 通信处理
  └─ store.ts - 持久化存储

IPC 通信层
  └─ preload/index.ts - 安全的 API 暴露

渲染进程（Renderer Process）
  ├─ FileTree 组件
  │   ├─ FileTree.vue - 容器组件
  │   └─ FileTreeNode.vue - 递归节点组件
  ├─ FileTreePanel.vue - 面板组件
  └─ stores/fileTree.ts - 状态管理
```

#### 关键技术点
1. **递归组件**：FileTreeNode 组件递归渲染自身以支持多级嵌套
2. **拖拽实现**：使用原生 HTML5 Drag & Drop API
3. **搜索过滤**：递归过滤节点树，自动展开匹配项
4. **状态管理**：使用 Pinia 管理文件树状态
5. **自动保存**：使用 VueUse 的 `useDebounceFn` 实现防抖保存
6. **类型安全**：完整的 TypeScript 类型定义

### 🎨 UI/UX 特性
- 使用 `lucide-vue-next` 图标库（FolderOpen、Folder、File 等）
- 支持亮色/暗色主题（所有新组件均适配）
- 拖拽时的视觉反馈
- 选中状态的高亮显示
- 搜索时自动展开匹配项
- 右键菜单操作
- 确认对话框防止误删
- 欢迎界面引导用户体验
- 工作区下拉菜单便捷操作

### 📝 依赖更新
- 新增 `path-browserify` 用于在渲染进程中处理路径操作

### 🔄 向后兼容
- 保留了旧版 API（`addPost2Local`, `renamePost`, etc.）
- 旧功能继续可用，新功能独立实现
- 新版文件树完全替代旧版 PostSlider

### 💡 设计理念
- **类 IDE 体验**：借鉴 VS Code、Atom 等现代编辑器的工作区管理模式
- **灵活性**：用户可以打开任意文件夹，不再局限于固定目录
- **便捷性**：最近打开列表让用户快速切换项目
- **持久化**：自动保存工作区状态，下次启动恢复上次的工作环境

### 🚀 下一步计划
根据 ROADMAP.md，下一步将实现：
- 1.2 工作区管理
- 1.3 文件元数据
- Phase 2: 编辑器布局重构

### 📊 代码统计
- 新增文件：8 个
- 修改文件：7 个
- 新增代码行数：约 1800 行
- 新增 API 接口：12 个（包括工作区选择）
- 新增 UI 组件：3 个（FileTree、FileTreeNode、FileTreePanel）

---

**开发时间**: 2025-10-11  
**版本**: v0.2.0-alpha  
**开发者**: AI Assistant

