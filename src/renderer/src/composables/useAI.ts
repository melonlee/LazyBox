/**
 * AI 功能 Composable
 */

import { ref, computed } from 'vue';

// AI 配置
const aiConfig = ref<{
  enabled: boolean;
  provider: 'claude' | 'openai' | 'custom';
  apiKey: string;
  model?: string;
}>({
  enabled: false,
  provider: 'claude',
  apiKey: '',
  model: 'claude-3-5-sonnet-20241022',
});

// 加载状态
const isLoading = ref(false);
const isStreaming = ref(false);
const error = ref<string | null>(null);

// 流式响应文本
const streamedText = ref('');

export function useAI() {
  /**
   * 初始化 AI 配置
   */
  const initAIConfig = async () => {
    try {
      const config = await window.$api.aiGetConfig();
      aiConfig.value = config;
      return config;
    } catch (e) {
      console.error('Failed to load AI config:', e);
      return aiConfig.value;
    }
  };

  /**
   * 更新 AI 配置
   */
  const updateAIConfig = async (config: Partial<typeof aiConfig.value>) => {
    try {
      const result = await window.$api.aiSetConfig(config);
      if (result.success) {
        aiConfig.value = { ...aiConfig.value, ...config };
      }
      return result;
    } catch (e) {
      console.error('Failed to update AI config:', e);
      throw e;
    }
  };

  /**
   * 检查 AI 是否已启用
   */
  const checkAIEnabled = async () => {
    try {
      const enabled = await window.$api.aiIsEnabled();
      aiConfig.value.enabled = enabled;
      return enabled;
    } catch (e) {
      console.error('Failed to check AI enabled:', e);
      return false;
    }
  };

  /**
   * 生成文本
   */
  const generateText = async (prompt: string, options?: any) => {
    isLoading.value = true;
    error.value = null;

    try {
      const result = await window.$api.aiGenerateText(prompt, options);
      return result;
    } catch (e: any) {
      error.value = e.message || 'AI 生成失败';
      throw e;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 流式生成文本
   */
  const streamGenerateText = async (
    prompt: string,
    onChunk: (text: string) => void,
    options?: any
  ) => {
    isStreaming.value = true;
    streamedText.value = '';
    error.value = null;

    // 设置流式事件监听
    const chunkHandler = (data: { text: string }) => {
      streamedText.value += data.text;
      onChunk(data.text);
    };

    const endHandler = () => {
      isStreaming.value = false;
      window.$api.onAIStreamEnd(() => {}); // 移除监听
      window.$api.onAIStreamError(() => {}); // 移除监听
    };

    const errorHandler = (data: { error: string }) => {
      error.value = data.error;
      isStreaming.value = false;
      window.$api.onAIStreamChunk(() => {}); // 移除监听
      window.$api.onAIStreamEnd(() => {}); // 移除监听
    };

    window.$api.onAIStreamChunk(chunkHandler);
    window.$api.onAIStreamEnd(endHandler);
    window.$api.onAIStreamError(errorHandler);

    try {
      await window.$api.aiStreamText(prompt, options);
    } catch (e: any) {
      error.value = e.message || 'AI 流式生成失败';
      isStreaming.value = false;
      throw e;
    }

    return streamedText.value;
  };

  /**
   * AI 续写
   */
  const continueWriting = async (params: {
    content: string;
    cursorPosition: { line: number; ch: number };
    selection: { start: { line: number; ch: number }; end: { line: number; ch: number } } | null;
    documentPath: string;
  }) => {
    isLoading.value = true;
    error.value = null;

    try {
      const result = await window.$api.aiContinueWriting(params);
      return result;
    } catch (e: any) {
      error.value = e.message || 'AI 续写失败';
      throw e;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * AI 润色
   */
  const polishText = async (text: string, style: string) => {
    isLoading.value = true;
    error.value = null;

    try {
      const result = await window.$api.aiPolishText(text, style);
      return result;
    } catch (e: any) {
      error.value = e.message || 'AI 润色失败';
      throw e;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * AI 扩写
   */
  const expandText = async (text: string, targetLength?: number) => {
    isLoading.value = true;
    error.value = null;

    try {
      const result = await window.$api.aiExpandText(text, targetLength);
      return result;
    } catch (e: any) {
      error.value = e.message || 'AI 扩写失败';
      throw e;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * AI 摘要
   */
  const summarizeText = async (text: string) => {
    isLoading.value = true;
    error.value = null;

    try {
      const result = await window.$api.aiSummarizeText(text);
      return result;
    } catch (e: any) {
      error.value = e.message || 'AI 摘要失败';
      throw e;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 生成大纲
   */
  const generateOutline = async (topic: string, style: string) => {
    isLoading.value = true;
    error.value = null;

    try {
      const result = await window.$api.aiGenerateOutline(topic, style);
      return result;
    } catch (e: any) {
      error.value = e.message || 'AI 生成大纲失败';
      throw e;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 分析内容
   */
  const analyzeContent = async (content: string) => {
    isLoading.value = true;
    error.value = null;

    try {
      const result = await window.$api.aiAnalyzeContent(content);
      return result;
    } catch (e: any) {
      error.value = e.message || 'AI 分析失败';
      throw e;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 提取关键词
   */
  const extractKeywords = async (content: string) => {
    isLoading.value = true;
    error.value = null;

    try {
      const result = await window.$api.aiExtractKeywords(content);
      return result;
    } catch (e: any) {
      error.value = e.message || 'AI 提取关键词失败';
      throw e;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 推荐标签
   */
  const suggestTags = async (content: string) => {
    isLoading.value = true;
    error.value = null;

    try {
      const result = await window.$api.aiSuggestTags(content);
      return result;
    } catch (e: any) {
      error.value = e.message || 'AI 推荐标签失败';
      throw e;
    } finally {
      isLoading.value = false;
    }
  };

  // 计算属性
  const isAIEnabled = computed(() => aiConfig.value.enabled);
  const hasAPIKey = computed(() => !!aiConfig.value.apiKey);

  return {
    // 状态
    aiConfig,
    isLoading,
    isStreaming,
    error,
    streamedText,
    isAIEnabled,
    hasAPIKey,

    // 配置方法
    initAIConfig,
    updateAIConfig,
    checkAIEnabled,

    // AI 方法
    generateText,
    streamGenerateText,
    continueWriting,
    polishText,
    expandText,
    summarizeText,
    generateOutline,
    analyzeContent,
    extractKeywords,
    suggestTags,
  };
}
