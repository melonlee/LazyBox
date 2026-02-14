/**
 * 向量存储和语义搜索 IPC 处理器
 */

import { ipcMain } from 'electron';
import { getSemanticSearchService } from './vector/search';
import { getKnowledgeGraphService } from './vector/knowledge-graph';
import { getVectorStore } from './vector/store';
import { getEmbeddingService } from './vector/embedding';

export function initVectorIPCHandlers(): void {
  console.log('[Vector IPC] Initializing vector IPC handlers...');

  // 语义搜索
  ipcMain.handle('vector:semantic-search', async (_, { query, options }) => {
    try {
      const service = getSemanticSearchService();
      const result = await service.search(query, options);
      return { success: true, ...result };
    } catch (error) {
      console.error('[Vector IPC] semantic search error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 混合搜索
  ipcMain.handle('vector:hybrid-search', async (_, { query, options }) => {
    try {
      const service = getSemanticSearchService();
      const results = await service.hybridSearch(query, options);
      return { success: true, results };
    } catch (error) {
      console.error('[Vector IPC] hybrid search error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 知识问答 (RAG)
  ipcMain.handle('vector:question-answer', async (_, { question, topK }) => {
    try {
      const service = getSemanticSearchService();
      const result = await service.questionAnswer(question, topK);
      return { success: true, ...result };
    } catch (error) {
      console.error('[Vector IPC] question answer error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 索引文档
  ipcMain.handle('vector:index-document', async (_, { content, metadata }) => {
    try {
      const service = getSemanticSearchService();
      await service.indexDocument(content, metadata);
      return { success: true };
    } catch (error) {
      console.error('[Vector IPC] index document error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 查找相似文档
  ipcMain.handle('vector:find-similar', async (_, { documentId, topK }) => {
    try {
      const service = getSemanticSearchService();
      const results = await service.findSimilarDocuments(documentId, topK);
      return { success: true, results };
    } catch (error) {
      console.error('[Vector IPC] find similar error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 获取图谱统计
  ipcMain.handle('vector:graph-stats', async () => {
    try {
      const service = getKnowledgeGraphService();
      const stats = await service.getGraphStats();
      return { success: true, stats };
    } catch (error) {
      console.error('[Vector IPC] graph stats error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 获取关联文档
  ipcMain.handle('vector:get-related', async (_, { documentId, maxDepth }) => {
    try {
      const service = getKnowledgeGraphService();
      const result = await service.getRelatedDocuments(documentId, maxDepth);
      return { success: true, ...result };
    } catch (error) {
      console.error('[Vector IPC] get related error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 获取可视化数据
  ipcMain.handle('vector:graph-visualization', async () => {
    try {
      const service = getKnowledgeGraphService();
      const data = await service.getVisualizationData();
      return { success: true, data };
    } catch (error) {
      console.error('[Vector IPC] graph visualization error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 分析文档关联
  ipcMain.handle('vector:analyze-relations', async (_, { documentId }) => {
    try {
      const service = getKnowledgeGraphService();
      const relations = await service.analyzeDocumentRelations(documentId);
      return { success: true, relations };
    } catch (error) {
      console.error('[Vector IPC] analyze relations error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 获取文档块
  ipcMain.handle('vector:get-chunks', async (_, { documentId }) => {
    try {
      const store = getVectorStore();
      const chunks = await store.getChunksByDocument(documentId);
      return { success: true, chunks };
    } catch (error) {
      console.error('[Vector IPC] get chunks error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 删除文档索引
  ipcMain.handle('vector:remove-document', async (_, { documentId }) => {
    try {
      const store = getVectorStore();
      await store.removeDocument(documentId);
      return { success: true };
    } catch (error) {
      console.error('[Vector IPC] remove document error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 清空向量存储
  ipcMain.handle('vector:clear-store', async () => {
    try {
      const store = getVectorStore() as any;
      if (store.clear) {
        store.clear();
      }
      return { success: true };
    } catch (error) {
      console.error('[Vector IPC] clear store error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 计算文本相似度
  ipcMain.handle('vector:similarity', async (_, { text1, text2 }) => {
    try {
      const embeddingService = getEmbeddingService();
      const [emb1, emb2] = await Promise.all([
        embeddingService.embed(text1),
        embeddingService.embed(text2),
      ]);
      const similarity = embeddingService.cosineSimilarity(emb1, emb2);
      return { success: true, similarity };
    } catch (error) {
      console.error('[Vector IPC] similarity error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  console.log('[Vector IPC] Vector IPC handlers initialized successfully');
}
