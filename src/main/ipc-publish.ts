/**
 * 发布相关 IPC 处理器
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import { getPublishManager } from './publish/adapters';
import type { PublishAdapter, PublishMetadata } from './publish/adapters';

export function initPublishIPCHandlers(): void {
  console.log('[Publish IPC] Initializing publish IPC handlers...');

  // 获取所有支持的平台
  ipcMain.handle('publish:get-platforms', async () => {
    const manager = getPublishManager();
    const adapters = manager.getAllAdapters();

    return adapters.map(adapter => ({
      name: adapter.name,
      displayName: adapter.displayName,
      icon: adapter.icon,
      enabled: true,
    }));
  });

  // 发布到多个平台
  ipcMain.handle('publish:to-platforms', async (_, { content, metadata, platforms }) => {
    try {
      const manager = getPublishManager();
      const results = await manager.publishToPlatforms(content, metadata, platforms);

      // 转换 Map 为普通对象
      const resultsObj: Record<string, any> = {};
      for (const [platform, result] of results.entries()) {
        resultsObj[platform] = result;
      }

      return { success: true, results: resultsObj };
    } catch (error) {
      console.error('[Publish IPC] publish error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 预览平台格式
  ipcMain.handle('publish:preview-platform', async (_, { content, metadata, platform }) => {
    try {
      const manager = getPublishManager();
      const adapter = manager.getAdapter(platform);

      if (!adapter) {
        throw new Error(`平台 ${platform} 不支持`);
      }

      const transformed = await adapter.transform(content, metadata);
      return {
        success: true,
        preview: transformed,
      };
    } catch (error) {
      console.error('[Publish IPC] preview error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 保存平台凭证
  ipcMain.handle('publish:save-credentials', async (_, { platform, credentials }) => {
    try {
      const manager = getPublishManager();
      await manager.saveCredentials(platform, credentials);
      return { success: true };
    } catch (error) {
      console.error('[Publish IPC] save credentials error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 验证平台凭证
  ipcMain.handle('publish:validate-credentials', async (_, { platform, credentials }) => {
    try {
      const manager = getPublishManager();
      const isValid = await manager.validateCredentials(platform, credentials);
      return { success: true, valid: isValid };
    } catch (error) {
      console.error('[Publish IPC] validate credentials error:', error);
      return {
        success: false,
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 导出为文件
  ipcMain.handle('publish:export-file', async (_, { content, metadata, format, filePath }) => {
    try {
      const manager = getPublishManager();
      const adapter = manager.getAdapter(format);

      if (!adapter || format !== 'markdown') {
        throw new Error(`格式 ${format} 不支持导出`);
      }

      const transformed = await adapter.transform(content, metadata);
      const result = await adapter.publish(transformed, { filePath });

      return result;
    } catch (error) {
      console.error('[Publish IPC] export file error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 选择文件保存路径
  ipcMain.handle('publish:select-save-path', async () => {
    const window = BrowserWindow.getFocusedWindow();
    if (!window) {
      return { canceled: true };
    }

    const result = await dialog.showSaveDialog(window, {
      title: '选择保存位置',
      defaultPath: 'article.md',
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled) {
      return { canceled: true };
    }

    return { canceled: false, filePath: result.filePath };
  });

  console.log('[Publish IPC] Publish IPC handlers initialized successfully');
}
