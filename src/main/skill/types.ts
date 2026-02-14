/**
 * SKILL 系统类型定义
 * 支持可复用的 AI 工作流和技能定义
 */

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: 'writing' | 'editing' | 'analysis' | 'automation' | 'custom';
  version: string;
  author?: string;
  enabled: boolean;

  // 技能定义
  definition: SkillDefinition;

  // 配置
  config?: SkillConfig;

  // 权限
  permissions?: string[];

  // 标签
  tags?: string[];

  // 图标
  icon?: string;

  // 快捷键
  shortcut?: string;
}

export type SkillDefinition =
  | PromptSkill
  | WorkflowSkill
  | ToolSkill
  | HybridSkill;

/**
 * 提示词技能 - 单个 AI 提示词
 */
export interface PromptSkill {
  type: 'prompt';

  // 提示词模板
  template: string;

  // 输入参数
  parameters: SkillParameter[];

  // 系统提示词
  systemPrompt?: string;

  // 模型配置
  model?: {
    provider?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

/**
 * 工作流技能 - 多步骤工作流
 */
export interface WorkflowSkill {
  type: 'workflow';

  // 工作流步骤
  steps: WorkflowStep[];

  // 输入参数
  parameters: SkillParameter[];

  // 输出定义
  outputs?: SkillOutput[];

  // 执行模式
  mode: 'sequential' | 'parallel' | 'conditional';

  // 错误处理
  onError?: 'stop' | 'continue' | 'retry';
  maxRetries?: number;
}

/**
 * 工作流步骤
 */
export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;

  // 步骤类型
  type: 'prompt' | 'tool' | 'condition' | 'loop' | 'transform';

  // 步骤配置
  config: PromptStepConfig | ToolStepConfig | ConditionStepConfig | LoopStepConfig | TransformStepConfig;

  // 依赖
  dependsOn?: string[];

  // 条件执行
  condition?: string;
}

export type StepConfig =
  | PromptStepConfig
  | ToolStepConfig
  | ConditionStepConfig
  | LoopStepConfig
  | TransformStepConfig;

export interface PromptStepConfig {
  type: 'prompt';
  template: string;
  model?: {
    provider?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export interface ToolStepConfig {
  type: 'tool';
  tool: string; // MCP tool name
  parameters: Record<string, any> | string; // 静态参数或参数引用
}

export interface ConditionStepConfig {
  type: 'condition';
  expression: string; // 条件表达式
  thenStep: string; // 满足条件时执行的步骤 ID
  elseStep?: string; // 不满足条件时执行的步骤 ID
}

export interface LoopStepConfig {
  type: 'loop';
  items: string; // 数组参数引用
  step: string; // 循环体步骤 ID
  variable: string; // 循环变量名
}

export interface TransformStepConfig {
  type: 'transform';
  transform: string; // 转换函数名或表达式
  input: string | Record<string, string>; // 输入参数引用
  output: string; // 输出变量名
}

/**
 * 工具技能 - MCP 工具封装
 */
export interface ToolSkill {
  type: 'tool';

  // MCP 工具引用
  tool: string;

  // 工具参数映射
  parameterMapping: Record<string, string>;

  // 结果处理
  resultProcessing?: {
    format: 'raw' | 'text' | 'json' | 'markdown';
    template?: string;
  };
}

/**
 * 混合技能 - 组合多种技能类型
 */
export interface HybridSkill {
  type: 'hybrid';

  // 子技能
  skills: Array<{
    skillId: string;
    alias?: string;
    parameterMapping?: Record<string, string>;
  }>;

  // 技能编排
  orchestration: {
    mode: 'sequential' | 'parallel' | 'dynamic';
    decisionLogic?: string; // 用于动态选择的逻辑
  };

  // 结果合并
  resultMerge?: {
    strategy: 'append' | 'merge' | 'template' | 'custom';
    template?: string;
  };
}

/**
 * 技能参数
 */
export interface SkillParameter {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  default?: any;
  enum?: any[];

  // UI 配置
  ui?: {
    label?: string;
    placeholder?: string;
    multiline?: boolean;
    min?: number;
    max?: number;
  };
}

/**
 * 技能输出
 */
export interface SkillOutput {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
}

/**
 * 技能配置
 */
export interface SkillConfig {
  // 执行配置
  execution?: {
    timeout?: number;
    retryOnError?: boolean;
    maxRetries?: number;
  };

  // UI 配置
  ui?: {
    position?: 'toolbar' | 'menu' | 'context';
    icon?: string;
    color?: string;
  };

  // 权限
  permissions?: string[];

  // 限制
  limits?: {
    maxInputLength?: number;
    maxOutputLength?: number;
    allowedUsers?: string[];
  };
}

/**
 * 技能执行上下文
 */
export interface SkillContext {
  // 用户输入
  input: Record<string, any>;

  // 环境上下文
  environment: {
    documentPath?: string;
    selection?: string;
    cursorPosition?: { line: number; ch: number };
    workspacePath?: string;
  };

  // AI 配置
  aiConfig: {
    provider: string;
    model?: string;
  };

  // 执行状态
  state: {
    stepOutputs: Map<string, any>;
    variables: Map<string, any>;
    currentStep?: string;
  };

  // 日志
  log: (message: string, level?: 'info' | 'warn' | 'error') => void;

  // 进度回调
  progress?: (current: number, total: number, message?: string) => void;
}

/**
 * 技能执行结果
 */
export interface SkillResult {
  success: boolean;
  output?: any;
  error?: string;

  // 执行详情
  details?: {
    stepsExecuted: number;
    executionTime: number;
    tokensUsed?: number;
  };

  // 中间结果
  intermediateResults?: Map<string, any>;
}

/**
 * 技能管理器
 */
export interface SkillManager {
  // 注册技能
  register(skill: Skill): void;

  // 注销技能
  unregister(skillId: string): void;

  // 获取技能
  getSkill(skillId: string): Skill | undefined;

  // 获取所有技能
  getAllSkills(): Skill[];

  // 按分类获取技能
  getSkillsByCategory(category: Skill['category']): Skill[];

  // 搜索技能
  searchSkills(query: string): Skill[];

  // 启用技能
  enable(skillId: string): void;

  // 禁用技能
  disable(skillId: string): void;

  // 执行技能
  execute(skillId: string, context: SkillContext): Promise<SkillResult>;

  // 验证技能
  validate(skill: Skill): { valid: boolean; errors: string[] };

  // 导入技能
  import(skillDefinition: any): Skill;

  // 导出技能
  export(skillId: string): any;
}
