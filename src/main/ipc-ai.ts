/**
 * AI 相关 IPC 处理器
 */

import { ipcMain, BrowserWindow } from 'electron';
import { createAIService, getAIService, hasAIService, getAIServiceConfig } from './ai';
import { getAIConfig, setAIConfig, isAIEnabled } from './config/ai';
import { buildWritingContext } from './ai/context';

/**
 * 初始化 AI 相关 IPC 处理器
 */
export function initAIIpcHandlers(): void {
  console.log('[AI IPC] Initializing AI IPC handlers...');

  // ========== AI 配置管理 ==========

  // 获取 AI 配置
  ipcMain.handle('ai:get-config', async () => {
    return getAIConfig();
  });

  // 更新 AI 配置
  ipcMain.handle('ai:set-config', async (_, config) => {
    setAIConfig(config);
    return { success: true };
  });

  // 检查 AI 是否已启用
  ipcMain.handle('ai:is-enabled', async () => {
    return isAIEnabled();
  });

  // 获取 AI 服务配置
  ipcMain.handle('ai:get-service-config', async () => {
    return getAIServiceConfig();
  });

  // ========== AI 文本生成 ==========

  // 生成文本
  ipcMain.handle('ai:generate-text', async (_, { prompt, options }) => {
    try {
      await ensureAIInitialized();
      const aiService = getAIService();
      return await aiService.generateText(prompt, options);
    } catch (error) {
      console.error('[AI IPC] generate-text error:', error);
      throw error;
    }
  });

  // 流式生成文本
  ipcMain.handle('ai:stream-text', async (event, { prompt, options }) => {
    try {
      await ensureAIInitialized();
      const aiService = getAIService();

      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        throw new Error('No focused window found');
      }

      await aiService.streamText(
        prompt,
        (text) => {
          window.webContents.send('ai:stream-chunk', { text });
        },
        options
      );

      window.webContents.send('ai:stream-end');
      return { success: true };
    } catch (error) {
      console.error('[AI IPC] stream-text error:', error);
      event.sender.send('ai:stream-error', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  });

  // ========== AI 写作辅助 ==========

  // 续写
  ipcMain.handle('ai:continue-writing', async (_, { content, cursorPosition, selection, documentPath }) => {
    try {
      await ensureAIInitialized();
      const aiService = getAIService();

      const context = buildWritingContext(
        content,
        cursorPosition,
        selection,
        documentPath
      );

      return await aiService.continueWriting(context);
    } catch (error) {
      console.error('[AI IPC] continue-writing error:', error);
      throw error;
    }
  });

  // 润色
  ipcMain.handle('ai:polish-text', async (_, { text, style }) => {
    try {
      await ensureAIInitialized();
      const aiService = getAIService();
      return await aiService.polishText(text, style);
    } catch (error) {
      console.error('[AI IPC] polish-text error:', error);
      throw error;
    }
  });

  // 扩写
  ipcMain.handle('ai:expand-text', async (_, { text, targetLength }) => {
    try {
      await ensureAIInitialized();
      const aiService = getAIService();
      return await aiService.expandText(text, targetLength);
    } catch (error) {
      console.error('[AI IPC] expand-text error:', error);
      throw error;
    }
  });

  // 摘要
  ipcMain.handle('ai:summarize-text', async (_, { text }) => {
    try {
      await ensureAIInitialized();
      const aiService = getAIService();
      return await aiService.summarizeText(text);
    } catch (error) {
      console.error('[AI IPC] summarize-text error:', error);
      throw error;
    }
  });

  // ========== AI 大纲生成 ==========

  // 生成大纲
  ipcMain.handle('ai:generate-outline', async (_, { topic, style }) => {
    try {
      await ensureAIInitialized();
      const aiService = getAIService();
      return await aiService.generateOutline(topic, style);
    } catch (error) {
      console.error('[AI IPC] generate-outline error:', error);
      throw error;
    }
  });

  // ========== AI 内容分析 ==========

  // 分析内容
  ipcMain.handle('ai:analyze-content', async (_, { content }) => {
    try {
      await ensureAIInitialized();
      const aiService = getAIService();
      return await aiService.analyzeContent(content);
    } catch (error) {
      console.error('[AI IPC] analyze-content error:', error);
      throw error;
    }
  });

  // 提取关键词
  ipcMain.handle('ai:extract-keywords', async (_, { content }) => {
    try {
      await ensureAIInitialized();
      const aiService = getAIService();
      return await aiService.extractKeywords(content);
    } catch (error) {
      console.error('[AI IPC] extract-keywords error:', error);
      throw error;
    }
  });

  // 推荐标签
  ipcMain.handle('ai:suggest-tags', async (_, { content }) => {
    try {
      await ensureAIInitialized();
      const aiService = getAIService();
      return await aiService.suggestTags(content);
    } catch (error) {
      console.error('[AI IPC] suggest-tags error:', error);
      throw error;
    }
  });

  // ========== AI 图片生成 ==========

  // 生成图片（占位实现）
  ipcMain.handle('ai:generate-image', async (_, { prompt, options }) => {
    try {
      await ensureAIInitialized();
      const aiService = getAIService();
      return await aiService.generateImage(prompt, options);
    } catch (error) {
      console.error('[AI IPC] generate-image error:', error);
      throw error;
    }
  });

  // 建议图片
  ipcMain.handle('ai:suggest-images', async (_, { content }) => {
    try {
      await ensureAIInitialized();
      const aiService = getAIService();
      return await aiService.suggestImages(content);
    } catch (error) {
      console.error('[AI IPC] suggest-images error:', error);
      throw error;
    }
  });

  console.log('[AI IPC] AI IPC handlers initialized successfully');
}

/**
 * 确保 AI 服务已初始化
 */
async function ensureAIInitialized(): Promise<void> {
  if (!hasAIService()) {
    const config = getAIServiceConfig();
    if (!config) {
      throw new Error('AI 服务未配置，请先在设置中配置 API Key');
    }
    createAIService(config);
  }
}
