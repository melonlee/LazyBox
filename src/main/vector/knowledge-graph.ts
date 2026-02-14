/**
 * 知识图谱服务
 * 分析文档之间的关系并构建知识图谱
 */

import { getVectorStore } from './store';
import { getEmbeddingService } from './embedding';
import { getSemanticSearchService } from './search';
import { KnowledgeGraph, DocumentRelation, DocumentChunk } from './types';
import { getAIService } from '../ai';

/**
 * 知识图谱服务
 */
export class KnowledgeGraphService {
  private graph: KnowledgeGraph;

  constructor() {
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
    };
  }

  /**
   * 分析文档关联
   */
  async analyzeDocumentRelations(documentId: string): Promise<DocumentRelation[]> {
    const relations: DocumentRelation[] = [];
    const vectorStore = getVectorStore();

    // 获取当前文档
    const currentChunks = await vectorStore.getChunksByDocument(documentId);
    if (currentChunks.length === 0) return relations;

    // 1. 查找相似文档
    const semanticSearch = getSemanticSearchService();
    const similarDocs = await semanticSearch.findSimilarDocuments(documentId, 10);

    for (const similar of similarDocs) {
      const score = parseFloat(similar.score);
      if (score > 0.6) {
        relations.push({
          sourceDocumentId: documentId,
          targetDocumentId: similar.documentId,
          relationType: 'similar',
          strength: score,
        });
      }
    }

    // 2. 分析内容引用 (查找文档中的链接)
    const references = this.extractReferences(currentChunks);
    for (const refPath of references) {
      relations.push({
        sourceDocumentId: documentId,
        targetDocumentId: refPath,
        relationType: 'reference',
        strength: 0.9,
      });
    }

    // 3. 分析主题关联
    const topicRelations = await this.analyzeTopicRelations(documentId);
    relations.push(...topicRelations);

    return relations;
  }

  /**
   * 构建知识图谱
   */
  async buildKnowledgeGraph(): Promise<KnowledgeGraph> {
    const vectorStore = getVectorStore();
    const documentIds = vectorStore.getDocumentIds();

    // 清空现有图谱
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
    };

    // 添加文档节点
    for (const docId of documentIds) {
      const chunks = await vectorStore.getChunksByDocument(docId);
      if (chunks.length > 0) {
        const metadata = chunks[0].metadata;
        this.graph.nodes.set(docId, {
          id: docId,
          type: 'document',
          label: metadata.title,
          metadata: {
            path: metadata.path,
            contentType: metadata.contentType,
            createdAt: metadata.createdAt,
            updatedAt: metadata.updatedAt,
          },
        });

        // 添加标签节点
        if (metadata.tags) {
          for (const tag of metadata.tags) {
            const tagId = `tag:${tag}`;
            if (!this.graph.nodes.has(tagId)) {
              this.graph.nodes.set(tagId, {
                id: tagId,
                type: 'tag',
                label: tag,
                metadata: {},
              });
            }

            // 添加文档-标签边
            this.graph.edges.set(`${docId}-${tagId}`, {
              sourceDocumentId: docId,
              targetDocumentId: tagId,
              relationType: 'similar', // 使用 similar 作为标签关联
              strength: 0.5,
            });
          }
        }
      }
    }

    // 分析所有文档的关联
    for (const docId of documentIds) {
      const relations = await this.analyzeDocumentRelations(docId);
      for (const relation of relations) {
        const edgeId = `${relation.sourceDocumentId}-${relation.targetDocumentId}`;
        this.graph.edges.set(edgeId, relation);
      }
    }

    // 提取主题节点
    await this.extractTopicNodes();

    return this.graph;
  }

  /**
   * 获取图谱统计
   */
  async getGraphStats(): Promise<{
    nodeCount: number;
    edgeCount: number;
    documentCount: number;
    tagCount: number;
    topicCount: number;
  }> {
    await this.buildKnowledgeGraph();

    let documentCount = 0;
    let tagCount = 0;
    let topicCount = 0;

    for (const node of this.graph.nodes.values()) {
      switch (node.type) {
        case 'document':
          documentCount++;
          break;
        case 'tag':
          tagCount++;
          break;
        case 'topic':
          topicCount++;
          break;
      }
    }

    return {
      nodeCount: this.graph.nodes.size,
      edgeCount: this.graph.edges.size,
      documentCount,
      tagCount,
      topicCount,
    };
  }

  /**
   * 获取文档的关联文档
   */
  async getRelatedDocuments(
    documentId: string,
    maxDepth = 2
  ): Promise<{
    direct: string[];
    indirect: string[];
  }> {
    await this.buildKnowledgeGraph();

    const direct = new Set<string>();
    const indirect = new Set<string>();

    // 查找直接关联
    for (const edge of this.graph.edges.values()) {
      if (edge.sourceDocumentId === documentId) {
        const targetId = edge.targetDocumentId;
        if (targetId.startsWith('doc:') || !targetId.includes(':')) {
          direct.add(targetId);
        }
      } else if (edge.targetDocumentId === documentId) {
        const sourceId = edge.sourceDocumentId;
        if (sourceId.startsWith('doc:') || !sourceId.includes(':')) {
          direct.add(sourceId);
        }
      }
    }

    // 查找间接关联
    if (maxDepth > 1) {
      for (const directId of direct) {
        for (const edge of this.graph.edges.values()) {
          if (edge.sourceDocumentId === directId && edge.targetDocumentId !== documentId) {
            const targetId = edge.targetDocumentId;
            if (!direct.has(targetId) && (targetId.startsWith('doc:') || !targetId.includes(':'))) {
              indirect.add(targetId);
            }
          }
        }
      }
    }

    return {
      direct: Array.from(direct),
      indirect: Array.from(indirect),
    };
  }

  /**
   * 可视化图谱数据
   */
  async getVisualizationData(): Promise<{
    nodes: Array<{ id: string; label: string; type: string; data: any }>;
    links: Array<{ source: string; target: string; strength: number; type: string }>;
  }> {
    await this.buildKnowledgeGraph();

    const nodes = Array.from(this.graph.nodes.values()).map(node => ({
      id: node.id,
      label: node.label,
      type: node.type,
      data: node.metadata,
    }));

    const links = Array.from(this.graph.edges.values())
      .filter(edge => {
        // 只包含文档之间的关联
        const sourceNode = this.graph.nodes.get(edge.sourceDocumentId);
        const targetNode = this.graph.nodes.get(edge.targetDocumentId);
        return sourceNode?.type === 'document' && targetNode?.type === 'document';
      })
      .map(edge => ({
        source: edge.sourceDocumentId,
        target: edge.targetDocumentId,
        strength: edge.strength,
        type: edge.relationType,
      }));

    return { nodes, links };
  }

  /**
   * 提取文档引用
   */
  private extractReferences(chunks: DocumentChunk[]): string[] {
    const references = new Set<string>();
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)|\[\[([^\]]+)\]\]/g;

    for (const chunk of chunks) {
      const matches = chunk.content.matchAll(linkRegex);
      for (const match of matches) {
        const path = match[2] || match[3];
        if (path) {
          references.add(path);
        }
      }
    }

    return Array.from(references);
  }

  /**
   * 分析主题关联
   */
  private async analyzeTopicRelations(documentId: string): Promise<DocumentRelation[]> {
    const relations: DocumentRelation[] = [];
    const vectorStore = getVectorStore();
    const embeddingService = getEmbeddingService();

    const currentChunks = await vectorStore.getChunksByDocument(documentId);
    if (currentChunks.length === 0) return relations;

    // 提取当前文档的主题
    const currentTopics = await this.extractTopics(currentChunks);

    // 查找具有相同主题的其他文档
    const allDocIds = vectorStore.getDocumentIds();

    for (const otherDocId of allDocIds) {
      if (otherDocId === documentId) continue;

      const otherChunks = await vectorStore.getChunksByDocument(otherDocId);
      if (otherChunks.length === 0) continue;

      const otherTopics = await this.extractTopics(otherChunks);

      // 计算主题重叠度
      const sharedTopics = currentTopics.filter(t => otherTopics.includes(t));

      if (sharedTopics.length > 0) {
        const strength = sharedTopics.length / Math.max(currentTopics.length, otherTopics.length);

        relations.push({
          sourceDocumentId: documentId,
          targetDocumentId: otherDocId,
          relationType: 'similar',
          strength,
          metadata: {
            sharedTopics,
          },
        });
      }
    }

    return relations;
  }

  /**
   * 提取文档主题
   */
  private async extractTopics(chunks: DocumentChunk[]): Promise<string[]> {
    // 简化实现: 使用关键词提取
    const allContent = chunks.map(c => c.content).join('\n');
    const words = allContent
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);

    // 统计词频
    const wordFreq = new Map<string, number>();
    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }

    // 返回前 10 个高频词作为主题
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * 提取主题节点
   */
  private async extractTopicNodes(): Promise<void> {
    const vectorStore = getVectorStore();
    const documentIds = vectorStore.getDocumentIds();

    // 收集所有主题
    const allTopics = new Map<string, Set<string>>();

    for (const docId of documentIds) {
      const chunks = await vectorStore.getChunksByDocument(docId);
      const topics = await this.extractTopics(chunks);

      for (const topic of topics) {
        if (!allTopics.has(topic)) {
          allTopics.set(topic, new Set());
        }
        allTopics.get(topic)!.add(docId);
      }
    }

    // 添加主题节点
    for (const [topic, docIds] of allTopics.entries()) {
      if (docIds.size > 1) { // 只保留多个文档共享的主题
        const topicId = `topic:${topic}`;
        this.graph.nodes.set(topicId, {
          id: topicId,
          type: 'topic',
          label: topic,
          metadata: {
            documentCount: docIds.size,
          },
        });

        // 添加主题-文档边
        for (const docId of docIds) {
          this.graph.edges.set(`${topicId}-${docId}`, {
            sourceDocumentId: topicId,
            targetDocumentId: docId,
            relationType: 'similar',
            strength: 0.3,
          });
        }
      }
    }
  }
}

// 全局知识图谱服务实例
let globalKnowledgeGraphService: KnowledgeGraphService | null = null;

export function getKnowledgeGraphService(): KnowledgeGraphService {
  if (!globalKnowledgeGraphService) {
    globalKnowledgeGraphService = new KnowledgeGraphService();
  }
  return globalKnowledgeGraphService;
}
