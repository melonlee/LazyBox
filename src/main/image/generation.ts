/**
 * AI 生图服务
 * 支持 Stable Diffusion 和其他图像生成 API
 */

export interface ImageGenerationOptions {
  size?: '256x256' | '512x512' | '768x768' | '1024x1024';
  style?: 'natural' | 'vivid' | 'precise';
  quality?: 'standard' | 'hd';
  steps?: number;
  cfg_scale?: number;
  seed?: number;
  negative_prompt?: string;
}

export interface GeneratedImage {
  url: string;
  base64?: string;
  width: number;
  height: number;
  seed: number;
  revised_prompt?: string;
}

export interface ImageSuggestion {
  position: number;
  prompt: string;
  reason: string;
}

/**
 * AI 生图服务
 */
class ImageGenerationService {
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string, baseURL = 'https://api.stability.ai/v2beta') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  /**
   * 生成图片
   */
  async generateImage(prompt: string, options: ImageGenerationOptions = {}): Promise<GeneratedImage> {
    const {
      size = '1024x1024',
      style = 'natural',
      quality = 'standard',
      steps = 30,
      cfg_scale = 7,
      seed,
      negative_prompt,
    } = options;

    const [width, height] = size.split('x').map(Number);

    try {
      // Stable Diffusion API
      const response = await fetch(`${this.baseURL}/text-to-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text_prompts: [{ text: prompt }],
          cfg_scale,
          height,
          width,
          steps,
          seed,
          sampler: 'k_euler',
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        url: data.image,
        width,
        height,
        seed: seed || 0,
      };
    } catch (error) {
      console.error('Image generation error:', error);
      throw new Error(`AI 生图失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 根据文章内容建议图片
   */
  async suggestImages(content: string): Promise<ImageSuggestion[]> {
    const suggestions: ImageSuggestion[] = [];

    // 分析内容，提取关键段落
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 50);

    for (let i = 0; i < Math.min(paragraphs.length, 3); i++) {
      const paragraph = paragraphs[i];

      // 使用 AI 分析并生成图片建议
      const prompt = await this.generateImagePrompt(paragraph);

      suggestions.push({
        position: i,
        prompt,
        reason: `为第 ${i + 1} 段内容生成配图`,
      });
    }

    return suggestions;
  }

  private async generateImagePrompt(content: string): Promise<string> {
    // 简化版：提取关键词并生成提示词
    const keywords = this.extractKeywords(content);
    return `Professional illustration of ${keywords.join(', ')}, modern style, clean background, high quality`;
  }

  private extractKeywords(content: string): string[] {
    // 简化的关键词提取
    const words = content
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1)
      .slice(0, 5);

    return [...new Set(words)];
  }
}

/**
 * 图片优化工具
 */
class ImageOptimizationService {
  /**
   * 移除图片背景
   */
  async removeBackground(imageData: string): Promise<string> {
    // 使用 remove.bg API 或其他背景移除服务
    // 这里返回占位实现
    return imageData;
  }

  /**
   * 图片风格转换
   */
  async transformStyle(
    imageData: string,
    style: 'cartoon' | 'sketch' | 'oil' | 'watercolor'
  ): Promise<string> {
    // 风格转换实现
    return imageData;
  }

  /**
   * 图片扩展/补全
   */
  async extendImage(imageData: string, direction: 'left' | 'right' | 'up' | 'down'): Promise<string> {
    // 图片扩展实现
    return imageData;
  }

  /**
   * 图片超分辨率
   */
  async upscale(imageData: string, scale: 2 | 4): Promise<string> {
    // 超分辨率实现
    return imageData;
  }
}

// 全局服务实例
let imageService: ImageGenerationService | null = null;
let imageOptimizationService: ImageOptimizationService | null = null;

export function initImageServices(apiKey: string, baseURL?: string) {
  imageService = new ImageGenerationService(apiKey, baseURL);
  imageOptimizationService = new ImageOptimizationService();
  return { imageService, imageOptimizationService };
}

export function getImageService() {
  return imageService;
}

export function getImageOptimizationService() {
  return imageOptimizationService;
}
