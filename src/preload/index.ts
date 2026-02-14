import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  onMessage: (callback) => ipcRenderer.on('message-to-renderer', (_, ...args) => callback(...args)),
  
  // 旧版 API（保留向后兼容）
  addPost2Local: (title, content) => ipcRenderer.invoke('add-post', { title, content }),
  renamePost: (originTitle, newTitle) => ipcRenderer.invoke('rename-post', { originTitle, newTitle }),
  removePost: (title) => ipcRenderer.invoke('remove-post', { title }),
  updatePost: (title, content) => ipcRenderer.invoke('update-post', { title, content }),
  getPost: (title) => ipcRenderer.invoke('get-post', { title }),
  importPost: () => ipcRenderer.invoke('import-post'),

  // 新版文件树 API
  readDirectoryTree: (workspaceDir?: string) => ipcRenderer.invoke('read-directory-tree', { workspaceDir }),
  selectWorkspaceFolder: () => ipcRenderer.invoke('select-workspace-folder'),
  createFolder: (parentPath: string, folderName: string) => 
    ipcRenderer.invoke('create-folder', { parentPath, folderName }),
  renameFolder: (oldPath: string, newName: string) => 
    ipcRenderer.invoke('rename-folder', { oldPath, newName }),
  removeFolder: (folderPath: string) => 
    ipcRenderer.invoke('remove-folder', { folderPath }),
  createFile: (dirPath: string, fileName: string, content: string) => 
    ipcRenderer.invoke('create-file', { dirPath, fileName, content }),
  renameFile: (filePath: string, newName: string) => 
    ipcRenderer.invoke('rename-file', { filePath, newName }),
  removeFile: (filePath: string) => 
    ipcRenderer.invoke('remove-file', { filePath }),
  readFile: (filePath: string) => 
    ipcRenderer.invoke('read-file', { filePath }),
  readImageAsBase64: (filePath: string) => 
    ipcRenderer.invoke('read-image-as-base64', { filePath }),
  readPdfAsBase64: (filePath: string) => 
    ipcRenderer.invoke('read-pdf-as-base64', { filePath }),
  updateFile: (filePath: string, content: string) => 
    ipcRenderer.invoke('update-file', { filePath, content }),
  moveFileOrFolder: (sourcePath: string, targetPath: string) => 
    ipcRenderer.invoke('move-file-or-folder', { sourcePath, targetPath }),
  copyFile: (sourcePath: string, targetPath: string) => 
    ipcRenderer.invoke('copy-file', { sourcePath, targetPath }),

  // 工作空间 API
  createWorkspace: (path: string) => 
    ipcRenderer.invoke('create-workspace', { path }),
  validateWorkspace: (path: string) => 
    ipcRenderer.invoke('validate-workspace', { path }),
  getDefaultWorkspacePath: () => 
    ipcRenderer.invoke('get-default-workspace-path'),
  openWorkspaceFolder: (path: string) => 
    ipcRenderer.invoke('open-workspace-folder', { path }),
  
  // 窗口管理 API
  setWindowTitle: (title: string) =>
    ipcRenderer.invoke('set-window-title', { title }),

  // ========== AI 配置管理 ==========
  aiGetConfig: () => ipcRenderer.invoke('ai:get-config'),
  aiSetConfig: (config: any) => ipcRenderer.invoke('ai:set-config', config),
  aiIsEnabled: () => ipcRenderer.invoke('ai:is-enabled'),
  aiGetServiceConfig: () => ipcRenderer.invoke('ai:get-service-config'),

  // ========== AI 文本生成 ==========
  aiGenerateText: (prompt: string, options?: any) =>
    ipcRenderer.invoke('ai:generate-text', { prompt, options }),
  aiStreamText: (prompt: string, options?: any) =>
    ipcRenderer.invoke('ai:stream-text', { prompt, options }),

  // 监听 AI 流式响应事件
  onAIStreamChunk: (callback: (data: { text: string }) => void) =>
    ipcRenderer.on('ai:stream-chunk', (_, data) => callback(data)),
  onAIStreamEnd: (callback: () => void) =>
    ipcRenderer.once('ai:stream-end', () => callback()),
  onAIStreamError: (callback: (data: { error: string }) => void) =>
    ipcRenderer.once('ai:stream-error', (_, data) => callback(data)),

  // ========== AI 写作辅助 ==========
  aiContinueWriting: (params: {
    content: string;
    cursorPosition: { line: number; ch: number };
    selection: { start: { line: number; ch: number }; end: { line: number; ch: number } } | null;
    documentPath: string;
  }) => ipcRenderer.invoke('ai:continue-writing', params),

  aiPolishText: (text: string, style: string) =>
    ipcRenderer.invoke('ai:polish-text', { text, style }),
  aiExpandText: (text: string, targetLength?: number) =>
    ipcRenderer.invoke('ai:expand-text', { text, targetLength }),
  aiSummarizeText: (text: string) =>
    ipcRenderer.invoke('ai:summarize-text', { text }),

  // ========== AI 大纲生成 ==========
  aiGenerateOutline: (topic: string, style: string) =>
    ipcRenderer.invoke('ai:generate-outline', { topic, style }),

  // ========== AI 内容分析 ==========
  aiAnalyzeContent: (content: string) =>
    ipcRenderer.invoke('ai:analyze-content', { content }),
  aiExtractKeywords: (content: string) =>
    ipcRenderer.invoke('ai:extract-keywords', { content }),
  aiSuggestTags: (content: string) =>
    ipcRenderer.invoke('ai:suggest-tags', { content }),

  // ========== 图片生成 ==========
  imageGenerate: (prompt: string, options?: any) =>
    ipcRenderer.invoke('image:generate', { prompt, options }),
  imageSaveApiKey: (apiKey: string) =>
    ipcRenderer.invoke('image:save-api-key', { apiKey }),
  imageGetApiKey: () =>
    ipcRenderer.invoke('image:get-api-key'),
  imageSuggest: (content: string) =>
    ipcRenderer.invoke('image:suggest', { content }),
  imageRemoveBackground: (imageData: string) =>
    ipcRenderer.invoke('image:remove-background', { imageData }),
  imageTransformStyle: (imageData: string, style: string) =>
    ipcRenderer.invoke('image:transform-style', { imageData, style }),
  imageSelectFile: () =>
    ipcRenderer.invoke('image:select-file'),

  // ========== 模板系统 ==========
  templateGetAll: () =>
    ipcRenderer.invoke('template:get-all'),
  templateGetByCategory: (category: string) =>
    ipcRenderer.invoke('template:get-by-category', { category }),
  templateSearch: (query: string) =>
    ipcRenderer.invoke('template:search', { query }),
  templateApply: (content: string, templateId: string) =>
    ipcRenderer.invoke('template:apply', { content, templateId }),
  templateGetDetails: (templateId: string) =>
    ipcRenderer.invoke('template:get-details', { templateId }),
  templateAdd: (template: any) =>
    ipcRenderer.invoke('template:add', { template }),
  templateRemove: (templateId: string) =>
    ipcRenderer.invoke('template:remove', { templateId }),

  // ========== 多平台发布 ==========
  publishGetPlatforms: () =>
    ipcRenderer.invoke('publish:get-platforms'),
  publishToPlatforms: (content: string, metadata: any, platforms: string[]) =>
    ipcRenderer.invoke('publish:to-platforms', { content, metadata, platforms }),
  publishPreviewPlatform: (content: string, metadata: any, platform: string) =>
    ipcRenderer.invoke('publish:preview-platform', { content, metadata, platform }),
  publishSaveCredentials: (platform: string, credentials: any) =>
    ipcRenderer.invoke('publish:save-credentials', { platform, credentials }),
  publishValidateCredentials: (platform: string, credentials: any) =>
    ipcRenderer.invoke('publish:validate-credentials', { platform, credentials }),
  publishExportFile: (content: string, metadata: any, format: string, filePath: string) =>
    ipcRenderer.invoke('publish:export-file', { content, metadata, format, filePath }),
  publishSelectSavePath: () =>
    ipcRenderer.invoke('publish:select-save-path'),

  // ========== 向量存储与语义搜索 ==========
  vectorSemanticSearch: (query: string, options?: any) =>
    ipcRenderer.invoke('vector:semantic-search', { query, options }),
  vectorHybridSearch: (query: string, options?: any) =>
    ipcRenderer.invoke('vector:hybrid-search', { query, options }),
  vectorQuestionAnswer: (question: string, topK?: number) =>
    ipcRenderer.invoke('vector:question-answer', { question, topK }),
  vectorIndexDocument: (content: string, metadata: any) =>
    ipcRenderer.invoke('vector:index-document', { content, metadata }),
  vectorFindSimilar: (documentId: string, topK?: number) =>
    ipcRenderer.invoke('vector:find-similar', { documentId, topK }),
  vectorGraphStats: () =>
    ipcRenderer.invoke('vector:graph-stats'),
  vectorGetRelated: (documentId: string, maxDepth?: number) =>
    ipcRenderer.invoke('vector:get-related', { documentId, maxDepth }),
  vectorGraphVisualization: () =>
    ipcRenderer.invoke('vector:graph-visualization'),
  vectorAnalyzeRelations: (documentId: string) =>
    ipcRenderer.invoke('vector:analyze-relations', { documentId }),
  vectorGetChunks: (documentId: string) =>
    ipcRenderer.invoke('vector:get-chunks', { documentId }),
  vectorRemoveDocument: (documentId: string) =>
    ipcRenderer.invoke('vector:remove-document', { documentId }),
  vectorClearStore: () =>
    ipcRenderer.invoke('vector:clear-store'),
  vectorSimilarity: (text1: string, text2: string) =>
    ipcRenderer.invoke('vector:similarity', { text1, text2 }),
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('$api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.$api = api
}
