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

  // ========== 图片生成 ==========
  imageGenerate: (prompt: string, options?: {
    size?: '256x256' | '512x512' | '768x768' | '1024x1024'
    style?: 'natural' | 'vivid' | 'precise'
    quality?: 'standard' | 'hd'
    steps?: number
    cfg_scale?: number
    seed?: number
    negative_prompt?: string
  }) => Promise<{
    success: boolean
    image?: {
      url: string
      base64?: string
      width: number
      height: number
      seed: number
      revised_prompt?: string
    }
    error?: string
  }>

  imageSaveApiKey: (apiKey: string) => Promise<{
    success: boolean
    error?: string
  }>

  imageGetApiKey: () => Promise<{
    success: boolean
    apiKey: string
  }>

  imageSuggest: (content: string) => Promise<{
    success: boolean
    suggestions?: Array<{
      position: number
      prompt: string
      reason: string
    }>
    error?: string
  }>

  imageRemoveBackground: (imageData: string) => Promise<{
    success: boolean
    result?: string
    error?: string
  }>

  imageTransformStyle: (imageData: string, style: 'cartoon' | 'sketch' | 'oil' | 'watercolor') => Promise<{
    success: boolean
    result?: string
    error?: string
  }>

  imageSelectFile: () => Promise<{
    canceled: boolean
    filePath?: string
    base64?: string
  }>

  // ========== 模板系统 ==========
  templateGetAll: () => Promise<{
    success: boolean
    templates?: Array<{
      id: string
      name: string
      description: string
      preview: string
      category: 'blog' | 'academic' | 'technical' | 'news' | 'creative'
      tags: string[]
    }>
    error?: string
  }>

  templateGetByCategory: (category: 'blog' | 'academic' | 'technical' | 'news' | 'creative') => Promise<{
    success: boolean
    templates?: any[]
    error?: string
  }>

  templateSearch: (query: string) => Promise<{
    success: boolean
    templates?: any[]
    error?: string
  }>

  templateApply: (content: string, templateId: string) => Promise<{
    success: boolean
    html?: string
    error?: string
  }>

  templateGetDetails: (templateId: string) => Promise<{
    success: boolean
    template?: any
    error?: string
  }>

  templateAdd: (template: any) => Promise<{
    success: boolean
    error?: string
  }>

  templateRemove: (templateId: string) => Promise<{
    success: boolean
    removed: boolean
    error?: string
  }>

  // ========== 多平台发布 ==========
  publishGetPlatforms: () => Promise<{
    success: boolean
    platforms?: Array<{
      id: string
      name: string
      icon: string
      requiresAccount: boolean
    }>
    error?: string
  }>

  publishToPlatforms: (content: string, metadata: any, platforms: string[]) => Promise<{
    success: boolean
    results?: Array<{
      platform: string
      success: boolean
      url?: string
      error?: string
    }>
    error?: string
  }>

  publishPreviewPlatform: (content: string, metadata: any, platform: string) => Promise<{
    success: boolean
    preview?: {
      content: string
      metadata: any
    }
    error?: string
  }>

  publishSaveCredentials: (platform: string, credentials: any) => Promise<{
    success: boolean
    error?: string
  }>

  publishValidateCredentials: (platform: string, credentials: any) => Promise<{
    success: boolean
    valid: boolean
    error?: string
  }>

  publishExportFile: (content: string, metadata: any, format: string, filePath: string) => Promise<{
    success: boolean
    error?: string
  }>

  publishSelectSavePath: () => Promise<{
    canceled: boolean
    filePath?: string
  }>

  // ========== 向量存储与语义搜索 ==========
  vectorSemanticSearch: (query: string, options?: {
    topK?: number
    minScore?: number
    filter?: {
      documentPath?: string
      tags?: string[]
      contentType?: string
      dateRange?: { start: number; end: number }
    }
    rerank?: boolean
  }) => Promise<{
    success: boolean
    results?: Array<{
      chunk: {
        id: string
        documentId: string
        documentPath: string
        chunkIndex: number
        content: string
        metadata: any
      }
      score: number
      relevance: 'high' | 'medium' | 'low'
    }>
    query?: string
    totalFound?: number
    error?: string
  }>

  vectorHybridSearch: (query: string, options?: any) => Promise<{
    success: boolean
    results?: any[]
    error?: string
  }>

  vectorQuestionAnswer: (question: string, topK?: number) => Promise<{
    success: boolean
    answer?: string
    sources?: any[]
    confidence?: number
    error?: string
  }>

  vectorIndexDocument: (content: string, metadata: {
    title: string
    path: string
    contentType: string
    tags?: string[]
  }) => Promise<{
    success: boolean
    error?: string
  }>

  vectorFindSimilar: (documentId: string, topK?: number) => Promise<{
    success: boolean
    results?: Array<{ documentId: string; score: string }>
    error?: string
  }>

  vectorGraphStats: () => Promise<{
    success: boolean
    stats?: {
      nodeCount: number
      edgeCount: number
      documentCount: number
      tagCount: number
      topicCount: number
    }
    error?: string
  }>

  vectorGetRelated: (documentId: string, maxDepth?: number) => Promise<{
    success: boolean
    direct?: string[]
    indirect?: string[]
    error?: string
  }>

  vectorGraphVisualization: () => Promise<{
    success: boolean
    data?: {
      nodes: Array<{
        id: string
        label: string
        type: string
        data: any
      }>
      links: Array<{
        source: string
        target: string
        strength: number
        type: string
      }>
    }
    error?: string
  }>

  vectorAnalyzeRelations: (documentId: string) => Promise<{
    success: boolean
    relations?: any[]
    error?: string
  }>

  vectorGetChunks: (documentId: string) => Promise<{
    success: boolean
    chunks?: any[]
    error?: string
  }>

  vectorRemoveDocument: (documentId: string) => Promise<{
    success: boolean
    error?: string
  }>

  vectorClearStore: () => Promise<{
    success: boolean
    error?: string
  }>

  vectorSimilarity: (text1: string, text2: string) => Promise<{
    success: boolean
    similarity?: number
    error?: string
  }>

  // ========== MCP 插件系统 ==========
  mcpGetPlugins: () => Promise<{
    success: boolean
    plugins?: Array<{
      id: string
      name: string
      version: string
      description: string
      enabled: boolean
      tools: any[]
    }>
    error?: string
  }>

  mcpEnablePlugin: (pluginId: string) => Promise<{
    success: boolean
    error?: string
  }>

  mcpDisablePlugin: (pluginId: string) => Promise<{
    success: boolean
    error?: string
  }>

  mcpGetTools: () => Promise<{
    success: boolean
    tools?: any[]
    error?: string
  }>

  mcpSearchTools: (query: string) => Promise<{
    success: boolean
    tools?: any[]
    error?: string
  }>

  mcpExecuteTool: (toolName: string, params: any, context?: any) => Promise<{
    success: boolean
    result?: any
    error?: string
  }>

  mcpGetResources: () => Promise<{
    success: boolean
    resources?: any[]
    error?: string
  }>

  mcpGetResource: (uri: string, context?: any) => Promise<{
    success: boolean
    content?: string
    error?: string
  }>

  // ========== SKILL 系统 ==========
  skillGetAll: () => Promise<{
    success: boolean
    skills?: Array<{
      id: string
      name: string
      description: string
      category: 'writing' | 'editing' | 'analysis' | 'automation' | 'custom'
      version: string
      enabled: boolean
      tags?: string[]
      shortcut?: string
    }>
    error?: string
  }>

  skillGetByCategory: (category: string) => Promise<{
    success: boolean
    skills?: any[]
    error?: string
  }>

  skillSearch: (query: string) => Promise<{
    success: boolean
    skills?: any[]
    error?: string
  }>

  skillExecute: (skillId: string, context: any) => Promise<{
    success: boolean
    output?: any
    error?: string
    details?: {
      stepsExecuted: number
      executionTime: number
    }
  }>

  skillEnable: (skillId: string) => Promise<{
    success: boolean
    error?: string
  }>

  skillDisable: (skillId: string) => Promise<{
    success: boolean
    error?: string
  }>

  skillImport: (skillDefinition: any) => Promise<{
    success: boolean
    skill?: any
    error?: string
  }>

  skillExport: (skillId: string) => Promise<{
    success: boolean
    definition?: any
    error?: string
  }>

  skillRegister: (skill: any) => Promise<{
    success: boolean
    error?: string
  }>

  skillUnregister: (skillId: string) => Promise<{
    success: boolean
    error?: string
  }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    $api: LazyBoxAPI
  }
}
