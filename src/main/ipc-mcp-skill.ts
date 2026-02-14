/**
 * MCP 和 SKILL 系统 IPC 处理器
 */

import { ipcMain } from 'electron';
import { getMCPManager } from './mcp/manager';
import { getSkillManager } from './skill/manager';
import { registerBuiltinPlugins } from './mcp/builtin-plugins';
import { registerBuiltinSkills } from './skill/builtin-skills';

// 初始化内置插件和技能
let initialized = false;

function initializeBuiltin() {
  if (initialized) return;

  try {
    const mcpManager = getMCPManager();
    registerBuiltinPlugins(mcpManager);

    const skillManager = getSkillManager();
    registerBuiltinSkills(skillManager);

    initialized = true;
    console.log('[MCP/SKILL] Builtin plugins and skills registered');
  } catch (error) {
    console.error('[MCP/SKILL] Failed to initialize builtin:', error);
  }
}

export function initMCPSkillIPCHandlers(): void {
  console.log('[MCP/SKILL] Initializing MCP and SKILL IPC handlers...');

  // 初始化内置插件和技能
  initializeBuiltin();

  // ========== MCP 插件管理 ==========

  // 获取所有插件
  ipcMain.handle('mcp:get-plugins', async () => {
    try {
      const manager = getMCPManager();
      const plugins = manager.getAllPlugins();
      return { success: true, plugins };
    } catch (error) {
      console.error('[MCP] get plugins error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 启用插件
  ipcMain.handle('mcp:enable-plugin', async (_, { pluginId }) => {
    try {
      const manager = getMCPManager();
      await manager.enable(pluginId);
      return { success: true };
    } catch (error) {
      console.error('[MCP] enable plugin error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 禁用插件
  ipcMain.handle('mcp:disable-plugin', async (_, { pluginId }) => {
    try {
      const manager = getMCPManager();
      await manager.disable(pluginId);
      return { success: true };
    } catch (error) {
      console.error('[MCP] disable plugin error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 获取所有工具
  ipcMain.handle('mcp:get-tools', async () => {
    try {
      const manager = getMCPManager() as any;
      const tools = manager.getAllTools ? manager.getAllTools() : [];
      return { success: true, tools };
    } catch (error) {
      console.error('[MCP] get tools error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 搜索工具
  ipcMain.handle('mcp:search-tools', async (_, { query }) => {
    try {
      const manager = getMCPManager();
      const tools = manager.searchTools(query);
      return { success: true, tools };
    } catch (error) {
      console.error('[MCP] search tools error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 执行工具
  ipcMain.handle('mcp:execute-tool', async (_, { toolName, params, context }) => {
    try {
      const manager = getMCPManager();
      const result = await manager.executeTool(toolName, params, context);
      return { success: true, result };
    } catch (error) {
      console.error('[MCP] execute tool error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 获取所有资源
  ipcMain.handle('mcp:get-resources', async () => {
    try {
      const manager = getMCPManager() as any;
      const resources = manager.getAllResources ? manager.getAllResources() : [];
      return { success: true, resources };
    } catch (error) {
      console.error('[MCP] get resources error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 获取资源
  ipcMain.handle('mcp:get-resource', async (_, { uri, context }) => {
    try {
      const manager = getMCPManager();
      const content = await manager.getResource(uri, context);
      return { success: true, content };
    } catch (error) {
      console.error('[MCP] get resource error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // ========== SKILL 管理 ==========

  // 获取所有技能
  ipcMain.handle('skill:get-all', async () => {
    try {
      const manager = getSkillManager();
      const skills = manager.getAllSkills();
      return { success: true, skills };
    } catch (error) {
      console.error('[SKILL] get all error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 按分类获取技能
  ipcMain.handle('skill:get-by-category', async (_, { category }) => {
    try {
      const manager = getSkillManager();
      const skills = manager.getSkillsByCategory(category);
      return { success: true, skills };
    } catch (error) {
      console.error('[SKILL] get by category error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 搜索技能
  ipcMain.handle('skill:search', async (_, { query }) => {
    try {
      const manager = getSkillManager();
      const skills = manager.searchSkills(query);
      return { success: true, skills };
    } catch (error) {
      console.error('[SKILL] search error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 执行技能
  ipcMain.handle('skill:execute', async (_, { skillId, context }) => {
    try {
      const manager = getSkillManager();
      const result = await manager.execute(skillId, context);
      return { success: true, ...result };
    } catch (error) {
      console.error('[SKILL] execute error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 启用技能
  ipcMain.handle('skill:enable', async (_, { skillId }) => {
    try {
      const manager = getSkillManager();
      manager.enable(skillId);
      return { success: true };
    } catch (error) {
      console.error('[SKILL] enable error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 禁用技能
  ipcMain.handle('skill:disable', async (_, { skillId }) => {
    try {
      const manager = getSkillManager();
      manager.disable(skillId);
      return { success: true };
    } catch (error) {
      console.error('[SKILL] disable error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 导入技能
  ipcMain.handle('skill:import', async (_, { skillDefinition }) => {
    try {
      const manager = getSkillManager();
      const skill = manager.import(skillDefinition);
      return { success: true, skill };
    } catch (error) {
      console.error('[SKILL] import error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 导出技能
  ipcMain.handle('skill:export', async (_, { skillId }) => {
    try {
      const manager = getSkillManager();
      const definition = manager.export(skillId);
      return { success: true, definition };
    } catch (error) {
      console.error('[SKILL] export error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 注册自定义技能
  ipcMain.handle('skill:register', async (_, { skill }) => {
    try {
      const manager = getSkillManager();
      manager.register(skill);
      return { success: true };
    } catch (error) {
      console.error('[SKILL] register error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 注销技能
  ipcMain.handle('skill:unregister', async (_, { skillId }) => {
    try {
      const manager = getSkillManager();
      manager.unregister(skillId);
      return { success: true };
    } catch (error) {
      console.error('[SKILL] unregister error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  console.log('[MCP/SKILL] MCP and SKILL IPC handlers initialized successfully');
}
