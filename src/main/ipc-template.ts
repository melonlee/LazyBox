/**
 * 模板相关 IPC 处理器
 */

import { ipcMain } from 'electron';
import { getTemplateManager } from './template/manager';

export function initTemplateIPCHandlers(): void {
  console.log('[Template IPC] Initializing template IPC handlers...');

  // 获取所有模板
  ipcMain.handle('template:get-all', async () => {
    const manager = getTemplateManager();
    return {
      success: true,
      templates: manager.getAllTemplates(),
    };
  });

  // 按分类获取模板
  ipcMain.handle('template:get-by-category', async (_, { category }) => {
    const manager = getTemplateManager();
    return {
      success: true,
      templates: manager.getTemplatesByCategory(category),
    };
  });

  // 搜索模板
  ipcMain.handle('template:search', async (_, { query }) => {
    const manager = getTemplateManager();
    return {
      success: true,
      templates: manager.searchTemplates(query),
    };
  });

  // 应用模板
  ipcMain.handle('template:apply', async (_, { content, templateId }) => {
    try {
      const manager = getTemplateManager();
      const html = manager.applyTemplate(content, templateId);
      return {
        success: true,
        html,
      };
    } catch (error) {
      console.error('[Template IPC] apply error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 获取模板详情
  ipcMain.handle('template:get-details', async (_, { templateId }) => {
    try {
      const manager = getTemplateManager();
      const template = manager.getTemplate(templateId);
      return {
        success: true,
        template,
      };
    } catch (error) {
      console.error('[Template IPC] get details error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 添加自定义模板
  ipcMain.handle('template:add', async (_, { template }) => {
    try {
      const manager = getTemplateManager();
      manager.addUserTemplate(template);
      return { success: true };
    } catch (error) {
      console.error('[Template IPC] add template error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 删除自定义模板
  ipcMain.handle('template:remove', async (_, { templateId }) => {
    try {
      const manager = getTemplateManager();
      const removed = manager.removeUserTemplate(templateId);
      return { success: true, removed };
    } catch (error) {
      console.error('[Template IPC] remove template error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  console.log('[Template IPC] Template IPC handlers initialized successfully');
}
