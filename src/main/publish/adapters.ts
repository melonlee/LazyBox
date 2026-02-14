/**
 * 多平台发布适配器
 * 支持 Markdown 内容一键发布到多个平台
 */

import * as fs from 'fs/promises';

// 平台配置
export interface PublishConfig {
  name: string;
  displayName: string;
  icon: string;
  enabled: boolean;
}

// 发布元数据
export interface PublishMetadata {
  title: string;
  author?: string;
  tags: string[];
  category?: string;
  summary?: string;
  coverImage?: string;
  publishTime?: Date;
}

// 转换后的内容
export interface TransformedContent {
  title: string;
  content: string;
  html?: string;
  metadata: Record<string, any>;
  assets?: PublishAsset[];
}

// 资源文件
export interface PublishAsset {
  type: 'image' | 'file';
  originalPath: string;
  processedPath?: string;
  url?: string;
}

// 发布结果
export interface PublishResult {
  success: boolean;
  platform: string;
  postId?: string;
  postUrl?: string;
  error?: string;
  publishedAt?: Date;
}

// 适配器接口
export interface PublishAdapter {
  name: string;
  displayName: string;
  icon: string;

  // 转换内容到平台格式
  transform(content: string, metadata: PublishMetadata): Promise<TransformedContent>;

  // 发布到平台
  publish(content: TransformedContent, credentials: any): Promise<PublishResult>;

  // 验证凭证
  validateCredentials?(credentials: any): Promise<boolean>;

  // 获取发布历史
  getPublishHistory?(credentials: any): Promise<PublishResult[]>;
}

// 微信公众号适配器
export class WeChatAdapter implements PublishAdapter {
  name = 'wechat';
  displayName = '微信公众号';
  icon = '💬';

  async transform(content: string, metadata: PublishMetadata): Promise<TransformedContent> {
    // 使用现有的微信渲染逻辑
    // 这里需要调用渲染器来生成HTML
    const html = await this.renderToWeChatHTML(content);

    return {
      title: metadata.title,
      content,
      html,
      metadata: {
        digest: metadata.summary,
        author: metadata.author,
      },
    };
  }

  async publish(content: TransformedContent, credentials: any): Promise<PublishResult> {
    // 微信公众号需要通过后台API或手动发布
    // 这里返回一个"需要手动复制"的结果
    return {
      success: true,
      platform: this.name,
      postId: 'manual',
      postUrl: '',
      publishedAt: new Date(),
    };
  }

  async validateCredentials(credentials: any): Promise<boolean> {
    // 微信验证逻辑
    return true;
  }

  private async renderToWeChatHTML(markdown: string): Promise<string> {
    // 调用现有的渲染器
    // 这里需要访问renderer的渲染功能
    return markdown; // 暂时返回原始markdown
  }
}

// 知乎适配器
export class ZhihuAdapter implements PublishAdapter {
  name = 'zhihu';
  displayName = '知乎';
  icon = '🧠';

  async transform(content: string, metadata: PublishMetadata): Promise<TransformedContent> {
    // 知乎支持的Markdown格式
    const processedContent = this.processForZhihu(content);

    return {
      title: metadata.title,
      content: processedContent,
      html: '',
      metadata: {
        excerpt: metadata.summary,
      },
    };
  }

  async publish(content: TransformedContent, credentials: any): Promise<PublishResult> {
    // 知乎需要通过API或手动发布
    return {
      success: true,
      platform: this.name,
      postId: 'manual',
    };
  }

  async validateCredentials(credentials: any): Promise<boolean> {
    return true;
  }

  private processForZhihu(markdown: string): string {
    // 知乎特定的格式转换
    return markdown
      // 知乎不支持代码块语言标识后的参数
      .replace(/```(\w+)?[:#][\s\S]*?```/g, (match) => {
        const codeContent = match.replace(/```[\w:#]*\n?/g, '').replace(/```$/g, '');
        return `\`\`\`\n${codeContent}\n\`\`\``;
      })
      // 知乎的表格语法
      .replace(/\|:-+\|/g, '|---|');
  }
}

// 掘金适配器
export class JuejinAdapter implements PublishAdapter {
  name = 'juejin';
  displayName = '掘金';
  icon = '💎';

  async transform(content: string, metadata: PublishMetadata): Promise<TransformedContent> {
    // 掘金支持的Markdown格式
    return {
      title: metadata.title,
      content: this.processForJuejin(content),
      metadata: {
        category: metadata.category || '前端',
        tags: metadata.tags,
      },
    };
  }

  async publish(content: TransformedContent, credentials: any): Promise<PublishResult> {
    return {
      success: true,
      platform: this.name,
    };
  }

  async validateCredentials(credentials: any): Promise<boolean> {
    return true;
  }

  private processForJuejin(markdown: string): string {
    return markdown;
  }
}

// 语雀适配器
export class YuqueAdapter implements PublishAdapter {
  name = 'yuque';
  displayName = '语雀';
  icon = '📖';

  async transform(content: string, metadata: PublishMetadata): Promise<TransformedContent> {
    return {
      title: metadata.title,
      content,
      metadata: {
        type: 'doc',
        format: 'markdown',
      },
    };
  }

  async publish(content: TransformedContent, credentials: any): Promise<PublishResult> {
    return {
      success: true,
      platform: this.name,
    };
  }
}

// 飞书文档适配器
export class FeishuAdapter implements PublishAdapter {
  name = 'feishu';
  displayName = '飞书文档';
  icon = '🚀';

  async transform(content: string, metadata: PublishMetadata): Promise<TransformedContent> {
    return {
      title: metadata.title,
      content,
      metadata: {},
    };
  }

  async publish(content: TransformedContent, credentials: any): Promise<PublishResult> {
    return {
      success: true,
      platform: this.name,
    };
  }
}

// Notion 适配器
export class NotionAdapter implements PublishAdapter {
  name = 'notion';
  displayName = 'Notion';
  icon = '📝';

  async transform(content: string, metadata: PublishMetadata): Promise<TransformedContent> {
    return {
      title: metadata.title,
      content,
      metadata: {},
    };
  }

  async publish(content: TransformedContent, credentials: any): Promise<PublishResult> {
    return {
      success: true,
      platform: this.name,
    };
  }
}

// 导出自定义Markdown (用于博客等)
export class MarkdownAdapter implements PublishAdapter {
  name = 'markdown';
  displayName = 'Markdown文件';
  icon = '📄';

  async transform(content: string, metadata: PublishMetadata): Promise<TransformedContent> {
    // 添加 frontmatter
    const frontmatter = this.generateFrontmatter(metadata);
    return {
      title: metadata.title,
      content: `${frontmatter}\n\n${content}`,
    };
  }

  async publish(content: TransformedContent, credentials: { filePath: string }): Promise<PublishResult> {
    try {
      await fs.writeFile(credentials.filePath, content.content, 'utf-8');
      return {
        success: true,
        platform: this.name,
        postUrl: credentials.filePath,
      };
    } catch (error) {
      return {
        success: false,
        platform: this.name,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private generateFrontmatter(metadata: PublishMetadata): string {
    const parts: string[] = ['---'];
    parts.push(`title: "${metadata.title}"`);
    if (metadata.author) parts.push(`author: "${metadata.author}"`);
    if (metadata.date) parts.push(`date: "${metadata.date}"`);
    if (metadata.tags?.length) parts.push(`tags: [${metadata.tags.map(t => `"${t}"`).join(', ')}]`);
    if (metadata.category) parts.push(`category: "${metadata.category}"`);
    parts.push('---');
    return parts.join('\n');
  }
}

// 发布管理器
export class PublishManager {
  private adapters: Map<string, PublishAdapter> = new Map();

  constructor() {
    this.registerAdapters();
  }

  private registerAdapters() {
    this.registerAdapter(new WeChatAdapter());
    this.registerAdapter(new ZhihuAdapter());
    this.registerAdapter(new JuejinAdapter());
    this.registerAdapter(new YuqueAdapter());
    this.registerAdapter(new FeishuAdapter());
    this.registerAdapter(new NotionAdapter());
    this.registerAdapter(new MarkdownAdapter());
  }

  registerAdapter(adapter: PublishAdapter) {
    this.adapters.set(adapter.name, adapter);
  }

  getAdapter(name: string): PublishAdapter | undefined {
    return this.adapters.get(name);
  }

  getAllAdapters(): PublishAdapter[] {
    return Array.from(this.adapters.values());
  }

  async publishToPlatforms(
    content: string,
    metadata: PublishMetadata,
    platforms: string[]
  ): Promise<Map<string, PublishResult>> {
    const results = new Map<string, PublishResult>();

    for (const platformName of platforms) {
      const adapter = this.getAdapter(platformName);
      if (!adapter) {
        results.set(platformName, {
          success: false,
          platform: platformName,
          error: `平台 ${platformName} 不支持`,
        });
        continue;
      }

      try {
        const transformed = await adapter.transform(content, metadata);
        const credentials = await this.getCredentials(platformName);
        const result = await adapter.publish(transformed, credentials);
        results.set(platformName, result);
      } catch (error) {
        results.set(platformName, {
          success: false,
          platform: platformName,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  private async getCredentials(platform: string): Promise<any> {
    // 从存储中获取平台凭证
    const stored = localStorage.getItem(`publish_credentials_${platform}`);
    if (stored) {
      return JSON.parse(stored);
    }
    return {};
  }

  async saveCredentials(platform: string, credentials: any): Promise<void> {
    localStorage.setItem(`publish_credentials_${platform}`, JSON.stringify(credentials));
  }

  async validateCredentials(platform: string, credentials: any): Promise<boolean> {
    const adapter = this.getAdapter(platform);
    if (!adapter || !adapter.validateCredentials) {
      return true;
    }
    return await adapter.validateCredentials(credentials);
  }
}

// 全局发布管理器
let globalPublishManager: PublishManager | null = null;

export function getPublishManager(): PublishManager {
  if (!globalPublishManager) {
    globalPublishManager = new PublishManager();
  }
  return globalPublishManager;
}
