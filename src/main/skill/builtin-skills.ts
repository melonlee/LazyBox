/**
 * 内置 SKILL 库
 * 提供常用的写作、编辑和分析技能
 */

import { Skill } from './types';

/**
 * 写作技能
 */
export const writingSkills: Skill[] = [
  {
    id: 'skill-continue-writing',
    name: 'AI 续写',
    description: '根据上下文智能续写内容',
    category: 'writing',
    version: '1.0.0',
    enabled: true,
    tags: ['写作', '续写'],
    shortcut: 'Cmd+L',
    definition: {
      type: 'prompt',
      template: `请根据以下上下文继续写作，保持相同的风格和语调：

上下文：
{{context}}

当前光标位置：
{{cursor}}

请续写：`,
      parameters: [
        {
          name: 'context',
          description: '上下文内容',
          type: 'string',
          required: true,
        },
        {
          name: 'cursor',
          description: '光标位置内容',
          type: 'string',
          required: false,
        },
      ],
      systemPrompt: '你是一位专业的作家，擅长续写各种风格的文章。请保持原文的风格、语调和连贯性。',
      model: {
        temperature: 0.7,
        maxTokens: 500,
      },
    },
  },
  {
    id: 'skill-expand-text',
    name: '内容扩充',
    description: '将简短的内容扩充为更详细的段落',
    category: 'writing',
    version: '1.0.0',
    enabled: true,
    tags: ['写作', '扩充'],
    definition: {
      type: 'prompt',
      template: `请将以下内容扩充为更详细的段落：

原始内容：
{{content}}

要求：
1. 保持原文核心观点
2. 添加具体例子和细节
3. 使内容更加生动和具体

扩充后的内容：`,
      parameters: [
        {
          name: 'content',
          description: '要扩充的内容',
          type: 'string',
          required: true,
        },
      ],
      model: {
        temperature: 0.6,
        maxTokens: 800,
      },
    },
  },
  {
    id: 'skill-summarize',
    name: '内容摘要',
    description: '生成长文本的摘要',
    category: 'writing',
    version: '1.0.0',
    enabled: true,
    tags: ['写作', '摘要'],
    definition: {
      type: 'prompt',
      template: `请为以下内容生成一个简洁的摘要（不超过200字）：

原文：
{{content}}

摘要：`,
      parameters: [
        {
          name: 'content',
          description: '要摘要的内容',
          type: 'string',
          required: true,
        },
      ],
      model: {
        temperature: 0.3,
        maxTokens: 300,
      },
    },
  },
];

/**
 * 编辑技能
 */
export const editingSkills: Skill[] = [
  {
    id: 'skill-polish-professional',
    name: '专业润色',
    description: '将内容润色为专业风格',
    category: 'editing',
    version: '1.0.0',
    enabled: true,
    tags: ['编辑', '润色', '专业'],
    definition: {
      type: 'prompt',
      template: `请将以下内容润色为专业风格，保持原意不变：

原文：
{{content}}

润色后的内容：`,
      parameters: [
        {
          name: 'content',
          description: '要润色的内容',
          type: 'string',
          required: true,
        },
      ],
      systemPrompt: '你是一位专业的编辑，擅长将各种风格的内容润色为专业、正式的风格。',
      model: {
        temperature: 0.4,
        maxTokens: 1000,
      },
    },
  },
  {
    id: 'skill-fix-grammar',
    name: '语法修正',
    description: '检查并修正语法错误',
    category: 'editing',
    version: '1.0.0',
    enabled: true,
    tags: ['编辑', '语法'],
    definition: {
      type: 'prompt',
      template: `请检查并修正以下内容的语法错误，只输出修正后的内容：

{{content}}`,
      parameters: [
        {
          name: 'content',
          description: '要检查的内容',
          type: 'string',
          required: true,
        },
      ],
      systemPrompt: '你是一位专业的语法检查员，请仔细检查并修正语法错误。',
      model: {
        temperature: 0.2,
        maxTokens: 2000,
      },
    },
  },
  {
    id: 'skill-translate-zh',
    name: '翻译为中文',
    description: '将外文内容翻译为中文',
    category: 'editing',
    version: '1.0.0',
    enabled: true,
    tags: ['编辑', '翻译'],
    definition: {
      type: 'prompt',
      template: `请将以下内容翻译为中文，保持原文的含义和风格：

{{content}}`,
      parameters: [
        {
          name: 'content',
          description: '要翻译的内容',
          type: 'string',
          required: true,
        },
      ],
      model: {
        temperature: 0.3,
        maxTokens: 2000,
      },
    },
  },
  {
    id: 'skill-translate-en',
    name: '翻译为英文',
    description: '将中文内容翻译为英文',
    category: 'editing',
    version: '1.0.0',
    enabled: true,
    tags: ['编辑', '翻译'],
    definition: {
      type: 'prompt',
      template: `Please translate the following content into English, maintaining the original meaning and style:

{{content}}`,
      parameters: [
        {
          name: 'content',
          description: '要翻译的内容',
          type: 'string',
          required: true,
        },
      ],
      model: {
        temperature: 0.3,
        maxTokens: 2000,
      },
    },
  },
];

/**
 * 分析技能
 */
export const analysisSkills: Skill[] = [
  {
    id: 'skill-extract-keywords',
    name: '提取关键词',
    description: '从文本中提取关键词',
    category: 'analysis',
    version: '1.0.0',
    enabled: true,
    tags: ['分析', '关键词'],
    definition: {
      type: 'prompt',
      template: `请从以下内容中提取 5-10 个关键词，用逗号分隔：

{{content}}

关键词：`,
      parameters: [
        {
          name: 'content',
          description: '要分析的内容',
          type: 'string',
          required: true,
        },
      ],
      model: {
        temperature: 0.3,
        maxTokens: 100,
      },
    },
  },
  {
    id: 'skill-analyze-sentiment',
    name: '情感分析',
    description: '分析文本的情感倾向',
    category: 'analysis',
    version: '1.0.0',
    enabled: true,
    tags: ['分析', '情感'],
    definition: {
      type: 'prompt',
      template: `请分析以下内容的情感倾向，并给出评分（-1到1之间，-1为最负面，1为最正面）：

{{content}}

请按以下格式输出：
情感倾向：[正面/负面/中性]
评分：[分数]
理由：[简短理由]`,
      parameters: [
        {
          name: 'content',
          description: '要分析的内容',
          type: 'string',
          required: true,
        },
      ],
      model: {
        temperature: 0.2,
        maxTokens: 200,
      },
    },
  },
  {
    id: 'skill-generate-outline',
    name: '生成大纲',
    description: '根据主题生成文章大纲',
    category: 'analysis',
    version: '1.0.0',
    enabled: true,
    tags: ['分析', '大纲'],
    definition: {
      type: 'prompt',
      template: `请为以下主题生成一个详细的文章大纲：

主题：{{topic}}
风格：{{style}}

大纲：`,
      parameters: [
        {
          name: 'topic',
          description: '文章主题',
          type: 'string',
          required: true,
        },
        {
          name: 'style',
          description: '文章风格',
          type: 'string',
          required: false,
          default: '通用',
        },
      ],
      model: {
        temperature: 0.5,
        maxTokens: 1000,
      },
    },
  },
];

/**
 * 自动化技能
 */
export const automationSkills: Skill[] = [
  {
    id: 'skill-readability-check',
    name: '可读性检查',
    description: '检查文本的可读性并提供改进建议',
    category: 'automation',
    version: '1.0.0',
    enabled: true,
    tags: ['自动化', '可读性'],
    definition: {
      type: 'workflow',
      steps: [
        {
          id: 'analyze',
          name: '分析文本',
          type: 'prompt',
          config: {
            type: 'prompt',
            template: `请分析以下文本的可读性，包括：
1. 句子平均长度
2. 词汇难度
3. 段落结构
4. 改进建议

文本：
{{content}}`,
            model: { temperature: 0.3, maxTokens: 500 },
          },
        },
        {
          id: 'suggestions',
          name: '生成建议',
          type: 'prompt',
          config: {
            type: 'prompt',
            template: `基于以下分析结果，请提供 3-5 条具体的改进建议：

分析结果：
{{analyze}}

建议：`,
            model: { temperature: 0.5, maxTokens: 300 },
          },
          dependsOn: ['analyze'],
        },
      ],
      parameters: [
        {
          name: 'content',
          description: '要检查的内容',
          type: 'string',
          required: true,
        },
      ],
      mode: 'sequential',
    },
  },
  {
    id: 'skill-blog-post',
    name: '博客文章生成',
    description: '根据主题生成完整的博客文章',
    category: 'automation',
    version: '1.0.0',
    enabled: true,
    tags: ['自动化', '博客'],
    definition: {
      type: 'workflow',
      steps: [
        {
          id: 'outline',
          name: '生成大纲',
          type: 'prompt',
          config: {
            type: 'prompt',
            template: `请为主题"{{topic}}"生成一个博客文章大纲，包括引言、3-5个主要部分和结论。`,
            model: { temperature: 0.5, maxTokens: 500 },
          },
        },
        {
          id: 'introduction',
          name: '写引言',
          type: 'prompt',
          config: {
            type: 'prompt',
            template: `根据以下大纲，写一个吸引人的引言（约150字）：

大纲：
{{outline}}`,
            model: { temperature: 0.7, maxTokens: 200 },
          },
          dependsOn: ['outline'],
        },
        {
          id: 'body',
          name: '写正文',
          type: 'prompt',
          config: {
            type: 'prompt',
            template: `根据以下大纲，展开撰写正文部分（每个部分约200字）：

大纲：
{{outline}}`,
            model: { temperature: 0.6, maxTokens: 1000 },
          },
          dependsOn: ['outline'],
        },
        {
          id: 'conclusion',
          name: '写结论',
          type: 'prompt',
          config: {
            type: 'prompt',
            template: `根据以下内容，写一个总结性的结论（约100字）：

大纲：
{{outline}}`,
            model: { temperature: 0.5, maxTokens: 200 },
          },
          dependsOn: ['outline'],
        },
      ],
      parameters: [
        {
          name: 'topic',
          description: '博客主题',
          type: 'string',
          required: true,
        },
      ],
      mode: 'sequential',
    },
  },
];

/**
 * 获取所有内置技能
 */
export function getBuiltinSkills(): Skill[] {
  return [
    ...writingSkills,
    ...editingSkills,
    ...analysisSkills,
    ...automationSkills,
  ];
}

/**
 * 注册所有内置技能
 */
export function registerBuiltinSkills(manager: any): void {
  const skills = getBuiltinSkills();

  for (const skill of skills) {
    try {
      manager.register(skill);
    } catch (error) {
      console.error(`[SKILL] Failed to register builtin skill ${skill.id}:`, error);
    }
  }

  console.log(`[SKILL] Registered ${skills.length} builtin skills`);
}
