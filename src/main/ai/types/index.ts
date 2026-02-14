/**
 * AI 服务类型定义
 */

// AI 服务提供商
export type AIProvider = 'claude' | 'openai' | 'custom';

// 文本生成选项
export interface GenerationOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  systemPrompt?: string;
  stopSequences?: string[];
}

// 流式回调
export type StreamCallback = (text: string) => void;

// 写作上下文
export interface WritingContext {
  documentId: string;
  documentPath: string;
  cursorPosition: CursorPosition;
  beforeCursor: string;
  afterCursor: string;
  selectedText: string;
  documentStructure: DocumentStructure;
  metadata: DocumentMetadata;
}

export interface CursorPosition {
  line: number;
  ch: number;
}

export interface Heading {
  level: number;
  text: string;
  line: number;
}

export interface Outline {
  title?: string;
  sections: OutlineSection[];
}

export interface OutlineSection {
  level: number;
  title: string;
  children?: OutlineSection[];
}

export interface DocumentStructure {
  title?: string;
  headings: Heading[];
  outline: Outline;
}

export interface DocumentMetadata {
  wordCount: number;
  readingTime: number;
  tags: string[];
  category?: string;
}

export interface RelatedDocument {
  path: string;
  title: string;
  similarity: number;
}

// 润色样式
export type PolishStyle =
  | 'professional'      // 专业正式
  | 'casual'           // 轻松口语
  | 'academic'         // 学术风格
  | 'concise'          // 简洁明了
  | 'detailed'         // 详细阐述
  | 'humorous'         // 幽默风趣
  | 'translate-zh'     // 翻译成中文
  | 'translate-en';    // 翻译成英文

// 大纲样式
export type OutlineStyle =
  | 'blog'             // 博客文章
  | 'tutorial'         // 教程
  | 'academic'         // 学术论文
  | 'technical'        // 技术文档
  | 'news'             // 新闻报道
  | 'story';           // 故事创作

// 内容分析结果
export interface ContentAnalysis {
  summary: string;
  keywords: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  topics: string[];
  readabilityScore: number;
  suggestedTags: string[];
}

// 大纲生成结果
export interface GenerateOutlineResult {
  title: string;
  outline: Outline;
  estimatedWordCount: number;
  suggestedTags: string[];
}

// 图片生成选项
export interface ImageOptions {
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  style?: 'natural' | 'vivid' | 'precise';
  quality?: 'standard' | 'hd';
  count?: number;
}

// 生成图片结果
export interface GeneratedImage {
  url: string;
  revisedPrompt?: string;
  width: number;
  height: number;
}

// 图片建议
export interface ImageSuggestion {
  position: number;      // 建议插入的段落位置
  prompt: string;        // 图片描述
  reason: string;        // 推荐理由
}

// AI 服务接口
export interface AIService {
  // 文本生成
  generateText(prompt: string, options?: GenerationOptions): Promise<string>;
  streamText(prompt: string, callback: StreamCallback, options?: GenerationOptions): Promise<void>;

  // 写作辅助
  continueWriting(context: WritingContext): Promise<string>;
  polishText(text: string, style: PolishStyle): Promise<string>;
  expandText(text: string, targetLength?: number): Promise<string>;
  summarizeText(text: string): Promise<string>;

  // 大纲生成
  generateOutline(topic: string, style: OutlineStyle): Promise<GenerateOutlineResult>;

  // 内容分析
  analyzeContent(content: string): Promise<ContentAnalysis>;
  extractKeywords(content: string): Promise<string[]>;
  suggestTags(content: string): Promise<string[]>;

  // 图片生成
  generateImage(prompt: string, options?: ImageOptions): Promise<GeneratedImage>;
  suggestImages(content: string): Promise<ImageSuggestion[]>;
}

// AI 服务配置
export interface AIServiceConfig {
  provider: AIProvider;
  apiKey: string;
  baseURL?: string;
  model?: string;
}

// SKILL 执行结果
export interface SkillResult {
  content: string;
  type: 'replace' | 'append' | 'prepend' | 'custom';
  metadata?: Record<string, any>;
}
