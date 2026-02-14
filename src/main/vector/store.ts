/**
 * 向量存储服务
 * 使用内存存储 + 持久化到磁盘
 */

import { VectorStore, DocumentChunk, SearchResult, SearchFilter } from './types';
import { getEmbeddingService } from './embedding';
import { join } from 'path';
import { app } from 'electron';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

/**
 * 内存向量存储
 */
class MemoryVectorStore implements VectorStore {
  private chunks: Map<string, DocumentChunk> = new Map();
  private documentIndex: Map<string, Set<string>> = new Map(); // documentId -> chunkIds
  private tagIndex: Map<string, Set<string>> = new Map(); // tag -> chunkIds
  private storagePath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.storagePath = join(userDataPath, 'vector-store.json');
    this.loadFromDisk();
  }

  /**
   * 添加单个文档块
   */
  async addChunk(chunk: DocumentChunk): Promise<void> {
    // 生成嵌入
    const embeddingService = getEmbeddingService();
    chunk.embedding = await embeddingService.embed(chunk.content);

    // 存储
    this.chunks.set(chunk.id, chunk);

    // 更新索引
    this.updateDocumentIndex(chunk);
    this.updateTagIndex(chunk);

    // 持久化
    this.saveToDisk();
  }

  /**
   * 批量添加文档块
   */
  async addChunks(chunks: DocumentChunk[]): Promise<void> {
    const embeddingService = getEmbeddingService();

    // 批量生成嵌入
    const texts = chunks.map(c => c.content);
    const embeddings = await embeddingService.embedBatch(texts);

    // 存储所有块
    for (let i = 0; i < chunks.length; i++) {
      chunks[i].embedding = embeddings[i];
      this.chunks.set(chunks[i].id, chunks[i]);
      this.updateDocumentIndex(chunks[i]);
      this.updateTagIndex(chunks[i]);
    }

    this.saveToDisk();
  }

  /**
   * 移除文档的所有块
   */
  async removeDocument(documentId: string): Promise<void> {
    const chunkIds = this.documentIndex.get(documentId);
    if (!chunkIds) return;

    for (const chunkId of chunkIds) {
      const chunk = this.chunks.get(chunkId);
      if (chunk) {
        // 从标签索引中移除
        if (chunk.metadata.tags) {
          for (const tag of chunk.metadata.tags) {
            const tagChunks = this.tagIndex.get(tag);
            if (tagChunks) {
              tagChunks.delete(chunkId);
            }
          }
        }
        // 从主存储中移除
        this.chunks.delete(chunkId);
      }
    }

    this.documentIndex.delete(documentId);
    this.saveToDisk();
  }

  /**
   * 向量搜索
   */
  async search(
    query: number[],
    topK = 10,
    filter?: SearchFilter
  ): Promise<SearchResult[]> {
    const embeddingService = getEmbeddingService();
    const results: SearchResult[] = [];

    for (const chunk of this.chunks.values()) {
      // 应用过滤器
      if (filter && !this.matchesFilter(chunk, filter)) {
        continue;
      }

      if (!chunk.embedding) {
        continue;
      }

      // 计算相似度
      const score = embeddingService.cosineSimilarity(query, chunk.embedding);

      results.push({
        chunk,
        score,
        relevance: this.calculateRelevance(score),
      });
    }

    // 排序并返回 topK
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  /**
   * 获取文档的所有块
   */
  async getChunksByDocument(documentId: string): Promise<DocumentChunk[]> {
    const chunkIds = this.documentIndex.get(documentId);
    if (!chunkIds) return [];

    const chunks: DocumentChunk[] = [];
    for (const chunkId of chunkIds) {
      const chunk = this.chunks.get(chunkId);
      if (chunk) {
        chunks.push(chunk);
      }
    }

    return chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
  }

  /**
   * 获取所有文档ID
   */
  getDocumentIds(): string[] {
    return Array.from(this.documentIndex.keys());
  }

  /**
   * 获取块数量
   */
  getChunkCount(): number {
    return this.chunks.size;
  }

  /**
   * 清空存储
   */
  clear(): void {
    this.chunks.clear();
    this.documentIndex.clear();
    this.tagIndex.clear();
    this.saveToDisk();
  }

  /**
   * 更新文档索引
   */
  private updateDocumentIndex(chunk: DocumentChunk): void {
    if (!this.documentIndex.has(chunk.documentId)) {
      this.documentIndex.set(chunk.documentId, new Set());
    }
    this.documentIndex.get(chunk.documentId)!.add(chunk.id);
  }

  /**
   * 更新标签索引
   */
  private updateTagIndex(chunk: DocumentChunk): void {
    if (chunk.metadata.tags) {
      for (const tag of chunk.metadata.tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(chunk.id);
      }
    }
  }

  /**
   * 检查块是否匹配过滤器
   */
  private matchesFilter(chunk: DocumentChunk, filter: SearchFilter): boolean {
    if (filter.documentPath && chunk.documentPath !== filter.documentPath) {
      return false;
    }

    if (filter.tags && filter.tags.length > 0) {
      const chunkTags = chunk.metadata.tags || [];
      if (!filter.tags.some(tag => chunkTags.includes(tag))) {
        return false;
      }
    }

    if (filter.contentType && chunk.metadata.contentType !== filter.contentType) {
      return false;
    }

    if (filter.dateRange) {
      const createdAt = chunk.metadata.createdAt;
      if (createdAt < filter.dateRange.start || createdAt > filter.dateRange.end) {
        return false;
      }
    }

    return true;
  }

  /**
   * 计算相关性等级
   */
  private calculateRelevance(score: number): 'high' | 'medium' | 'low' {
    if (score >= 0.8) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * 保存到磁盘
   */
  private saveToDisk(): void {
    try {
      const data = {
        chunks: Array.from(this.chunks.entries()),
        documentIndex: Array.from(this.documentIndex.entries()).map(([k, v]) => [k, Array.from(v)]),
        tagIndex: Array.from(this.tagIndex.entries()).map(([k, v]) => [k, Array.from(v)]),
      };

      // 确保目录存在
      const dir = require('path').dirname(this.storagePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(this.storagePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save vector store:', error);
    }
  }

  /**
   * 从磁盘加载
   */
  private loadFromDisk(): void {
    try {
      if (!existsSync(this.storagePath)) {
        return;
      }

      const data = JSON.parse(readFileSync(this.storagePath, 'utf-8'));

      this.chunks = new Map(data.chunks || []);
      this.documentIndex = new Map(
        (data.documentIndex || []).map(([k, v]: [string, string[]]) => [k, new Set(v)])
      );
      this.tagIndex = new Map(
        (data.tagIndex || []).map(([k, v]: [string, string[]]) => [k, new Set(v)])
      );

      console.log(`[VectorStore] Loaded ${this.chunks.size} chunks from disk`);
    } catch (error) {
      console.error('Failed to load vector store:', error);
    }
  }
}

// 全局向量存储实例
let globalVectorStore: MemoryVectorStore | null = null;

export function getVectorStore(): VectorStore {
  if (!globalVectorStore) {
    globalVectorStore = new MemoryVectorStore();
  }
  return globalVectorStore;
}

export { MemoryVectorStore };
