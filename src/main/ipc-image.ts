/**
 * 图片生成相关 IPC 处理器
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import { initImageServices, getImageService, getImageOptimizationService } from './image/generation';
import { getAIConfig } from './config/ai';

// 图片生成的 API Key 配置键
const IMAGE_API_KEY = 'image_api_key';

export function initImageIPCHandlers(): void {
  console.log('[Image IPC] Initializing image IPC handlers...');

  // 生成图片
  ipcMain.handle('image:generate', async (_, { prompt, options }) => {
    try {
      // 获取图片 API Key（可以从 AI 配置中获取，或者单独配置）
      const apiKey = await getApiKey();
      if (!apiKey) {
        throw new Error('请先配置图片生成 API Key');
      }

      const { imageService } = initImageServices(apiKey);

      const result = await imageService.generateImage(prompt, options);
      return { success: true, image: result };
    } catch (error) {
      console.error('[Image IPC] generate error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 保存图片 API Key
  ipcMain.handle('image:save-api-key', async (_, { apiKey }) => {
    try {
      const { setStore } = await import('./store');
      setStore(IMAGE_API_KEY, apiKey);
      return { success: true };
    } catch (error) {
      console.error('[Image IPC] save api key error:', error);
      return { success: false, error: '保存失败' };
    }
  });

  // 获取 API Key
  ipcMain.handle('image:get-api-key', async () => {
    const { getStore } = await import('./store');
    const apiKey = getStore(IMAGE_API_KEY);
    return { success: true, apiKey: apiKey || '' };
  });

  // 建议图片
  ipcMain.handle('image:suggest', async (_, { content }) => {
    try {
      const apiKey = await getApiKey();
      if (!apiKey) {
        throw new Error('请先配置图片生成 API Key');
      }

      const { imageService } = initImageServices(apiKey);
      const suggestions = await imageService.suggestImages(content);

      return { success: true, suggestions };
    } catch (error) {
      console.error('[Image IPC] suggest error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 移除背景
  ipcMain.handle('image:remove-background', async (_, { imageData }) => {
    try {
      const imageOptimizationService = getImageOptimizationService();
      if (!imageOptimizationService) {
        throw new Error('图片优化服务未初始化');
      }

      const result = await imageOptimizationService.removeBackground(imageData);
      return { success: true, result };
    } catch (error) {
      console.error('[Image IPC] remove background error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 转换图片风格
  ipcMain.handle('image:transform-style', async (_, { imageData, style }) => {
    try {
      const imageOptimizationService = getImageOptimizationService();
      if (!imageOptimizationService) {
        throw new Error('图片优化服务未初始化');
      }

      const result = await imageOptimizationService.transformStyle(imageData, style);
      return { success: true, result };
    } catch (error) {
      console.error('[Image IPC] transform style error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 选择图片文件
  ipcMain.handle('image:select-file', async () => {
    const window = BrowserWindow.getFocusedWindow();
    if (!window) {
      return { canceled: true };
    }

    const result = await dialog.showOpenDialog(window, {
      title: '选择图片',
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled) {
      return { canceled: true };
    }

    const { readFileAsBase64 } = await import('./ipc');
    const base64 = await readFileAsBase64({ filePath: result.filePaths[0] });

    return {
      canceled: false,
      filePath: result.filePaths[0],
      base64,
    };
  });

  console.log('[Image IPC] Image IPC handlers initialized successfully');
}

async function getApiKey(): Promise<string | null> {
  const { getStore } = await import('./store');
  return getStore(IMAGE_API_KEY) || null;
}
