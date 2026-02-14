# LazyBox AI 技术需求文档 (TRD)

## 1. 技术架构概览

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                           LazyBox AI                                 │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Editor    │  │   Preview   │  │  File Tree  │  │  AI Panel   │ │
│  │   View      │  │   View      │  │    Panel    │  │    Panel    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Renderer Process (Vue 3)                   │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │  │
│  │  │  Store  │ │ Router  │ │  Utils  │ │AI Service│ │MCP Client│ │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │  │
│  └───────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Main Process (Electron)                    │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │  │
│  │  │  IPC    │ │  File   │ │  AI     │ │  MCP    │ │ Vector  │ │  │
│  │  │ Handler │ │ System  │ │ Service │ │ Server  │ │  Store  │ │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │  │
│  └───────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                        External Services                      │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │  │
│  │  │ Claude  │ │ OpenAI  │ │ SD/MJ   │ │ Platform│ │  Cloud  │ │  │
│  │  │  API    │ │  API    │ │  API    │ │  APIs   │ │ Storage │ │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 技术栈

#### 前端
- **框架**: Vue 3 + TypeScript
- **构建**: Vite + electron-vite
- **状态管理**: Pinia
- **UI 组件**: Radix Vue + UnoCSS
- **编辑器**: CodeMirror 5 (计划迁移到 CodeMirror 6)
- **Markdown**: marked + highlight.js + mermaid

#### 后端
- **框架**: Electron 28+
- **语言**: TypeScript/Node.js
- **存储**: SQLite (本地) + 可选云同步
- **向量数据库**: Chroma / SQLite VSS

#### AI 能力
- **LLM**: Claude API (主要) + OpenAI API (备选)
- **图像**: Stable Diffusion / Midjourney API
- **嵌入模型**: OpenAI text-embedding-3 / Cohere embed

#### 协议
- **MCP**: Model Context Protocol
- **SKILL**: Claude Skill System

---

## 2. 核心模块设计

### 2.1 AI 服务层 (AI Service)

#### 2.1.1 架构设计

```typescript
// src/main/ai/index.ts
interface AIServiceConfig {
  provider: 'claude' | 'openai' | 'custom';
  apiKey: string;
  baseURL?: string;
  model?: string;
}

interface AIService {
  // 文本生成
  generateText(prompt: string, options?: GenerationOptions): Promise<string>;
  continueWriting(context: WritingContext): Promise<string>;
  polishText(text: string, style: PolishStyle): Promise<string>;
  expandText(text: string, targetLength: number): Promise<string>;
  summarizeText(text: string): Promise<string>;

  // 大纲生成
  generateOutline(topic: string, style: OutlineStyle): Promise<Outline>;

  // 内容分析
  analyzeContent(content: string): Promise<ContentAnalysis>;
  extractKeywords(content: string): Promise<string[]>;
  suggestTags(content: string): Promise<string[]>;

  // 图片生成
  generateImage(prompt: string, options?: ImageOptions): Promise<GeneratedImage>;
  suggestImages(content: string): Promise<ImageSuggestion[]>;

  // 流式响应
  streamText(prompt: string, callback: StreamCallback): Promise<void>;
}
```

#### 2.1.2 实现

```typescript
// src/main/ai/providers/claude.ts
import Anthropic from '@anthropic-ai/sdk';

export class ClaudeAIProvider implements AIService {
  private client: Anthropic;
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }

  async generateText(prompt: string, options?: GenerationOptions): Promise<string> {
    const response = await this.client.messages.create({
      model: this.config.model || 'claude-3-5-sonnet-20241022',
      max_tokens: options?.maxTokens || 4096,
      messages: [{ role: 'user', content: prompt }],
      system: options?.systemPrompt,
    });

    return response.content[0].type === 'text'
      ? response.content[0].text
      : '';
  }

  async streamText(
    prompt: string,
    callback: StreamCallback,
    options?: GenerationOptions
  ): Promise<void> {
    const stream = await this.client.messages.create({
      model: this.config.model || 'claude-3-5-sonnet-20241022',
      max_tokens: options?.maxTokens || 4096,
      messages: [{ role: 'user', content: prompt }],
      system: options?.systemPrompt,
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          callback(event.delta.text);
        }
      }
    }
  }

  // ... 其他方法实现
}
```

### 2.2 上下文管理 (Context Management)

#### 2.2.1 写作上下文

```typescript
// src/main/ai/context.ts
interface WritingContext {
  // 文档基本信息
  documentId: string;
  documentPath: string;

  // 当前编辑位置
  cursorPosition: {
    line: number;
    ch: number;
  };

  // 周围内容
  beforeCursor: string;  // 光标前的内容
  afterCursor: string;   // 光标后的内容
  selectedText: string;  // 选中的文本

  // 文档结构
  documentStructure: {
    title?: string;
    headings: Heading[];
    outline: Outline;
  };

  // 文档元数据
  metadata: {
    wordCount: number;
    readingTime: number;
    tags: string[];
    category?: string;
  };

  // 相关文档
  relatedDocuments?: RelatedDocument[];
}

class ContextBuilder {
  async buildContext(
    editor: CodeMirror.Editor,
    documentPath: string
  ): Promise<WritingContext> {
    const content = editor.getValue();
    const cursor = editor.getCursor();
    const selection = editor.getSelection();

    return {
      documentId: this.getDocumentId(documentPath),
      documentPath,
      cursorPosition: cursor,
      beforeCursor: editor.getRange({ line: 0, ch: 0 }, cursor),
      afterCursor: editor.getRange(cursor, { line: editor.lineCount(), ch: 0 }),
      selectedText: selection,
      documentStructure: await this.analyzeStructure(content),
      metadata: this.analyzeMetadata(content),
      relatedDocuments: await this.findRelatedDocuments(documentPath),
    };
  }

  private async analyzeStructure(content: string) {
    // 使用 AI 或正则提取文档结构
    const headings = this.extractHeadings(content);
    const outline = this.buildOutline(headings);
    const title = headings[0]?.text;

    return { title, headings, outline };
  }
}
```

### 2.3 MCP 集成 (MCP Integration)

#### 2.3.1 MCP 客户端

```typescript
// src/main/mcp/client.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  enabled: boolean;
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

class MCPManager {
  private clients: Map<string, Client> = new Map();
  private configs: Map<string, MCPServerConfig> = new Map();

  async registerServer(config: MCPServerConfig): Promise<void> {
    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: config.env,
    });

    const client = new Client({
      name: `lazybox-${config.name}`,
      version: '1.0.0',
    }, {
      capabilities: {},
    });

    await client.connect(transport);
    await this.initializeClient(client);

    this.clients.set(config.name, client);
    this.configs.set(config.name, config);
  }

  async listTools(serverName: string): Promise<MCPTool[]> {
    const client = this.clients.get(serverName);
    if (!client) throw new Error(`Server ${serverName} not found`);

    const response = await client.listTools();
    return response.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  async callTool(
    serverName: string,
    toolName: string,
    args: any
  ): Promise<any> {
    const client = this.clients.get(serverName);
    if (!client) throw new Error(`Server ${serverName} not found`);

    const response = await client.callTool({
      name: toolName,
      arguments: args,
    });

    return response.content;
  }

  private async initializeClient(client: Client): Promise<void> {
    // 发送初始化请求
    await client.initialize();
  }
}
```

#### 2.3.2 MCP 工具调用集成

```typescript
// src/renderer/src/composables/useMCP.ts
export function useMCP() {
  const tools = ref<MCPTool[]>([]);
  const isLoading = ref(false);

  const loadTools = async (serverName: string) => {
    isLoading.value = true;
    try {
      tools.value = await window.$api.mcpListTools(serverName);
    } finally {
      isLoading.value = false;
    }
  };

  const callTool = async (serverName: string, toolName: string, args: any) => {
    return await window.$api.mcpCallTool(serverName, toolName, args);
  };

  const insertToolResult = async (
    editor: CodeMirror.Editor,
    serverName: string,
    toolName: string,
    args: any
  ) => {
    const result = await callTool(serverName, toolName, args);
    const cursor = editor.getCursor();
    editor.replaceRange(result, cursor);
  };

  return {
    tools,
    isLoading,
    loadTools,
    callTool,
    insertToolResult,
  };
}
```

### 2.4 Claude SKILL 系统

#### 2.4.1 SKILL 注册

```typescript
// src/main/skills/registry.ts
interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  version: string;

  // 触发条件
  trigger: {
    type: 'manual' | 'auto' | 'keyword';
    keywords?: string[];
  };

  // 执行配置
  execution: {
    type: 'prompt' | 'workflow' | 'mcp';
    prompt?: string;
    workflow?: WorkflowStep[];
    mcpServer?: string;
    mcpTool?: string;
  };

  // 参数定义
  parameters?: SkillParameter[];

  // 输出处理
  output?: {
    type: 'replace' | 'append' | 'prepend' | 'custom';
    format?: 'markdown' | 'html' | 'text';
  };
}

interface WorkflowStep {
  type: 'ai' | 'mcp' | 'transform';
  config: any;
}

class SkillRegistry {
  private skills: Map<string, SkillDefinition> = new Map();
  private skillsPath: string;

  constructor(skillsPath: string) {
    this.skillsPath = skillsPath;
    this.loadSkills();
  }

  async registerSkill(skill: SkillDefinition): Promise<void> {
    // 验证 SKILL 定义
    this.validateSkill(skill);

    // 保存到文件
    await this.saveSkillFile(skill);

    // 注册到内存
    this.skills.set(skill.id, skill);
  }

  async executeSkill(
    skillId: string,
    context: WritingContext,
    parameters?: Record<string, any>
  ): Promise<SkillResult> {
    const skill = this.skills.get(skillId);
    if (!skill) throw new Error(`Skill ${skillId} not found`);

    switch (skill.execution.type) {
      case 'prompt':
        return await this.executePromptSkill(skill, context, parameters);
      case 'workflow':
        return await this.executeWorkflowSkill(skill, context, parameters);
      case 'mcp':
        return await this.executeMCPSkill(skill, context, parameters);
      default:
        throw new Error(`Unknown execution type: ${skill.execution.type}`);
    }
  }

  private async executePromptSkill(
    skill: SkillDefinition,
    context: WritingContext,
    parameters?: Record<string, any>
  ): Promise<SkillResult> {
    const prompt = this.buildPrompt(skill.execution.prompt!, context, parameters);
    const aiService = getAIService();

    const result = await aiService.generateText(prompt, {
      systemPrompt: `You are ${skill.name}. ${skill.description}`,
    });

    return {
      content: result,
      type: skill.output?.type || 'replace',
    };
  }

  private buildPrompt(
    template: string,
    context: WritingContext,
    parameters?: Record<string, any>
  ): string {
    // 替换模板变量
    return template
      .replace('{{content}}', context.beforeCursor + context.afterCursor)
      .replace('{{selection}}', context.selectedText)
      .replace('{{title}}', context.documentStructure.title || '')
      .replace('{{outline}}', JSON.stringify(context.documentStructure.outline));
  }
}
```

#### 2.4.2 内置 SKILL 示例

```typescript
// src/main/skills/builtin/technical-blog.ts
export const technicalBlogSkill: SkillDefinition = {
  id: 'technical-blog-writer',
  name: '技术博客写作助手',
  description: '专门用于编写技术博客文章的 AI 助手',
  version: '1.0.0',

  trigger: {
    type: 'manual',
  },

  execution: {
    type: 'workflow',
    workflow: [
      {
        type: 'ai',
        config: {
          action: 'analyze',
          prompt: '分析当前内容，识别技术主题、目标受众和写作风格',
        },
      },
      {
        type: 'ai',
        config: {
          action: 'suggest',
          prompt: '基于分析结果，提供内容改进建议，包括：\n' +
                  '1. 技术准确性检查\n' +
                  '2. 代码示例优化\n' +
                  '3. 结构调整建议\n' +
                  '4. 可读性改进',
        },
      },
      {
        type: 'transform',
        config: {
          format: 'markdown',
          applySuggestions: true,
        },
      },
    ],
  },

  parameters: [
    {
      name: 'audience',
      type: 'select',
      options: ['初学者', '中级开发者', '专家'],
      default: '中级开发者',
    },
    {
      name: 'style',
      type: 'select',
      options: ['正式', '轻松', '教学'],
      default: '教学',
    },
  ],

  output: {
    type: 'replace',
    format: 'markdown',
  },
};
```

### 2.5 向量存储与检索

#### 2.5.1 向量化服务

```typescript
// src/main/vector/index.ts
import { ChromaClient } from 'chromadb';
import { OpenAI } from 'openai';

interface DocumentChunk {
  id: string;
  documentPath: string;
  content: string;
  metadata: {
    title: string;
    heading?: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
  };
}

class VectorStore {
  private chroma: ChromaClient;
  private embeddingModel: OpenAI;
  private collection: any;

  constructor() {
    this.chroma = new ChromaClient({
      path: './chroma_db',
    });

    this.embeddingModel = new OpenAI({
      apiKey: config.openaiApiKey,
    });

    this.initializeCollection();
  }

  private async initializeCollection() {
    this.collection = await this.chroma.getOrCreateCollection({
      name: 'lazybox_documents',
    });
  }

  async indexDocument(documentPath: string, content: string): Promise<void> {
    const chunks = await this.chunkContent(content);

    for (const chunk of chunks) {
      const embedding = await this.generateEmbedding(chunk.content);

      await this.collection.add({
        ids: [chunk.id],
        embeddings: [embedding],
        metadatas: [{
          documentPath,
          title: chunk.metadata.title,
          heading: chunk.metadata.heading,
          tags: chunk.metadata.tags,
        }],
        documents: [chunk.content],
      });
    }
  }

  async searchSimilar(
    query: string,
    options?: {
      nResults?: number;
      documentPath?: string;
      tags?: string[];
    }
  ): Promise<SimilarDocument[]> {
    const queryEmbedding = await this.generateEmbedding(query);

    const results = await this.collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: options?.nResults || 5,
      where: options?.documentPath
        ? { documentPath: options.documentPath }
        : undefined,
    });

    return results.documents[0].map((doc: string, i: number) => ({
      content: doc,
      metadata: results.metadatas[0][i],
      distance: results.distances[0][i],
    }));
  }

  private async chunkContent(content: string): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];

    // 按标题分块
    const sections = content.split(/^#{1,3}\s+.+$/gm);
    let currentContent = '';
    let chunkId = 0;

    for (const section of sections) {
      if (currentContent.length + section.length > 1000) {
        chunks.push({
          id: `${Date.now()}-${chunkId++}`,
          documentPath: '',
          content: currentContent,
          metadata: {},
        });
        currentContent = section;
      } else {
        currentContent += section;
      }
    }

    return chunks;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.embeddingModel.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  }
}
```

### 2.6 多平台发布适配器

#### 2.6.1 平台适配器接口

```typescript
// src/main/publishers/adapters.ts
interface PublishAdapter {
  name: string;
  displayName: string;

  // 格式转换
  transform(content: string, metadata: PublishMetadata): Promise<TransformedContent>;

  // 发布
  publish(content: TransformedContent, credentials: Credentials): Promise<PublishResult>;

  // 验证凭证
  validateCredentials(credentials: Credentials): Promise<boolean>;

  // 获取发布历史
  getPublishHistory?(credentials: Credentials): Promise<PublishRecord[]>;

  // 支持的格式
  supportedFormats: string[];
}

interface PublishMetadata {
  title: string;
  author?: string;
  tags: string[];
  category?: string;
  summary?: string;
  coverImage?: string;
  publishTime?: Date;
}

interface TransformedContent {
  content: string;
  metadata: Record<string, any>;
  html?: string;
  assets?: Asset[];
}

// 微信公众号适配器
class WeChatAdapter implements PublishAdapter {
  name = 'wechat';
  displayName = '微信公众号';

  async transform(content: string, metadata: PublishMetadata): Promise<TransformedContent> {
    // 使用现有的微信渲染逻辑
    const renderer = getRenderer();
    const html = renderer.render(content, {
      platform: 'wechat',
      theme: 'default',
    });

    return {
      content,
      html,
      metadata: {
        title: metadata.title,
        author: metadata.author,
        digest: metadata.summary,
      },
    };
  }

  async publish(content: TransformedContent, credentials: Credentials): Promise<PublishResult> {
    // 调用微信公众号 API
    const api = new WeChatAPI(credentials.accessToken);
    const result = await api.uploadArticle({
      title: content.metadata.title,
      content: content.html,
      digest: content.metadata.digest,
    });

    return {
      success: true,
      url: result.url,
      publishedAt: new Date(),
    };
  }

  async validateCredentials(credentials: Credentials): Promise<boolean> {
    // 验证微信 access_token
    return true;
  }

  supportedFormats = ['markdown', 'html'];
}

// 知乎适配器
class ZhihuAdapter implements PublishAdapter {
  name = 'zhihu';
  displayName = '知乎';

  async transform(content: string, metadata: PublishMetadata): Promise<TransformedContent> {
    // 转换为知乎格式
    const html = await this.convertToZhihuFormat(content);

    return {
      content,
      html,
      metadata: {
        title: metadata.title,
        excerpt: metadata.summary,
      },
    };
  }

  async publish(content: TransformedContent, credentials: Credentials): Promise<PublishResult> {
    // 调用知乎 API
    return { success: true, url: '', publishedAt: new Date() };
  }

  async validateCredentials(credentials: Credentials): Promise<boolean> {
    return true;
  }

  supportedFormats = ['markdown'];

  private async convertToZhihuFormat(markdown: string): Promise<string> {
    // 知乎特定的格式转换逻辑
    return markdown;
  }
}

// 发布管理器
class PublishManager {
  private adapters: Map<string, PublishAdapter> = new Map();

  constructor() {
    this.registerDefaultAdapters();
  }

  registerAdapter(adapter: PublishAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  getAdapter(name: string): PublishAdapter | undefined {
    return this.adapters.get(name);
  }

  async publishToPlatforms(
    content: string,
    metadata: PublishMetadata,
    platforms: string[]
  ): Promise<Map<string, PublishResult>> {
    const results = new Map<string, PublishResult>();

    for (const platformName of platforms) {
      const adapter = this.getAdapter(platformName);
      if (!adapter) {
        results.set(platformName, {
          success: false,
          error: `Platform ${platformName} not supported`,
        });
        continue;
      }

      try {
        const transformed = await adapter.transform(content, metadata);
        const credentials = await this.getCredentials(platformName);
        const result = await adapter.publish(transformed, credentials);
        results.set(platformName, result);
      } catch (error) {
        results.set(platformName, {
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  private registerDefaultAdapters(): void {
    this.registerAdapter(new WeChatAdapter());
    this.registerAdapter(new ZhihuAdapter());
    this.registerAdapter(new JuejinAdapter());
    this.registerAdapter(new YuqueAdapter());
  }
}
```

### 2.7 IPC 通信扩展

#### 2.7.1 AI 相关 IPC

```typescript
// src/main/ipc-ai.ts
export function registerAIIPCHandlers(): void {
  // AI 文本生成
  ipcMain.handle('ai:generate-text', async (_, { prompt, options }) => {
    const aiService = getAIService();
    return await aiService.generateText(prompt, options);
  });

  // AI 流式生成
  ipcMain.on('ai:stream-text', async (event, { prompt, options }) => {
    const aiService = getAIService();
    await aiService.streamText(
      prompt,
      (text) => {
        event.sender.send('ai:stream-chunk', { text });
      },
      options
    );
    event.sender.send('ai:stream-end');
  });

  // AI 续写
  ipcMain.handle('ai:continue-writing', async (_, { context }) => {
    const aiService = getAIService();
    return await aiService.continueWriting(context);
  });

  // AI 润色
  ipcMain.handle('ai:polish-text', async (_, { text, style }) => {
    const aiService = getAIService();
    return await aiService.polishText(text, style);
  });

  // AI 生图
  ipcMain.handle('ai:generate-image', async (_, { prompt, options }) => {
    const aiService = getAIService();
    return await aiService.generateImage(prompt, options);
  });

  // 大纲生成
  ipcMain.handle('ai:generate-outline', async (_, { topic, style }) => {
    const aiService = getAIService();
    return await aiService.generateOutline(topic, style);
  });

  // 内容分析
  ipcMain.handle('ai:analyze-content', async (_, { content }) => {
    const aiService = getAIService();
    return await aiService.analyzeContent(content);
  });

  // 向量搜索
  ipcMain.handle('vector:search', async (_, { query, options }) => {
    const vectorStore = getVectorStore();
    return await vectorStore.searchSimilar(query, options);
  });

  // 文档索引
  ipcMain.handle('vector:index-document', async (_, { path, content }) => {
    const vectorStore = getVectorStore();
    return await vectorStore.indexDocument(path, content);
  });
}
```

#### 2.7.2 MCP 相关 IPC

```typescript
// src/main/ipc-mcp.ts
export function registerMCPIPCHandlers(): void {
  // 注册 MCP 服务器
  ipcMain.handle('mcp:register-server', async (_, { config }) => {
    const mcpManager = getMCPManager();
    return await mcpManager.registerServer(config);
  });

  // 列出 MCP 工具
  ipcMain.handle('mcp:list-tools', async (_, { serverName }) => {
    const mcpManager = getMCPManager();
    return await mcpManager.listTools(serverName);
  });

  // 调用 MCP 工具
  ipcMain.handle('mcp:call-tool', async (_, { serverName, toolName, args }) => {
    const mcpManager = getMCPManager();
    return await mcpManager.callTool(serverName, toolName, args);
  });

  // 获取已注册服务器列表
  ipcMain.handle('mcp:list-servers', async () => {
    const mcpManager = getMCPManager();
    return mcpManager.listServers();
  });
}
```

#### 2.7.3 SKILL 相关 IPC

```typescript
// src/main/ipc-skill.ts
export function registerSkillIPCHandlers(): void {
  // 执行 SKILL
  ipcMain.handle('skill:execute', async (_, { skillId, context, parameters }) => {
    const registry = getSkillRegistry();
    return await registry.executeSkill(skillId, context, parameters);
  });

  // 列出可用 SKILL
  ipcMain.handle('skill:list', async () => {
    const registry = getSkillRegistry();
    return registry.listSkills();
  });

  // 注册自定义 SKILL
  ipcMain.handle('skill:register', async (_, { skill }) => {
    const registry = getSkillRegistry();
    return await registry.registerSkill(skill);
  });
}
```

---

## 3. 数据模型

### 3.1 数据库 Schema

```sql
-- 工作空间表
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  icon TEXT,
  description TEXT,
  created_at TEXT NOT NULL,
  last_opened TEXT NOT NULL,
  settings TEXT -- JSON
);

-- 文档表
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  path TEXT NOT NULL,
  title TEXT,
  content_hash TEXT,
  word_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  metadata TEXT, -- JSON: tags, category, etc.
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- 文档标签表
CREATE TABLE document_tags (
  document_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY (document_id, tag),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- AI 操作历史表
CREATE TABLE ai_operations (
  id TEXT PRIMARY KEY,
  document_id TEXT,
  operation_type TEXT NOT NULL, -- 'generate', 'polish', 'expand', etc.
  input_text TEXT,
  output_text TEXT,
  model TEXT NOT NULL,
  tokens_used INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
);

-- 发布记录表
CREATE TABLE publish_records (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  platform_post_id TEXT,
  platform_post_url TEXT,
  status TEXT NOT NULL, -- 'pending', 'published', 'failed'
  published_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- SKILL 执行记录表
CREATE TABLE skill_executions (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  document_id TEXT,
  parameters TEXT, -- JSON
  result TEXT,
  executed_at TEXT NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
);

-- MCP 服务器配置表
CREATE TABLE mcp_servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  command TEXT NOT NULL,
  args TEXT, -- JSON array
  env TEXT, -- JSON object
  enabled INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);
```

### 3.2 文件系统结构

```
~/.lazybox/
├── config/
│   ├── app.json              # 应用配置
│   ├── ai.json               # AI 服务配置
│   ├── skills/               # SKILL 定义
│   │   ├── builtin/          # 内置 SKILL
│   │   └── custom/           # 用户自定义 SKILL
│   └── platforms/            # 平台配置
│       └── credentials.json  # 加密的平台凭证
├── data/
│   ├── lazybox.db            # SQLite 数据库
│   └── chroma_db/            # 向量数据库
├── cache/
│   ├── ai/                   # AI 生成缓存
│   ├── images/               # 生成的图片
│   └── embeddings/           # 嵌入向量缓存
├── logs/
│   ├── ai.log
│   ├── mcp.log
│   └── app.log
└── temp/
    └── uploads/
```

---

## 4. 安全性设计

### 4.1 API 密钥管理

```typescript
// src/main/security/credentials.ts
import { safeStorage } from 'electron';

class CredentialManager {
  private readonly servicePrefix = 'lazybox-';

  async setCredential(platform: string, key: string, value: string): Promise<void> {
    const encrypted = safeStorage.encryptString(value);
    await store.set(`${this.servicePrefix}${platform}.${key}`, encrypted);
  }

  async getCredential(platform: string, key: string): Promise<string | null> {
    const encrypted = await store.get(`${this.servicePrefix}${platform}.${key}`);
    if (!encrypted) return null;

    return safeStorage.decryptString(encrypted);
  }

  async deleteCredential(platform: string, key: string): Promise<void> {
    await store.delete(`${this.servicePrefix}${platform}.${key}`);
  }
}
```

### 4.2 内容安全检查

```typescript
// src/main/ai/safety.ts
interface SafetyCheckResult {
  isSafe: boolean;
  issues: SafetyIssue[];
}

interface SafetyIssue {
  type: 'sensitive_word' | 'policy_violation' | 'copyright';
  severity: 'low' | 'medium' | 'high';
  message: string;
  position?: { line: number; ch: number };
}

class SafetyChecker {
  async checkContent(content: string): Promise<SafetyCheckResult> {
    const issues: SafetyIssue[] = [];

    // 检查敏感词
    const sensitiveWords = await this.checkSensitiveWords(content);
    issues.push(...sensitiveWords);

    // 检查版权内容
    const copyrightIssues = await this.checkCopyright(content);
    issues.push(...copyrightIssues);

    return {
      isSafe: issues.filter(i => i.severity === 'high').length === 0,
      issues,
    };
  }

  private async checkSensitiveWords(content: string): Promise<SafetyIssue[]> {
    // 实现敏感词检查逻辑
    return [];
  }

  private async checkCopyright(content: string): Promise<SafetyIssue[]> {
    // 实现版权检查逻辑
    return [];
  }
}
```

---

## 5. 性能优化

### 5.1 AI 响应缓存

```typescript
// src/main/ai/cache.ts
interface CacheEntry {
  key: string;
  response: any;
  timestamp: number;
  expiresAt: number;
}

class ResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private ttl = 24 * 60 * 60 * 1000; // 24 hours

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.response;
  }

  set(key: string, response: any): void {
    this.cache.set(key, {
      key,
      response,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.ttl,
    });
  }

  generateKey(prompt: string, options: any): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify({ prompt, options }))
      .digest('hex');
  }
}
```

### 5.2 流式响应处理

```typescript
// src/renderer/src/composables/useStreamingAI.ts
export function useStreamingAI() {
  const isStreaming = ref(false);
  const streamedText = ref('');
  const controller = ref<AbortController | null>(null);

  const streamGenerate = async (
    prompt: string,
    options?: GenerationOptions,
    onChunk?: (text: string) => void
  ) => {
    isStreaming.value = true;
    streamedText.value = '';
    controller.value = new AbortController();

    try {
      await window.$api.aiStreamText(
        { prompt, options },
        { signal: controller.value.signal }
      );

      // 监听流式响应
      window.$api.onAIStreamChunk(({ text }) => {
        streamedText.value += text;
        onChunk?.(text);
      });

      await new Promise(resolve => {
        window.$api.onAIStreamEnd(resolve);
      });
    } finally {
      isStreaming.value = false;
      controller.value = null;
    }
  };

  const cancelStream = () => {
    controller.value?.abort();
  };

  return {
    isStreaming,
    streamedText,
    streamGenerate,
    cancelStream,
  };
}
```

---

## 6. 测试策略

### 6.1 单元测试

```typescript
// tests/ai/claude-provider.test.ts
import { describe, it, expect } from 'vitest';
import { ClaudeAIProvider } from '../../src/main/ai/providers/claude';

describe('ClaudeAIProvider', () => {
  it('should generate text', async () => {
    const provider = new ClaudeAIProvider({
      provider: 'claude',
      apiKey: 'test-key',
    });

    const result = await provider.generateText('Hello');
    expect(result).toBeTruthy();
  });

  it('should stream text', async () => {
    const provider = new ClaudeAIProvider({
      provider: 'claude',
      apiKey: 'test-key',
    });

    const chunks: string[] = [];
    await provider.streamText('Hello', (chunk) => {
      chunks.push(chunk);
    });

    expect(chunks.length).toBeGreaterThan(0);
  });
});
```

### 6.2 集成测试

```typescript
// tests/integration/skill-execution.test.ts
import { describe, it, expect } from 'vitest';
import { SkillRegistry } from '../../src/main/skills/registry';

describe('Skill Execution Integration', () => {
  it('should execute technical blog skill', async () => {
    const registry = new SkillRegistry('./skills');
    const result = await registry.executeSkill(
      'technical-blog-writer',
      {
        documentPath: '/test.md',
        beforeCursor: '# React Hooks\n',
        selectedText: '',
        afterCursor: '',
      },
      { audience: '初学者' }
    );

    expect(result.content).toBeTruthy();
  });
});
```

---

## 7. 部署与发布

### 7.1 更新机制

```typescript
// src/main/updater.ts
import { autoUpdater } from 'electron-updater';

class AppUpdater {
  constructor() {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'your-org',
      repo: 'lazybox',
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    autoUpdater.on('update-available', (info) => {
      // 通知用户有更新
    });

    autoUpdater.on('update-downloaded', (info) => {
      // 提示用户安装更新
    });
  }

  checkForUpdates() {
    autoUpdater.checkForUpdates();
  }
}
```

### 7.2 打包配置

```json
// electron-builder.json
{
  "appId": "com.lazybox.app",
  "productName": "LazyBox",
  "directories": {
    "output": "dist"
  },
  "files": [
    "out/**/*",
    "resources/**/*"
  ],
  "mac": {
    "category": "public.app-category.productivity",
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "build/entitlements.mac.plist",
    "entitlementsInherit": "build/entitlements.mac.plist"
  },
  "win": {
    "target": ["nsis"],
    "artifactName": "${productName}-${version}-${arch}.${ext}"
  },
  "linux": {
    "target": ["AppImage", "deb"],
    "category": "Office"
  },
  "publish": {
    "provider": "github",
    "owner": "your-org",
    "repo": "lazybox"
  }
}
```

---

## 8. 开发阶段规划

### Phase 1: AI 基础能力 (4周)
- [ ] AI 服务层搭建
- [ ] Claude/OpenAI 集成
- [ ] 基础 Prompt 模板
- [ ] 流式响应支持
- [ ] AI 面板 UI

### Phase 2: SKILL 系统 (3周)
- [ ] SKILL 注册表
- [ ] 内置 SKILL 实现
- [ ] SKILL 执行引擎
- [ ] 自定义 SKILL 编辑器

### Phase 3: MCP 集成 (3周)
- [ ] MCP 客户端实现
- [ ] MCP 服务器管理
- [ ] MCP 工具调用 UI
- [ ] MCP 市场雏形

### Phase 4: 向量搜索 (2周)
- [ ] Chroma 集成
- [ ] 文档索引
- [ ] 语义搜索
- [ ] 相关文档推荐

### Phase 5: 多平台发布 (4周)
- [ ] 发布适配器框架
- [ ] 微信/知乎/掘金适配器
- [ ] 凭证管理
- [ ] 批量发布

### Phase 6: AI 生图 (2周)
- [ ] SD/MJ API 集成
- [ ] 图片生成 UI
- [ ] 图片优化工具

---

## 9. API 参考

### 9.1 AI 服务 API

```typescript
// 生成文本
window.$api.ai.generateText(prompt, options)
  .then(result => console.log(result))

// 流式生成
window.$api.ai.streamText(prompt, options)
window.$api.on('ai:chunk', (data) => console.log(data.text))
window.$api.on('ai:end', () => console.log('done'))

// 续写
window.$api.ai.continueWriting(context)

// 润色
window.$api.ai.polishText(text, style)
```

### 9.2 MCP API

```typescript
// 列出工具
window.$api.mcp.listTools(serverName)

// 调用工具
window.$api.mcp.callTool(serverName, toolName, args)
```

### 9.3 SKILL API

```typescript
// 执行 SKILL
window.$api.skill.execute(skillId, context, parameters)

// 列出 SKILL
window.$api.skill.list()
```

---

## 10. 技术风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| AI API 限流 | 高 | 实现请求队列、缓存、多提供商支持 |
| AI 成本过高 | 高 | 智能缓存、本地模型备选、用量监控 |
| MCP 兼容性 | 中 | 严格测试、版本管理、降级方案 |
| 向量存储性能 | 中 | 分片索引、异步处理、定期清理 |
| 跨平台格式 | 中 | 充分测试、用户反馈、模板更新 |
