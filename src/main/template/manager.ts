/**
 * 排版模板系统
 * 提供多种预定义的排版风格模板
 */

export interface TemplateStyle {
  id: string;
  name: string;
  description: string;
  preview: string;
  category: 'blog' | 'academic' | 'technical' | 'news' | 'creative';
  tags: string[];

  // CSS 样式定义
  base: {
    fontFamily?: string;
    fontSize?: string;
    lineHeight?: string;
    color?: string;
    backgroundColor?: string;
    padding?: string;
  };

  block: {
    h1?: Record<string, any>;
    h2?: Record<string, any>;
    h3?: Record<string, any>;
    h4?: Record<string, any>;
    h5?: Record<string, any>;
    h6?: Record<string, any>;
    p?: Record<string, any>;
    blockquote?: Record<string, any>;
    code?: Record<string, any>;
    'code_pre'?: Record<string, any>;
    ul?: Record<string, any>;
    ol?: Record<string, any>;
    table?: Record<string, any>;
    hr?: Record<string, any>;
  };

  inline: {
    link?: Record<string, any>;
    strong?: Record<string, any>;
    em?: Record<string, any>;
    code?: Record<string, any>;
    img?: Record<string, any>;
  };
}

// 内置模板库
export const builtInTemplates: TemplateStyle[] = [
  {
    id: 'clean-blog',
    name: '简洁博客',
    description: '适合个人博客的简洁风格',
    category: 'blog',
    tags: ['简约', '博客'],
    preview: '简洁现代的博客排版',
    base: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '16px',
      lineHeight: '1.8',
      color: '#333',
      padding: '20px',
      backgroundColor: '#ffffff',
    },
    block: {
      h1: {
        fontSize: '2.2em',
        fontWeight: '700',
        marginTop: '0.8em',
        marginBottom: '0.4em',
        color: '#1a1a1a',
        paddingBottom: '0.3em',
        borderBottom: '2px solid #e5e7eb',
      },
      h2: {
        fontSize: '1.8em',
        fontWeight: '600',
        marginTop: '1em',
        marginBottom: '0.5em',
        color: '#1a1a1a',
      },
      h3: {
        fontSize: '1.4em',
        fontWeight: '600',
        marginTop: '0.8em',
        marginBottom: '0.4em',
        color: '#1a1a1a',
      },
      p: {
        marginBottom: '1.2em',
        lineHeight: '1.8',
      },
      blockquote: {
        borderLeft: '4px solid #3b82f6',
        padding: '0 20px',
        margin: '1.5em 0',
        color: '#6b7280',
        fontStyle: 'italic',
        backgroundColor: '#f0f9ff',
        borderRadius: '4px',
      },
      code: {
        fontFamily: '"Fira Code", "JetBrains Mono", monospace',
        fontSize: '0.9em',
        backgroundColor: '#f3f4f6',
        padding: '2px 6px',
        borderRadius: '4px',
      },
      'code_pre': {
        backgroundColor: '#1e293b',
        color: '#e2e8f0',
        padding: '20px',
        borderRadius: '8px',
        overflowX: 'auto',
        marginTop: '1.5em',
        marginBottom: '1.5em',
      },
    },
  },
  {
    id: 'tech-docs',
    name: '技术文档',
    description: '适合技术文档和API文档',
    category: 'technical',
    tags: ['技术', '文档'],
    preview: '专业技术文档排版',
    base: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Mono", "Segoe UI Mono", monospace',
      fontSize: '15px',
      lineHeight: '1.7',
      color: '#24292e',
      padding: '24px',
    },
    block: {
      h1: {
        fontSize: '2em',
        fontWeight: '700',
        marginTop: '0',
        marginBottom: '0.5em',
        color: '#111827',
        borderBottom: '1px solid #d0d7de',
        paddingBottom: '0.3em',
      },
      h2: {
        fontSize: '1.5em',
        fontWeight: '600',
        marginTop: '1.5em',
        marginBottom: '0.5em',
        color: '#0969da',
      },
      h3: {
        fontSize: '1.25em',
        fontWeight: '600',
        marginTop: '1.2em',
        marginBottom: '0.4em',
        color: '#1f6feb',
      },
      p: {
        marginBottom: '1em',
        lineHeight: '1.7',
      },
      'code_pre': {
        backgroundColor: '#0d1117',
        color: '#c9d1d9',
        padding: '16px',
        borderRadius: '6px',
        fontSize: '14px',
        border: '1px solid #30363d',
        marginTop: '1.5em',
      },
    },
  },
  {
    id: 'academic-paper',
    name: '学术论文',
    description: '符合学术规范的论文格式',
    category: 'academic',
    tags: ['学术', '论文'],
    preview: '标准学术论文排版',
    base: {
      fontFamily: '"Times New Roman", "Songti SC", serif',
      fontSize: '12pt',
      lineHeight: '1.8',
      color: '#000000',
      padding: '1in 2in',
    },
    block: {
      h1: {
        fontSize: '24pt',
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: '24pt',
        marginBottom: '18pt',
        color: '#000000',
      },
      h2: {
        fontSize: '18pt',
        fontWeight: 'bold',
        marginTop: '18pt',
        marginBottom: '12pt',
        color: '#000000',
      },
      h3: {
        fontSize: '14pt',
        fontWeight: 'bold',
        marginTop: '12pt',
        marginBottom: '10pt',
        color: '#000000',
      },
      p: {
        textAlign: 'justify',
        textIndent: '2em',
        marginBottom: '12pt',
        lineHeight: '1.8',
        fontFamily: '"Songti SC", serif',
      },
      blockquote: {
        borderLeft: '3px solid #000',
        paddingLeft: '1em',
        marginLeft: '1em',
        marginRight: '1em',
        color: '#666',
        fontStyle: 'italic',
      },
    },
  },
  {
    id: 'news-article',
    name: '新闻报道',
    description: '适合新闻类文章的排版',
    category: 'news',
    tags: ['新闻', '媒体'],
    preview: '专业新闻报道排版',
    base: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Georgia", serif',
      fontSize: '17px',
      lineHeight: '1.6',
      color: '#121212',
      padding: '20px',
    },
    block: {
      h1: {
        fontSize: '2.2em',
        fontWeight: '700',
        marginTop: '0',
        marginBottom: '0.3em',
        color: '#000000',
      },
      h2: {
        fontSize: '1.5em',
        fontWeight: '600',
        marginTop: '1.2em',
        marginBottom: '0.4em',
        color: '#000000',
      },
      p: {
        marginBottom: '1em',
        lineHeight: '1.6',
      },
      blockquote: {
        borderLeft: '3px solid #000',
        paddingLeft: '16px',
        margin: '1.5em 0',
        color: '#666',
        fontStyle: 'italic',
        fontWeight: '500',
      },
    },
  },
  {
    id: 'magazine',
    name: '杂志风格',
    description: '时尚杂志的排版风格',
    category: 'creative',
    tags: ['杂志', '时尚'],
    preview: '时尚杂志排版',
    base: {
      fontFamily: '"Playfair Display", Georgia, serif',
      fontSize: '16px',
      lineHeight: '1.8',
      color: '#2c2c2c',
      padding: '30px',
      backgroundColor: '#fafafa',
    },
    block: {
      h1: {
        fontSize: '3em',
        fontWeight: '400',
        letterSpacing: '2px',
        marginTop: '0',
        marginBottom: '0.3em',
        color: '#1a1a1a',
        fontFamily: '"Playfair Display", serif',
      },
      h2: {
        fontSize: '2em',
        fontWeight: '400',
        marginTop: '1.5em',
        marginBottom: '0.4em',
        color: '#4a4a4a',
      },
      p: {
        marginBottom: '1.2em',
        textIndent: '1em',
        textAlign: 'justify',
      },
    },
  },
];

/**
 * 模板管理器
 */
export class TemplateManager {
  private templates: Map<string, TemplateStyle> = new Map();
  private userTemplates: TemplateStyle[] = [];

  constructor() {
    this.loadBuiltInTemplates();
  }

  /**
   * 加载内置模板
   */
  private loadBuiltInTemplates() {
    for (const template of builtInTemplates) {
      this.templates.set(template.id, template);
    }
  }

  /**
   * 获取所有模板
   */
  getAllTemplates(): TemplateStyle[] {
    return [...this.templates.values(), ...this.userTemplates];
  }

  /**
   * 按分类获取模板
   */
  getTemplatesByCategory(category: TemplateStyle['category']): TemplateStyle[] {
    return this.getAllTemplates().filter(t => t.category === category);
  }

  /**
   * 获取模板
   */
  getTemplate(id: string): TemplateStyle | undefined {
    return this.templates.get(id);
  }

  /**
   * 应用模板到内容
   */
  applyTemplate(content: string, templateId: string): string {
    const template = this.getTemplate(templateId);
    if (!template) {
      return content;
    }

    // 这里简化处理，实际应该解析 Markdown 并应用样式
    // 返回带样式的 HTML
    return this.generateStyledHTML(content, template);
  }

  /**
   * 生成带样式的 HTML
   */
  private generateStyledHTML(content: string, template: TemplateStyle): string {
    const style = this.buildCSSString(template);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${style}</style>
</head>
<body>
  <div class="template-container">
    ${content}
  </div>
</body>
</html>
    `;
  }

  /**
   * 构建 CSS 字符串
   */
  private buildCSSString(template: TemplateStyle): string {
    let css = '';

    // 基础样式
    css += `
.template-container {
  font-family: ${template.base.fontFamily || 'inherit'};
  font-size: ${template.base.fontSize || '16px'};
  line-height: ${template.base.lineHeight || '1.6'};
  color: ${template.base.color || '#333'};
  padding: ${template.base.padding || '20px'};
  background-color: ${template.base.backgroundColor || '#fff'};
}
`;

    // 块级元素样式
    if (template.block) {
      for (const [element, styles] of Object.entries(template.block)) {
        const selector = element.startsWith('code_') ? element.replace('_', '.') : `.${element}`;
        css += this.formatStyles(selector, styles);
      }
    }

    return css;
  }

  /**
   * 格式化样式对象
   */
  private formatStyles(selector: string, styles: Record<string, any>): string {
    const properties: string[] = [];

    for (const [property, value] of Object.entries(styles)) {
      const kebabProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
      properties.push(`${kebabProperty}: ${this.formatValue(value)};`);
    }

    return `${selector} { ${properties.join(' ')} }`;
  }

  /**
   * 格式化样式值
   */
  private formatValue(value: any): string {
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * 添加用户自定义模板
   */
  addUserTemplate(template: TemplateStyle): void {
    this.userTemplates.push(template);
    this.templates.set(template.id, template);
  }

  /**
   * 删除用户模板
   */
  removeUserTemplate(id: string): boolean {
    const index = this.userTemplates.findIndex(t => t.id === id);
    if (index > -1) {
      this.userTemplates.splice(index, 1);
      this.templates.delete(id);
      return true;
    }
    return false;
  }

  /**
   * 搜索模板
   */
  searchTemplates(query: string): TemplateStyle[] {
    const q = query.toLowerCase();
    return this.getAllTemplates().filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.toLowerCase().includes(q))
    );
  }
}

// 全局模板管理器
let globalTemplateManager: TemplateManager | null = null;

export function getTemplateManager(): TemplateManager {
  if (!globalTemplateManager) {
    globalTemplateManager = new TemplateManager();
  }
  return globalTemplateManager;
}
