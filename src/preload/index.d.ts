import { ElectronAPI } from '@electron-toolkit/preload'

interface FileNodeData {
  id: string
  name: string
  type: 'file' | 'folder'
  path: string
  parentId?: string
  children?: FileNodeData[]
  metadata?: {
    createdAt: Date
    updatedAt: Date
    size?: number
  }
}

interface LazyBoxAPI {
  onMessage: (callback: (...args: any[]) => void) => void
  
  // 旧版 API
  addPost2Local: (title: string, content: string) => Promise<string>
  renamePost: (originTitle: string, newTitle: string) => Promise<string>
  removePost: (title: string) => Promise<string>
  updatePost: (title: string, content: string) => Promise<string>
  getPost: (title: string) => Promise<string>
  importPost: () => Promise<string>

  // 新版文件树 API
  readDirectoryTree: (workspaceDir?: string) => Promise<FileNodeData[]>
  selectWorkspaceFolder: () => Promise<string>
  createFolder: (parentPath: string, folderName: string) => Promise<string>
  renameFolder: (oldPath: string, newName: string) => Promise<string>
  removeFolder: (folderPath: string) => Promise<string>
  createFile: (dirPath: string, fileName: string, content: string) => Promise<string>
  renameFile: (filePath: string, newName: string) => Promise<string>
  removeFile: (filePath: string) => Promise<string>
  readFile: (filePath: string) => Promise<string>
  readImageAsBase64: (filePath: string) => Promise<string>
  readPdfAsBase64: (filePath: string) => Promise<string>
  updateFile: (filePath: string, content: string) => Promise<string>
  moveFileOrFolder: (sourcePath: string, targetPath: string) => Promise<string>
  copyFile: (sourcePath: string, targetPath: string) => Promise<string>

  // 工作空间 API
  createWorkspace: (path: string) => Promise<boolean>
  validateWorkspace: (path: string) => Promise<boolean>
  getDefaultWorkspacePath: () => Promise<string>
  openWorkspaceFolder: (path: string) => Promise<void>

  // 窗口管理 API
  setWindowTitle: (title: string) => Promise<void>

  // ========== AI 配置管理 ==========
  aiGetConfig: () => Promise<{
    enabled: boolean
    provider: 'claude' | 'openai' | 'custom'
    apiKey: string
    model?: string
  }>
  aiSetConfig: (config: {
    enabled?: boolean
    provider?: 'claude' | 'openai' | 'custom'
    apiKey?: string
    model?: string
  }) => Promise<{ success: boolean }>
  aiIsEnabled: () => Promise<boolean>
  aiGetServiceConfig: () => Promise<{
    provider: 'claude' | 'openai' | 'custom'
    apiKey: string
    model?: string
  } | null>

  // ========== AI 文本生成 ==========
  aiGenerateText: (prompt: string, options?: {
    maxTokens?: number
    temperature?: number
    systemPrompt?: string
  }) => Promise<string>
  aiStreamText: (prompt: string, options?: {
    maxTokens?: number
    temperature?: number
    systemPrompt?: string
  }) => Promise<{ success: boolean }>

  // 监听 AI 流式响应事件
  onAIStreamChunk: (callback: (data: { text: string }) => void) => void
  onAIStreamEnd: (callback: () => void) => void
  onAIStreamError: (callback: (data: { error: string }) => void) => void

  // ========== AI 写作辅助 ==========
  aiContinueWriting: (params: {
    content: string
    cursorPosition: { line: number; ch: number }
    selection: { start: { line: number; ch: number }; end: { line: number; ch: number } } | null
    documentPath: string
  }) => Promise<string>

  aiPolishText: (text: string, style:
    | 'professional'
    | 'casual'
    | 'academic'
    | 'concise'
    | 'detailed'
    | 'humorous'
    | 'translate-zh'
    | 'translate-en'
  ) => Promise<string>

  aiExpandText: (text: string, targetLength?: number) => Promise<string>
  aiSummarizeText: (text: string) => Promise<string>

  // ========== AI 大纲生成 ==========
  aiGenerateOutline: (
    topic: string,
    style: 'blog' | 'tutorial' | 'academic' | 'technical' | 'news' | 'story'
  ) => Promise<{
    title: string
    outline: {
      sections: Array<{
        level: number
        title: string
        children?: Array<any>
      }>
    }
    estimatedWordCount: number
    suggestedTags: string[]
  }>

  // ========== AI 内容分析 ==========
  aiAnalyzeContent: (content: string) => Promise<{
    summary: string
    keywords: string[]
    sentiment: 'positive' | 'neutral' | 'negative'
    topics: string[]
    readabilityScore: number
    suggestedTags: string[]
  }>

  aiExtractKeywords: (content: string) => Promise<string[]>
  aiSuggestTags: (content: string) => Promise<string[]>

  // ========== AI 图片生成 ==========
  aiGenerateImage: (prompt: string, options?: {
    size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792'
    style?: 'natural' | 'vivid' | 'precise'
    quality?: 'standard' | 'hd'
    count?: number
  }) => Promise<{
    url: string
    revisedPrompt?: string
    width: number
    height: number
  }>

  aiSuggestImages: (content: string) => Promise<Array<{
    position: number
    prompt: string
    reason: string
  }>>
}

declare global {
  interface Window {
    electron: ElectronAPI
    $api: LazyBoxAPI
  }
}
