/**
 * 文档分块服务
 * 将长文档分割成适合嵌入和检索的小块
 */

import { DocumentChunk, ChunkingStrategy } from './types';

/**
 * 基础分块策略 - 按字符数分割
 */
export class CharacterChunkStrategy implements ChunkingStrategy {
  name = 'character';
  maxChunkSize = 1000;
  overlap = 200;

  constructor(maxChunkSize = 1000, overlap = 200) {
    this.maxChunkSize = maxChunkSize;
    this.overlap = overlap;
  }

  chunk(content: string, metadata: any): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let startIndex = 0;
    let chunkIndex = 0;

    while (startIndex < content.length) {
      const endIndex = Math.min(startIndex + this.maxChunkSize, content.length);
      let chunkEnd = endIndex;

      // 尝试在句子边界分割
      if (endIndex < content.length) {
        const lastPeriod = content.lastIndexOf('。', endIndex);
        const lastNewline = content.lastIndexOf('\n', endIndex);
        chunkEnd = Math.max(lastPeriod, lastNewline, startIndex + this.maxChunkSize / 2);
      }

      const chunkContent = content.substring(startIndex, chunkEnd).trim();

      chunks.push({
        id: this.generateChunkId(metadata.path, chunkIndex),
        documentId: metadata.path,
        documentPath: metadata.path,
        chunkIndex,
        content: chunkContent,
        metadata: {
          ...metadata,
          wordCount: chunkContent.length,
        },
      });

      startIndex = chunkEnd - this.overlap;
      chunkIndex++;
    }

    return chunks;
  }

  private generateChunkId(documentPath: string, index: number): string {
    return `${documentPath}-${index}`;
  }
}

/**
 * Markdown 分块策略 - 按 Markdown 结构分割
 */
export class MarkdownChunkStrategy implements ChunkingStrategy {
  name = 'markdown';
  maxChunkSize = 1500;
  overlap = 100;

  constructor(maxChunkSize = 1500, overlap = 100) {
    this.maxChunkSize = maxChunkSize;
    this.overlap = overlap;
  }

  chunk(content: string, metadata: any): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const lines = content.split('\n');

    let currentChunk = '';
    let currentHeader = '';
    let chunkIndex = 0;
    let currentLineIndex = 0;

    while (currentLineIndex < lines.length) {
      const line = lines[currentLineIndex];
      const isHeader = /^#{1,6}\s/.test(line);

      // 检测标题
      if (isHeader) {
        currentHeader = line;

        // 如果当前块已经足够大，保存它
        if (currentChunk.length > this.maxChunkSize) {
          chunks.push(this.createChunk(currentChunk.trim(), metadata, chunkIndex, currentHeader));
          chunkIndex++;
          currentChunk = '';
        }
      }

      currentChunk += line + '\n';
      currentLineIndex++;

      // 检查是否需要分割
      if (currentChunk.length >= this.maxChunkSize) {
        chunks.push(this.createChunk(currentChunk.trim(), metadata, chunkIndex, currentHeader));
        chunkIndex++;

        // 添加重叠
        const overlapLines = this.getOverlapLines(currentChunk, this.overlap);
        currentChunk = overlapLines;
      }
    }

    // 添加最后一个块
    if (currentChunk.trim().length > 0) {
      chunks.push(this.createChunk(currentChunk.trim(), metadata, chunkIndex, currentHeader));
    }

    return chunks;
  }

  private createChunk(content: string, metadata: any, index: number, header: string): DocumentChunk {
    return {
      id: this.generateChunkId(metadata.path, index),
      documentId: metadata.path,
      documentPath: metadata.path,
      chunkIndex: index,
      content,
      metadata: {
        ...metadata,
        header,
        wordCount: content.length,
      },
    };
  }

  private getOverlapLines(content: string, targetSize: number): string {
    const lines = content.split('\n');
    let result = '';
    let size = 0;

    for (let i = lines.length - 1; i >= 0; i--) {
      const lineSize = lines[i].length + 1;
      if (size + lineSize > targetSize) break;
      result = lines[i] + '\n' + result;
      size += lineSize;
    }

    return result;
  }

  private generateChunkId(documentPath: string, index: number): string {
    return `${documentPath}-${index}`;
  }
}

/**
 * 语义分块策略 - 按语义边界分割
 */
export class SemanticChunkStrategy implements ChunkingStrategy {
  name = 'semantic';
  maxChunkSize = 1200;
  overlap = 150;

  constructor(maxChunkSize = 1200, overlap = 150) {
    this.maxChunkSize = maxChunkSize;
    this.overlap = overlap;
  }

  chunk(content: string, metadata: any): DocumentChunk[] {
    // 首先按段落分割
    const paragraphs = content.split(/\n\s*\n/);
    const chunks: DocumentChunk[] = [];

    let currentChunk = '';
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (trimmed.length === 0) continue;

      // 检查是否应该开始新块
      if (currentChunk.length + trimmed.length > this.maxChunkSize && currentChunk.length > 0) {
        chunks.push(this.createChunk(currentChunk.trim(), metadata, chunkIndex));
        chunkIndex++;
        currentChunk = '';
      }

      currentChunk += trimmed + '\n\n';
    }

    // 添加最后一个块
    if (currentChunk.trim().length > 0) {
      chunks.push(this.createChunk(currentChunk.trim(), metadata, chunkIndex));
    }

    return chunks;
  }

  private createChunk(content: string, metadata: any, index: number): DocumentChunk {
    return {
      id: this.generateChunkId(metadata.path, index),
      documentId: metadata.path,
      documentPath: metadata.path,
      chunkIndex: index,
      content,
      metadata: {
        ...metadata,
        wordCount: content.length,
      },
    };
  }

  private generateChunkId(documentPath: string, index: number): string {
    return `${documentPath}-${index}`;
  }
}

/**
 * 分块管理器
 */
export class ChunkingManager {
  private strategies: Map<string, ChunkingStrategy> = new Map();
  private defaultStrategy: string;

  constructor() {
    this.strategies.set('character', new CharacterChunkStrategy());
    this.strategies.set('markdown', new MarkdownChunkStrategy());
    this.strategies.set('semantic', new SemanticChunkStrategy());
    this.defaultStrategy = 'semantic';
  }

  /**
   * 获取分块策略
   */
  getStrategy(name?: string): ChunkingStrategy {
    const strategyName = name || this.defaultStrategy;
    const strategy = this.strategies.get(strategyName);

    if (!strategy) {
      throw new Error(`Unknown chunking strategy: ${strategyName}`);
    }

    return strategy;
  }

  /**
   * 注册自定义分块策略
   */
  registerStrategy(strategy: ChunkingStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * 设置默认策略
   */
  setDefaultStrategy(name: string): void {
    if (!this.strategies.has(name)) {
      throw new Error(`Unknown chunking strategy: ${name}`);
    }
    this.defaultStrategy = name;
  }

  /**
   * 获取所有可用策略
   */
  getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }
}

// 全局分块管理器
let globalChunkingManager: ChunkingManager | null = null;

export function getChunkingManager(): ChunkingManager {
  if (!globalChunkingManager) {
    globalChunkingManager = new ChunkingManager();
  }
  return globalChunkingManager;
}
