/**
 * 向量存储类型定义
 * 支持文档分块、向量嵌入和语义搜索
 */

export interface DocumentChunk {
  id: string;
  documentId: string;
  documentPath: string;
  chunkIndex: number;
  content: string;
  metadata: {
    title: string;
    contentType: string;
    createdAt: number;
    updatedAt: number;
    tags?: string[];
    wordCount: number;
    [key: string]: any;
  };
  embedding?: number[];
}

export interface VectorDocument {
  id: string;
  chunks: DocumentChunk[];
  metadata: {
    title: string;
    path: string;
    createdAt: number;
    updatedAt: number;
    totalChunks: number;
    tags?: string[];
  };
}

export interface EmbeddingProvider {
  name: string;
  generateEmbedding(text: string): Promise<number[]>;
  generateBatchEmbeddings(texts: string[]): Promise<number[][]>;
  getDimension(): number;
}

export interface VectorStore {
  addChunk(chunk: DocumentChunk): Promise<void>;
  addChunks(chunks: DocumentChunk[]): Promise<void>;
  removeDocument(documentId: string): Promise<void>;
  search(query: number[], topK?: number, filter?: SearchFilter): Promise<SearchResult[]>;
  getChunksByDocument(documentId: string): Promise<DocumentChunk[]>;
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
  relevance: 'high' | 'medium' | 'low';
}

export interface SearchFilter {
  documentPath?: string;
  tags?: string[];
  contentType?: string;
  dateRange?: {
    start: number;
    end: number;
  };
}

export interface SemanticSearchOptions {
  topK?: number;
  minScore?: number;
  filter?: SearchFilter;
  rerank?: boolean;
}

export interface ChunkingStrategy {
  name: string;
  chunk(content: string, metadata: any): DocumentChunk[];
  maxChunkSize: number;
  overlap: number;
}

export interface DocumentRelation {
  sourceDocumentId: string;
  targetDocumentId: string;
  relationType: 'reference' | 'similar' | 'sequence' | 'derived';
  strength: number;
  metadata?: {
    sharedTopics?: string[];
    sharedTags?: string[];
    timestamp?: number;
  };
}

export interface KnowledgeGraph {
  nodes: Map<string, {
    id: string;
    type: 'document' | 'topic' | 'tag' | 'entity';
    label: string;
    metadata: any;
  }>;
  edges: Map<string, DocumentRelation>;
}
