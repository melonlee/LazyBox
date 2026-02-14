/**
 * MCP (Model Context Protocol) 插件系统类型定义
 * 支持动态加载和管理外部工具和服务
 */

export interface MCPPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  enabled: boolean;

  // 工具定义
  tools: MCPTool[];

  // 资源定义
  resources?: MCPResource[];

  // 提示词模板
  prompts?: MCPPrompt[];

  // 配置
  config?: Record<string, any>;

  // 生命周期钩子
  hooks?: {
    onEnable?: () => Promise<void>;
    onDisable?: () => Promise<void>;
    onError?: (error: Error) => void;
  };
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      default?: any;
    }>;
    required?: string[];
  };

  // 执行函数
  handler: (params: any, context: MCPContext) => Promise<any>;

  // 权限要求
  permissions?: string[];
}

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;

  // 读取资源
  handler: (uri: string, context: MCPContext) => Promise<string>;

  // 是否支持写入
  writable?: boolean;

  // 写入处理器
  writeHandler?: (uri: string, content: string, context: MCPContext) => Promise<void>;
}

export interface MCPPrompt {
  name: string;
  description: string;
  arguments?: Record<string, {
    description: string;
    required?: boolean;
  }>;

  // 生成提示词
  handler: (args: Record<string, any>, context: MCPContext) => Promise<{
    messages: Array<{
      role: 'user' | 'assistant' | 'system';
      content: string;
    }>;
  }>;
}

export interface MCPContext {
  // AI 服务配置
  aiConfig: {
    provider: string;
    model?: string;
  };

  // 用户上下文
  userContext?: {
    documentPath?: string;
    selection?: string;
    cursorPosition?: { line: number; ch: number };
  };

  // 元数据
  metadata?: Record<string, any>;

  // 日志
  log: (message: string) => void;
}

export interface MCPPluginManager {
  // 注册插件
  register(plugin: MCPPlugin): void;

  // 注销插件
  unregister(pluginId: string): void;

  // 获取插件
  getPlugin(pluginId: string): MCPPlugin | undefined;

  // 获取所有插件
  getAllPlugins(): MCPPlugin[];

  // 启用插件
  enable(pluginId: string): Promise<void>;

  // 禁用插件
  disable(pluginId: string): Promise<void>;

  // 执行工具
  executeTool(toolName: string, params: any, context: MCPContext): Promise<any>;

  // 获取资源
  getResource(uri: string, context: MCPContext): Promise<string>;

  // 写入资源
  setResource(uri: string, content: string, context: MCPContext): Promise<void>;

  // 获取提示词
  getPrompt(promptName: string, args: Record<string, any>, context: MCPContext): Promise<any>;

  // 搜索工具
  searchTools(query: string): MCPTool[];

  // 搜索资源
  searchResources(query: string): MCPResource[];
}

export interface MCPPluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  entry?: string; // 入口文件路径
  config?: Record<string, any>;
}
