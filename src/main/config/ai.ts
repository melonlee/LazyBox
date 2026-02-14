/**
 * AI 配置管理
 */

import { getStore, setStore } from '../store';
import type { AIServiceConfig } from '../ai';

const AI_CONFIG_KEY = 'ai_config';
const AI_ENABLED_KEY = 'ai_enabled';

interface AIConfig extends AIServiceConfig {
  enabled: boolean;
}

const DEFAULT_AI_CONFIG: AIConfig = {
  enabled: false,
  provider: 'claude',
  apiKey: '',
  model: 'claude-3-5-sonnet-20241022',
};

/**
 * 获取 AI 配置
 */
export function getAIConfig(): AIConfig {
  const config = getStore(AI_CONFIG_KEY);
  return config ? { ...DEFAULT_AI_CONFIG, ...config } : { ...DEFAULT_AI_CONFIG };
}

/**
 * 保存 AI 配置
 */
export function setAIConfig(config: Partial<AIConfig>): void {
  const currentConfig = getAIConfig();
  const newConfig = { ...currentConfig, ...config };
  setStore(AI_CONFIG_KEY, newConfig);

  // 更新 enabled 状态
  if (config.enabled !== undefined) {
    setStore(AI_ENABLED_KEY, config.enabled);
  }
}

/**
 * 检查 AI 是否已启用
 */
export function isAIEnabled(): boolean {
  const value = getStore(AI_ENABLED_KEY);
  return value === true || value === 'true';
}

/**
 * 获取 AI 服务配置（用于初始化 AI 服务）
 */
export function getAIServiceConfig(): AIServiceConfig | null {
  const config = getAIConfig();

  if (!config.enabled || !config.apiKey) {
    return null;
  }

  return {
    provider: config.provider,
    apiKey: config.apiKey,
    model: config.model,
    baseURL: config.baseURL,
  };
}

/**
 * 更新 API Key
 */
export function updateAPIKey(apiKey: string): void {
  setAIConfig({ apiKey, enabled: !!apiKey });
}

/**
 * 更新模型
 */
export function updateModel(model: string): void {
  setAIConfig({ model });
}

/**
 * 切换 AI 开关状态
 */
export function toggleAI(enabled?: boolean): void {
  const newEnabled = enabled !== undefined ? enabled : !isAIEnabled();
  setAIConfig({ enabled: newEnabled });
}

/**
 * 清除 AI 配置
 */
export function clearAIConfig(): void {
  setStore(AI_CONFIG_KEY, { ...DEFAULT_AI_CONFIG, enabled: false });
  setStore(AI_ENABLED_KEY, false);
}
