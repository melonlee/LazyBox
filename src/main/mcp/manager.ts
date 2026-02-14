/**
 * MCP 插件管理器
 * 管理插件的注册、启用、禁用和执行
 */

import { ipcMain, app } from 'electron';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import {
  MCPPlugin,
  MCPPluginManager,
  MCPTool,
  MCPResource,
  MCPPrompt,
  MCPContext,
  MCPPluginManifest,
} from './types';

/**
 * MCP 插件管理器实现
 */
class MCPPluginManagerImpl implements MCPPluginManager {
  private plugins: Map<string, MCPPlugin> = new Map();
  private storagePath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.storagePath = join(userDataPath, 'mcp-plugins.json');
    this.loadPlugins();
  }

  /**
   * 注册插件
   */
  register(plugin: MCPPlugin): void {
    // 验证插件
    this.validatePlugin(plugin);

    // 存储插件
    this.plugins.set(plugin.id, { ...plugin, enabled: false });

    // 保存到磁盘
    this.savePlugins();

    console.log(`[MCP] Plugin registered: ${plugin.name} (${plugin.id})`);
  }

  /**
   * 注销插件
   */
  unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    // 如果插件已启用,先禁用
    if (plugin.enabled) {
      this.disable(pluginId);
    }

    // 移除插件
    this.plugins.delete(pluginId);

    // 保存
    this.savePlugins();

    console.log(`[MCP] Plugin unregistered: ${pluginId}`);
  }

  /**
   * 获取插件
   */
  getPlugin(pluginId: string): MCPPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * 获取所有插件
   */
  getAllPlugins(): MCPPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 启用插件
   */
  async enable(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (plugin.enabled) {
      console.log(`[MCP] Plugin already enabled: ${pluginId}`);
      return;
    }

    try {
      // 调用启用钩子
      if (plugin.hooks?.onEnable) {
        await plugin.hooks.onEnable();
      }

      // 启用插件
      plugin.enabled = true;
      this.plugins.set(pluginId, plugin);
      this.savePlugins();

      console.log(`[MCP] Plugin enabled: ${plugin.name} (${pluginId})`);
    } catch (error) {
      console.error(`[MCP] Failed to enable plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * 禁用插件
   */
  async disable(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (!plugin.enabled) {
      console.log(`[MCP] Plugin already disabled: ${pluginId}`);
      return;
    }

    try {
      // 调用禁用钩子
      if (plugin.hooks?.onDisable) {
        await plugin.hooks.onDisable();
      }

      // 禁用插件
      plugin.enabled = false;
      this.plugins.set(pluginId, plugin);
      this.savePlugins();

      console.log(`[MCP] Plugin disabled: ${plugin.name} (${pluginId})`);
    } catch (error) {
      console.error(`[MCP] Failed to disable plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * 执行工具
   */
  async executeTool(toolName: string, params: any, context: MCPContext): Promise<any> {
    // 查找工具
    const tool = this.findTool(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    // 查找工具所属的插件
    const plugin = this.findPluginByTool(toolName);
    if (!plugin) {
      throw new Error(`Plugin not found for tool: ${toolName}`);
    }

    if (!plugin.enabled) {
      throw new Error(`Plugin is not enabled: ${plugin.id}`);
    }

    try {
      // 执行工具处理器
      const result = await tool.handler(params, context);
      return result;
    } catch (error) {
      console.error(`[MCP] Tool execution failed: ${toolName}`, error);

      // 调用错误钩子
      if (plugin.hooks?.onError) {
        plugin.hooks.onError(error as Error);
      }

      throw error;
    }
  }

  /**
   * 获取资源
   */
  async getResource(uri: string, context: MCPContext): Promise<string> {
    const resource = this.findResource(uri);
    if (!resource) {
      throw new Error(`Resource not found: ${uri}`);
    }

    const plugin = this.findPluginByResource(uri);
    if (!plugin || !plugin.enabled) {
      throw new Error(`Plugin not enabled for resource: ${uri}`);
    }

    return await resource.handler(uri, context);
  }

  /**
   * 写入资源
   */
  async setResource(uri: string, content: string, context: MCPContext): Promise<void> {
    const resource = this.findResource(uri);
    if (!resource) {
      throw new Error(`Resource not found: ${uri}`);
    }

    if (!resource.writable || !resource.writeHandler) {
      throw new Error(`Resource is not writable: ${uri}`);
    }

    const plugin = this.findPluginByResource(uri);
    if (!plugin || !plugin.enabled) {
      throw new Error(`Plugin not enabled for resource: ${uri}`);
    }

    return await resource.writeHandler!(uri, content, context);
  }

  /**
   * 获取提示词
   */
  async getPrompt(
    promptName: string,
    args: Record<string, any>,
    context: MCPContext
  ): Promise<any> {
    const prompt = this.findPrompt(promptName);
    if (!prompt) {
      throw new Error(`Prompt not found: ${promptName}`);
    }

    const plugin = this.findPluginByPrompt(promptName);
    if (!plugin || !plugin.enabled) {
      throw new Error(`Plugin not enabled for prompt: ${promptName}`);
    }

    return await prompt.handler(args, context);
  }

  /**
   * 搜索工具
   */
  searchTools(query: string): MCPTool[] {
    const results: MCPTool[] = [];
    const lowerQuery = query.toLowerCase();

    for (const plugin of this.plugins.values()) {
      if (!plugin.enabled) continue;

      for (const tool of plugin.tools) {
        if (
          tool.name.toLowerCase().includes(lowerQuery) ||
          tool.description.toLowerCase().includes(lowerQuery)
        ) {
          results.push(tool);
        }
      }
    }

    return results;
  }

  /**
   * 搜索资源
   */
  searchResources(query: string): MCPResource[] {
    const results: MCPResource[] = [];
    const lowerQuery = query.toLowerCase();

    for (const plugin of this.plugins.values()) {
      if (!plugin.enabled) continue;

      for (const resource of plugin.resources || []) {
        if (
          resource.name.toLowerCase().includes(lowerQuery) ||
          resource.description.toLowerCase().includes(lowerQuery) ||
          resource.uri.toLowerCase().includes(lowerQuery)
        ) {
          results.push(resource);
        }
      }
    }

    return results;
  }

  /**
   * 加载插件
   */
  private loadPlugins(): void {
    if (!existsSync(this.storagePath)) {
      return;
    }

    try {
      const data = JSON.parse(readFileSync(this.storagePath, 'utf-8'));
      const plugins = data.plugins || [];

      for (const plugin of plugins) {
        this.plugins.set(plugin.id, plugin);
      }

      console.log(`[MCP] Loaded ${this.plugins.size} plugins from disk`);
    } catch (error) {
      console.error('[MCP] Failed to load plugins:', error);
    }
  }

  /**
   * 保存插件
   */
  private savePlugins(): void {
    try {
      const data = {
        plugins: Array.from(this.plugins.values()),
        version: 1,
      };

      // 确保目录存在
      const dir = require('path').dirname(this.storagePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(this.storagePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[MCP] Failed to save plugins:', error);
    }
  }

  /**
   * 验证插件
   */
  private validatePlugin(plugin: MCPPlugin): void {
    if (!plugin.id || !plugin.name || !plugin.version) {
      throw new Error('Plugin must have id, name, and version');
    }

    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin already exists: ${plugin.id}`);
    }

    if (!plugin.tools || plugin.tools.length === 0) {
      throw new Error('Plugin must have at least one tool');
    }

    for (const tool of plugin.tools) {
      if (!tool.name || !tool.description || !tool.inputSchema) {
        throw new Error('Tool must have name, description, and inputSchema');
      }

      if (typeof tool.handler !== 'function') {
        throw new Error('Tool must have a handler function');
      }
    }
  }

  /**
   * 查找工具
   */
  private findTool(toolName: string): MCPTool | undefined {
    for (const plugin of this.plugins.values()) {
      if (!plugin.enabled) continue;
      const tool = plugin.tools.find(t => t.name === toolName);
      if (tool) return tool;
    }
    return undefined;
  }

  /**
   * 查找资源
   */
  private findResource(uri: string): MCPResource | undefined {
    for (const plugin of this.plugins.values()) {
      if (!plugin.enabled) continue;
      const resource = plugin.resources?.find(r => r.uri === uri);
      if (resource) return resource;
    }
    return undefined;
  }

  /**
   * 查找提示词
   */
  private findPrompt(promptName: string): MCPPrompt | undefined {
    for (const plugin of this.plugins.values()) {
      if (!plugin.enabled) continue;
      const prompt = plugin.prompts?.find(p => p.name === promptName);
      if (prompt) return prompt;
    }
    return undefined;
  }

  /**
   * 查找工具所属的插件
   */
  private findPluginByTool(toolName: string): MCPPlugin | undefined {
    for (const plugin of this.plugins.values()) {
      if (plugin.tools.some(t => t.name === toolName)) {
        return plugin;
      }
    }
    return undefined;
  }

  /**
   * 查找资源所属的插件
   */
  private findPluginByResource(uri: string): MCPPlugin | undefined {
    for (const plugin of this.plugins.values()) {
      if (plugin.resources?.some(r => r.uri === uri)) {
        return plugin;
      }
    }
    return undefined;
  }

  /**
   * 查找提示词所属的插件
   */
  private findPluginByPrompt(promptName: string): MCPPlugin | undefined {
    for (const plugin of this.plugins.values()) {
      if (plugin.prompts?.some(p => p.name === promptName)) {
        return plugin;
      }
    }
    return undefined;
  }

  /**
   * 获取所有工具
   */
  getAllTools(): MCPTool[] {
    const tools: MCPTool[] = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.enabled) {
        tools.push(...plugin.tools);
      }
    }
    return tools;
  }

  /**
   * 获取所有资源
   */
  getAllResources(): MCPResource[] {
    const resources: MCPResource[] = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.enabled && plugin.resources) {
        resources.push(...plugin.resources);
      }
    }
    return resources;
  }

  /**
   * 获取所有提示词
   */
  getAllPrompts(): MCPPrompt[] {
    const prompts: MCPPrompt[] = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.enabled && plugin.prompts) {
        prompts.push(...plugin.prompts);
      }
    }
    return prompts;
  }
}

// 全局插件管理器实例
let globalMCPManager: MCPPluginManagerImpl | null = null;

export function getMCPManager(): MCPPluginManager {
  if (!globalMCPManager) {
    globalMCPManager = new MCPPluginManagerImpl();
  }
  return globalMCPManager;
}

export { MCPPluginManagerImpl };
