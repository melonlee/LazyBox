/**
 * 写作上下文构建器
 */

import type { WritingContext, DocumentStructure, Heading, Outline, OutlineSection, DocumentMetadata, RelatedDocument } from './types';

/**
 * 从编辑器内容和光标位置构建写作上下文
 */
export function buildWritingContext(
  content: string,
  cursorPosition: { line: number; ch: number },
  selection: { start: { line: number; ch: number }; end: { line: number; ch: number } } | null,
  documentPath: string
): WritingContext {
  // 计算光标位置前后的内容
  const lines = content.split('\n');
  let beforeCursor = '';
  let afterCursor = '';
  let selectedText = '';

  // 构建光标前的内容
  for (let i = 0; i < cursorPosition.line; i++) {
    beforeCursor += lines[i] + '\n';
  }
  beforeCursor += lines[cursorPosition.line]?.slice(0, cursorPosition.ch) || '';

  // 构建光标后的内容
  afterCursor += lines[cursorPosition.line]?.slice(cursorPosition.ch) || '';
  for (let i = cursorPosition.line + 1; i < lines.length; i++) {
    afterCursor += '\n' + lines[i];
  }

  // 获取选中的文本
  if (selection) {
    selectedText = extractSelectedText(content, selection);
  }

  return {
    documentId: generateDocumentId(documentPath),
    documentPath,
    cursorPosition,
    beforeCursor,
    afterCursor,
    selectedText,
    documentStructure: analyzeStructure(content),
    metadata: analyzeMetadata(content),
  };
}

/**
 * 分析文档结构
 */
function analyzeStructure(content: string): DocumentStructure {
  const headings: Heading[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      headings.push({
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
        line: i,
      });
    }
  }

  const title = headings[0]?.text || '';
  const outline = buildOutline(headings);

  return {
    title,
    headings,
    outline,
  };
}

/**
 * 构建大纲
 */
function buildOutline(headings: Heading[]): Outline {
  const sections: OutlineSection[] = [];
  const stack: OutlineSection[] = [];

  for (const heading of headings) {
    const section: OutlineSection = {
      level: heading.level,
      title: heading.text,
    };

    // 找到合适的父级
    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      sections.push(section);
    } else {
      const parent = stack[stack.length - 1];
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(section);
    }

    stack.push(section);
  }

  return {
    title: headings[0]?.text,
    sections,
  };
}

/**
 * 分析文档元数据
 */
function analyzeMetadata(content: string): DocumentMetadata {
  // 计算字数（中文按字符计算，英文按单词计算）
  const chineseChars = content.match(/[\u4e00-\u9fa5]/g)?.length || 0;
  const englishWords = content.match(/[a-zA-Z]+/g)?.length || 0;
  const wordCount = chineseChars + englishWords;

  // 估算阅读时间（假设每分钟阅读 300 字/词）
  const readingTime = Math.ceil(wordCount / 300);

  return {
    wordCount,
    readingTime,
    tags: [], // 可以从 frontmatter 或 AI 分析中提取
    category: undefined,
  };
}

/**
 * 提取选中的文本
 */
function extractSelectedText(
  content: string,
  selection: { start: { line: number; ch: number }; end: { line: number; ch: number } }
): string {
  const lines = content.split('\n');
  let selectedText = '';

  if (selection.start.line === selection.end.line) {
    // 同一行
    const line = lines[selection.start.line] || '';
    selectedText = line.slice(selection.start.ch, selection.end.ch);
  } else {
    // 跨行
    for (let i = selection.start.line; i <= selection.end.line; i++) {
      const line = lines[i] || '';

      if (i === selection.start.line) {
        selectedText += line.slice(selection.start.ch);
      } else if (i === selection.end.line) {
        selectedText += line.slice(0, selection.end.ch);
      } else {
        selectedText += line;
      }

      if (i < selection.end.line) {
        selectedText += '\n';
      }
    }
  }

  return selectedText;
}

/**
 * 生成文档 ID
 */
function generateDocumentId(documentPath: string): string {
  // 使用文件路径的 hash 作为 ID
  let hash = 0;
  const str = documentPath;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash).toString(36);
}

/**
 * 查找相关文档（占位实现，后续可以结合向量搜索实现）
 */
export async function findRelatedDocuments(
  _documentPath: string,
  _content: string
): Promise<RelatedDocument[]> {
  // TODO: 实现基于向量搜索的相关文档查找
  return [];
}
