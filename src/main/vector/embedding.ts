/**
 * 文本嵌入服务
 * 将文本转换为向量表示，支持多种嵌入模型
 */

import { EmbeddingProvider } from './types';
import { getAIService } from '../ai';

/**
 * OpenAI Embedding Provider
 */
class OpenAIEmbeddingProvider implements EmbeddingProvider {
  name = 'openai';
  private model: string;
  private dimension: number;

  constructor(model: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002' = 'text-embedding-3-small') {
    this.model = model;
    this.dimension = model === 'text-embedding-3-large' ? 3072 : 1536;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const aiService = getAIService();
    if (!aiService) {
      throw new Error('AI service not available');
    }

    try {
      // 使用 AI 服务生成嵌入
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY || ''}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Embedding API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('OpenAI embedding error:', error);
      throw error;
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings = await Promise.all(
      texts.map(text => this.generateEmbedding(text))
    );
    return embeddings;
  }

  getDimension(): number {
    return this.dimension;
  }
}

/**
 * 本地嵌入提供者 (使用轻量级模型)
 */
class LocalEmbeddingProvider implements EmbeddingProvider {
  name = 'local';
  private dimension = 384; // 使用 sentence-transformers/all-MiniLM-L6-v2

  async generateEmbedding(text: string): Promise<number[]> {
    // 简化实现: 使用词频 + hash 生成伪向量
    // 生产环境应使用实际模型如 onnx-runtime-web
    const words = this.tokenize(text);
    const vector = new Array(this.dimension).fill(0);

    for (let i = 0; i < words.length; i++) {
      const hash = this.hash(words[i]);
      const index = Math.abs(hash) % this.dimension;
      vector[index] += 1 / (i + 1); // 位置权重
    }

    // 归一化
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return vector.map(v => v / norm);
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(text => this.generateEmbedding(text)));
  }

  getDimension(): number {
    return this.dimension;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1);
  }

  private hash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }
}

/**
 * 嵌入服务管理器
 */
class EmbeddingService {
  private provider: EmbeddingProvider;

  constructor(provider?: EmbeddingProvider) {
    this.provider = provider || new LocalEmbeddingProvider();
  }

  /**
   * 生成单个文本的嵌入
   */
  async embed(text: string): Promise<number[]> {
    return this.provider.generateEmbedding(text);
  }

  /**
   * 批量生成嵌入
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    return this.provider.generateBatchEmbeddings(texts);
  }

  /**
   * 计算余弦相似度
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vector dimensions must match');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * 计算欧氏距离
   */
  euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vector dimensions must match');
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }

    return Math.sqrt(sum);
  }

  /**
   * 获取向量维度
   */
  getDimension(): number {
    return this.provider.getDimension();
  }

  /**
   * 切换嵌入提供者
   */
  setProvider(provider: EmbeddingProvider): void {
    this.provider = provider;
  }

  /**
   * 获取当前提供者
   */
  getProvider(): EmbeddingProvider {
    return this.provider;
  }
}

// 全局嵌入服务实例
let globalEmbeddingService: EmbeddingService | null = null;

export function getEmbeddingService(): EmbeddingService {
  if (!globalEmbeddingService) {
    globalEmbeddingService = new EmbeddingService();
  }
  return globalEmbeddingService;
}

export { OpenAIEmbeddingProvider, LocalEmbeddingProvider };
export type { EmbeddingProvider };
