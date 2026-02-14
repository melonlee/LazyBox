/**
 * Claude AI Provider 实现
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  AIService,
  AIServiceConfig,
  ContentAnalysis,
  GenerationOptions,
  GeneratedImage,
  GenerateOutlineResult,
  ImageOptions,
  ImageSuggestion,
  OutlineStyle,
  PolishStyle,
  StreamCallback,
  WritingContext
} from '../types';

export class ClaudeAIProvider implements AIService {
  private client: Anthropic;
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }

  async generateText(prompt: string, options?: GenerationOptions): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature || 0.7,
        top_p: options?.topP,
        system: options?.systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      });

      if (response.content[0].type === 'text') {
        return response.content[0].text;
      }
      return '';
    } catch (error) {
      console.error('Claude generateText error:', error);
      throw new Error(`AI 生成失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async streamText(
    prompt: string,
    callback: StreamCallback,
    options?: GenerationOptions
  ): Promise<void> {
    try {
      const stream = await this.client.messages.create({
        model: this.config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature || 0.7,
        top_p: options?.topP,
        system: options?.systemPrompt,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            callback(event.delta.text);
          }
        }
      }
    } catch (error) {
      console.error('Claude streamText error:', error);
      throw new Error(`AI 流式生成失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async continueWriting(context: WritingContext): Promise<string> {
    const prompt = this.buildContinueWritingPrompt(context);
    return await this.generateText(prompt, {
      systemPrompt: '你是一个专业的写作助手，能够根据上下文续写内容，保持风格一致。',
      maxTokens: 2048,
    });
  }

  async polishText(text: string, style: PolishStyle): Promise<string> {
    const styleInstructions: Record<PolishStyle, string> = {
      'professional': '将以下文本改写为专业正式的风格，用词准确、逻辑清晰',
      'casual': '将以下文本改写为轻松口语的风格，更加自然亲切',
      'academic': '将以下文本改写为学术论文风格，严谨、客观、用词专业',
      'concise': '将以下文本精简，保留核心信息，去除冗余表达',
      'detailed': '将以下文本扩展，增加细节说明和例证，使其更丰满',
      'humorous': '将以下文本改写为幽默风趣的风格，增加趣味性',
      'translate-zh': '将以下英文文本翻译成地道的中文',
      'translate-en': '将以下中文文本翻译成地道的英文',
    };

    const prompt = `${styleInstructions[style]}\n\n原文：\n${text}\n\n改写后的文本：`;

    return await this.generateText(prompt, {
      maxTokens: 4096,
    });
  }

  async expandText(text: string, targetLength?: number): Promise<string> {
    const prompt = targetLength
      ? `请将以下文本扩展到约 ${targetLength} 字，增加细节、例证和深入分析，保持原意不变：\n\n${text}`
      : `请扩展以下文本，增加更多细节、例证和分析，使内容更加丰富完整：\n\n${text}`;

    return await this.generateText(prompt, {
      maxTokens: 4096,
    });
  }

  async summarizeText(text: string): Promise<string> {
    const prompt = `请为以下文本生成一个简洁准确的摘要（100-200字）：\n\n${text}`;

    return await this.generateText(prompt, {
      maxTokens: 500,
    });
  }

  async generateOutline(topic: string, style: OutlineStyle): Promise<GenerateOutlineResult> {
    const styleInstructions: Record<OutlineStyle, string> = {
      'blog': '博客文章，吸引眼球的开头，清晰的主体结构，有力的结尾',
      'tutorial': '教程，从基础到进阶，步骤清晰，包含示例和注意事项',
      'academic': '学术论文，研究背景、文献综述、研究方法、结果分析、结论讨论',
      'technical': '技术文档，概述、架构设计、实现细节、使用指南、常见问题',
      'news': '新闻报道，导语、事件详情、背景信息、影响分析、相关评论',
      'story': '故事创作，开端、发展、高潮、结局，人物刻画，情节起伏',
    };

    const prompt = `请为主题"${topic}"生成一个${styleInstructions[style]}的大纲。

请以JSON格式返回，包含以下字段：
{
  "title": "文章标题",
  "outline": {
    "sections": [
      {
        "level": 1,
        "title": "章节标题",
        "children": [...]
      }
    ]
  },
  "estimatedWordCount": 预估字数,
  "suggestedTags": ["标签1", "标签2", ...]
}`;

    const response = await this.generateText(prompt, {
      systemPrompt: '你是一个专业的内容策划助手，擅长创建各种类型的内容大纲。',
      maxTokens: 2048,
    });

    // 尝试解析 JSON
    try {
      // 提取 JSON 部分
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse outline JSON:', e);
    }

    // 如果解析失败，返回默认结构
    return {
      title: topic,
      outline: { sections: [{ level: 1, title: '引言' }, { level: 1, title: '正文' }, { level: 1, title: '结论' }] },
      estimatedWordCount: 1000,
      suggestedTags: [],
    };
  }

  async analyzeContent(content: string): Promise<ContentAnalysis> {
    const prompt = `请分析以下内容并返回JSON格式的分析结果：
{
  "summary": "内容摘要（50-100字）",
  "keywords": ["关键词1", "关键词2", ...],
  "sentiment": "positive/neutral/negative",
  "topics": ["主题1", "主题2", ...],
  "readabilityScore": 0-100的可读性分数,
  "suggestedTags": ["标签1", "标签2", ...]
}

要分析的内容：
${content.slice(0, 3000)}`;

    const response = await this.generateText(prompt, {
      maxTokens: 1000,
    });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse analysis JSON:', e);
    }

    return {
      summary: '',
      keywords: [],
      sentiment: 'neutral',
      topics: [],
      readabilityScore: 50,
      suggestedTags: [],
    };
  }

  async extractKeywords(content: string): Promise<string[]> {
    const analysis = await this.analyzeContent(content);
    return analysis.keywords;
  }

  async suggestTags(content: string): Promise<string[]> {
    const analysis = await this.analyzeContent(content);
    return analysis.suggestedTags;
  }

  async generateImage(_prompt: string, _options?: ImageOptions): Promise<GeneratedImage> {
    // Claude 不直接支持图片生成，需要调用其他服务
    // 这里暂时返回占位信息，实际实现需要集成 SD/MJ API
    throw new Error('图片生成功能需要额外配置 Stable Diffusion 或 Midjourney API');
  }

  async suggestImages(content: string): Promise<ImageSuggestion[]> {
    const prompt = `分析以下内容，建议需要插入图片的位置和图片描述，返回JSON：
[
  {
    "position": 段落序号，
    "prompt": "图片生成提示词（英文）",
    "reason": "推荐理由"
  }
]

内容：
${content.slice(0, 2000)}`;

    const response = await this.generateText(prompt, {
      maxTokens: 1000,
    });

    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse image suggestions JSON:', e);
    }

    return [];
  }

  private buildContinueWritingPrompt(context: WritingContext): string {
    const { beforeCursor, afterCursor, selectedText, documentStructure } = context;

    let prompt = '请根据以下上下文续写内容：\n\n';

    if (documentStructure.title) {
      prompt += `文章标题：${documentStructure.title}\n`;
    }

    if (selectedText) {
      prompt += `\n选中的文本：\n${selectedText}\n\n`;
      prompt += `请对选中的文本进行扩展或改写：`;
    } else {
      const recentContent = beforeCursor.slice(-500);
      prompt += `\n前面的内容：\n${recentContent}\n\n`;
      if (afterCursor) {
        prompt += `\n后面的内容：\n${afterCursor.slice(0, 200)}\n\n`;
      }
      prompt += `请根据前面的内容继续写作，保持风格一致：`;
    }

    return prompt;
  }
}

// AI 服务管理器
let aiServiceInstance: AIService | null = null;
let aiServiceConfig: AIServiceConfig | null = null;

export function createAIService(config: AIServiceConfig): AIService {
  switch (config.provider) {
    case 'claude':
      aiServiceInstance = new ClaudeAIProvider(config);
      break;
    case 'openai':
      // TODO: 实现 OpenAI provider
      throw new Error('OpenAI provider 尚未实现');
    default:
      throw new Error(`Unknown AI provider: ${config.provider}`);
  }

  aiServiceConfig = config;
  return aiServiceInstance;
}

export function getAIService(): AIService {
  if (!aiServiceInstance) {
    throw new Error('AI service not initialized. Call createAIService first.');
  }
  return aiServiceInstance;
}

export function getAIServiceConfig(): AIServiceConfig | null {
  return aiServiceConfig;
}

export function hasAIService(): boolean {
  return aiServiceInstance !== null;
}
