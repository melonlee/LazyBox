/**
 * 语义搜索服务
 * 提供智能的语义搜索和文档检索
 */

import { getVectorStore } from './store';
import { getEmbeddingService } from './embedding';
import { getChunkingManager } from './chunking';
import {
  SearchResult,
  SemanticSearchOptions,
  DocumentChunk,
  SearchFilter,
} from './types';

/**
 * 语义搜索服务
 */
export class SemanticSearchService {
  /**
   * 语义搜索
   */
  async search(
    query: string,
    options: SemanticSearchOptions = {}
  ): Promise<{
    results: SearchResult[];
    query: string;
    totalFound: number;
  }> {
    const {
      topK = 10,
      minScore = 0.3,
      filter,
      rerank = true,
    } = options;

    // 生成查询嵌入
    const embeddingService = getEmbeddingService();
    const queryEmbedding = await embeddingService.embed(query);

    // 执行向量搜索
    const vectorStore = getVectorStore();
    let results = await vectorStore.search(queryEmbedding, topK * 2, filter);

    // 过滤低分结果
    results = results.filter(r => r.score >= minScore);

    // 重排序
    if (rerank && results.length > 1) {
      results = this.rerankResults(query, results);
    }

    // 取 topK
    results = results.slice(0, topK);

    return {
      results,
      query,
      totalFound: results.length,
    };
  }

  /**
   * 混合搜索 (关键词 + 语义)
   */
  async hybridSearch(
    query: string,
    options: SemanticSearchOptions = {}
  ): Promise<SearchResult[]> {
    // 首先进行语义搜索
    const semanticResults = await this.search(query, options);

    // 然后进行关键词匹配作为补充
    const vectorStore = getVectorStore();
    const allChunks = await this.getAllChunks();

    const keywordResults = allChunks
      .filter(chunk => this.keywordMatch(query, chunk.content))
      .map(chunk => ({
        chunk,
        score: this.calculateKeywordScore(query, chunk.content),
        relevance: 'medium' as const,
      }));

    // 合并结果
    const combined = this.mergeResults(semanticResults.results, keywordResults);

    // 取 topK
    return combined.slice(0, options.topK || 10);
  }

  /**
   * 搜索相似文档
   */
  async findSimilarDocuments(
    documentId: string,
    topK = 5
  ): Promise<Array<{ documentId: string; score: string }>> {
    const vectorStore = getVectorStore();
    const chunks = await vectorStore.getChunksByDocument(documentId);

    if (chunks.length === 0) {
      return [];
    }

    // 计算文档平均向量
    const embeddingService = getEmbeddingService();
    const avgEmbedding = this.averageEmbeddings(
      chunks.map(c => c.embedding).filter((e): e is number[] => e !== undefined)
    );

    // 搜索相似文档
    const allDocumentIds = vectorStore.getDocumentIds();
    const similarities: Array<{ documentId: string; score: string }> = [];

    for (const otherDocId of allDocumentIds) {
      if (otherDocId === documentId) continue;

      const otherChunks = await vectorStore.getChunksByDocument(otherDocId);
      if (otherChunks.length === 0) continue;

      const otherAvgEmbedding = this.averageEmbeddings(
        otherChunks.map(c => c.embedding).filter((e): e is number[] => e !== undefined)
      );

      const score = embeddingService.cosineSimilarity(avgEmbedding, otherAvgEmbedding);
      similarities.push({ documentId: otherDocId, score: score.toFixed(4) });
    }

    // 排序并返回 topK
    similarities.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
    return similarities.slice(0, topK);
  }

  /**
   * 问答搜索 (RAG)
   */
  async questionAnswer(
    question: string,
    topK = 5
  ): Promise<{
    answer: string;
    sources: SearchResult[];
    confidence: number;
  }> {
    // 搜索相关文档块
    const { results } = await this.search(question, { topK });

    if (results.length === 0) {
      return {
        answer: '没有找到相关信息。',
        sources: [],
        confidence: 0,
      };
    }

    // 使用 AI 生成答案
    const context = results
      .map(r => r.chunk.content)
      .join('\n\n---\n\n')
      .substring(0, 4000); // 限制上下文长度

    // 这里应该调用 AI 服务生成答案
    // 暂时返回简单的格式化结果
    const answer = this.formatAnswer(question, results);

    // 计算置信度
    const confidence = this.calculateConfidence(results);

    return {
      answer,
      sources: results,
      confidence,
    };
  }

  /**
   * 索引文档
   */
  async indexDocument(
    content: string,
    metadata: {
      title: string;
      path: string;
      contentType: string;
      tags?: string[];
    }
  ): Promise<void> {
    const chunkingManager = getChunkingManager();

    // 根据内容类型选择分块策略
    let strategy = 'semantic';
    if (metadata.contentType === 'text/markdown') {
      strategy = 'markdown';
    }

    const chunker = chunkingManager.getStrategy(strategy);
    const chunks = chunker.chunk(content, {
      ...metadata,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 添加到向量存储
    const vectorStore = getVectorStore();
    await vectorStore.addChunks(chunks);

    console.log(`[SemanticSearch] Indexed ${chunks.length} chunks from ${metadata.path}`);
  }

  /**
   * 重新排序结果
   */
  private rerankResults(query: string, results: SearchResult[]): SearchResult[] {
    // 使用查询和内容的关键词重叠度进行重排序
    const queryWords = new Set(
      query.toLowerCase().split(/\s+/).filter(w => w.length > 1)
    );

    return results.map(result => {
      const contentWords = new Set(
        result.chunk.content.toLowerCase().split(/\s+/).filter(w => w.length > 1)
      );

      // 计算关键词重叠度
      let overlap = 0;
      for (const word of queryWords) {
        if (contentWords.has(word)) {
          overlap++;
        }
      }

      const keywordScore = overlap / queryWords.size;
      const combinedScore = result.score * 0.7 + keywordScore * 0.3;

      return {
        ...result,
        score: combinedScore,
      };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * 关键词匹配
   */
  private keywordMatch(query: string, content: string): boolean {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();

    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    return queryWords.some(word => contentLower.includes(word));
  }

  /**
   * 计算关键词得分
   */
  private calculateKeywordScore(query: string, content: string): number {
    const queryWords = new Set(query.toLowerCase().split(/\s+/));
    const contentWords = content.toLowerCase().split(/\s+/);

    let matches = 0;
    for (const word of queryWords) {
      if (contentWords.some(w => w.includes(word))) {
        matches++;
      }
    }

    return matches / queryWords.size;
  }

  /**
   * 合并搜索结果
   */
  private mergeResults(
    semanticResults: SearchResult[],
    keywordResults: SearchResult[]
  ): SearchResult[] {
    const merged = new Map<string, SearchResult>();

    // 添加语义搜索结果
    for (const result of semanticResults) {
      merged.set(result.chunk.id, {
        ...result,
        score: result.score * 0.7, // 降低权重
      });
    }

    // 添加关键词搜索结果
    for (const result of keywordResults) {
      const existing = merged.get(result.chunk.id);
      if (existing) {
        existing.score += result.score * 0.3;
      } else {
        merged.set(result.chunk.id, {
          ...result,
          score: result.score * 0.5,
        });
      }
    }

    return Array.from(merged.values()).sort((a, b) => b.score - a.score);
  }

  /**
   * 计算平均嵌入
   */
  private averageEmbeddings(embeddings: number[][]): number[] {
    if (embeddings.length === 0) {
      return [];
    }

    const dim = embeddings[0].length;
    const avg = new Array(dim).fill(0);

    for (const embedding of embeddings) {
      for (let i = 0; i < dim; i++) {
        avg[i] += embedding[i];
      }
    }

    for (let i = 0; i < dim; i++) {
      avg[i] /= embeddings.length;
    }

    return avg;
  }

  /**
   * 格式化答案
   */
  private formatAnswer(question: string, results: SearchResult[]): string {
    if (results.length === 0) {
      return '没有找到相关信息。';
    }

    let answer = `根据搜索结果，找到以下相关信息：\n\n`;

    for (let i = 0; i < Math.min(results.length, 3); i++) {
      const result = results[i];
      const preview = result.chunk.content.substring(0, 200) + '...';
      answer += `${i + 1}. ${preview}\n`;
      answer += `   (来源: ${result.chunk.metadata.title}, 相关度: ${(result.score * 100).toFixed(0)}%)\n\n`;
    }

    return answer;
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(results: SearchResult[]): number {
    if (results.length === 0) return 0;

    // 基于最高分和平均分计算置信度
    const maxScore = results[0].score;
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    return (maxScore * 0.7 + avgScore * 0.3);
  }

  /**
   * 获取所有文档块
   */
  private async getAllChunks(): Promise<DocumentChunk[]> {
    const vectorStore = getVectorStore();
    const documentIds = vectorStore.getDocumentIds();
    const allChunks: DocumentChunk[] = [];

    for (const docId of documentIds) {
      const chunks = await vectorStore.getChunksByDocument(docId);
      allChunks.push(...chunks);
    }

    return allChunks;
  }
}

// 全局语义搜索服务实例
let globalSemanticSearchService: SemanticSearchService | null = null;

export function getSemanticSearchService(): SemanticSearchService {
  if (!globalSemanticSearchService) {
    globalSemanticSearchService = new SemanticSearchService();
  }
  return globalSemanticSearchService;
}
