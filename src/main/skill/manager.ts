/**
 * SKILL 管理器
 * 管理和执行 AI 技能
 */

import { app } from 'electron';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import {
  Skill,
  SkillManager,
  SkillContext,
  SkillResult,
  SkillDefinition,
  PromptSkill,
  WorkflowSkill,
  ToolSkill,
  HybridSkill,
  WorkflowStep,
} from './types';
import { getMCPManager } from '../mcp/manager';
import { getAIService } from '../ai';

/**
 * SKILL 管理器实现
 */
class SkillManagerImpl implements SkillManager {
  private skills: Map<string, Skill> = new Map();
  private storagePath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.storagePath = join(userDataPath, 'skills.json');
    this.loadSkills();
  }

  /**
   * 注册技能
   */
  register(skill: Skill): void {
    // 验证技能
    const validation = this.validate(skill);
    if (!validation.valid) {
      throw new Error(`Invalid skill: ${validation.errors.join(', ')}`);
    }

    // 存储技能
    this.skills.set(skill.id, skill);

    // 保存
    this.saveSkills();

    console.log(`[SKILL] Skill registered: ${skill.name} (${skill.id})`);
  }

  /**
   * 注销技能
   */
  unregister(skillId: string): void {
    if (!this.skills.has(skillId)) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    this.skills.delete(skillId);
    this.saveSkills();

    console.log(`[SKILL] Skill unregistered: ${skillId}`);
  }

  /**
   * 获取技能
   */
  getSkill(skillId: string): Skill | undefined {
    return this.skills.get(skillId);
  }

  /**
   * 获取所有技能
   */
  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * 按分类获取技能
   */
  getSkillsByCategory(category: Skill['category']): Skill[] {
    return this.getAllSkills().filter(s => s.category === category);
  }

  /**
   * 搜索技能
   */
  searchSkills(query: string): Skill[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllSkills().filter(
      s =>
        s.name.toLowerCase().includes(lowerQuery) ||
        s.description.toLowerCase().includes(lowerQuery) ||
        s.tags?.some(t => t.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * 启用技能
   */
  enable(skillId: string): void {
    const skill = this.skills.get(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    skill.enabled = true;
    this.saveSkills();
  }

  /**
   * 禁用技能
   */
  disable(skillId: string): void {
    const skill = this.skills.get(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    skill.enabled = false;
    this.saveSkills();
  }

  /**
   * 执行技能
   */
  async execute(skillId: string, context: SkillContext): Promise<SkillResult> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      return {
        success: false,
        error: `Skill not found: ${skillId}`,
      };
    }

    if (!skill.enabled) {
      return {
        success: false,
        error: `Skill is not enabled: ${skillId}`,
      };
    }

    const startTime = Date.now();

    try {
      let result: any;

      switch (skill.definition.type) {
        case 'prompt':
          result = await this.executePromptSkill(skill, skill.definition, context);
          break;
        case 'workflow':
          result = await this.executeWorkflowSkill(skill, skill.definition, context);
          break;
        case 'tool':
          result = await this.executeToolSkill(skill, skill.definition, context);
          break;
        case 'hybrid':
          result = await this.executeHybridSkill(skill, skill.definition, context);
          break;
        default:
          throw new Error(`Unknown skill type: ${(skill.definition as any).type}`);
      }

      return {
        success: true,
        output: result,
        details: {
          stepsExecuted: 1,
          executionTime: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      console.error(`[SKILL] Skill execution failed: ${skillId}`, error);
      return {
        success: false,
        error: error.message,
        details: {
          stepsExecuted: 0,
          executionTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * 验证技能
   */
  validate(skill: Skill): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!skill.id) errors.push('Skill must have an id');
    if (!skill.name) errors.push('Skill must have a name');
    if (!skill.description) errors.push('Skill must have a description');
    if (!skill.definition) errors.push('Skill must have a definition');

    if (skill.definition.type === 'prompt') {
      const def = skill.definition as PromptSkill;
      if (!def.template) errors.push('Prompt skill must have a template');
    } else if (skill.definition.type === 'workflow') {
      const def = skill.definition as WorkflowSkill;
      if (!def.steps || def.steps.length === 0) errors.push('Workflow skill must have steps');
    } else if (skill.definition.type === 'tool') {
      const def = skill.definition as ToolSkill;
      if (!def.tool) errors.push('Tool skill must specify a tool');
    } else if (skill.definition.type === 'hybrid') {
      const def = skill.definition as HybridSkill;
      if (!def.skills || def.skills.length === 0) errors.push('Hybrid skill must have sub-skills');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 导入技能
   */
  import(skillDefinition: any): Skill {
    // 验证必需字段
    if (!skillDefinition.id || !skillDefinition.name || !skillDefinition.definition) {
      throw new Error('Invalid skill definition');
    }

    const skill: Skill = {
      id: skillDefinition.id,
      name: skillDefinition.name,
      description: skillDefinition.description || '',
      category: skillDefinition.category || 'custom',
      version: skillDefinition.version || '1.0.0',
      enabled: skillDefinition.enabled !== false,
      definition: skillDefinition.definition,
      config: skillDefinition.config,
      permissions: skillDefinition.permissions,
      tags: skillDefinition.tags,
      icon: skillDefinition.icon,
      shortcut: skillDefinition.shortcut,
    };

    this.register(skill);
    return skill;
  }

  /**
   * 导出技能
   */
  export(skillId: string): any {
    const skill = this.skills.get(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    return {
      id: skill.id,
      name: skill.name,
      description: skill.description,
      category: skill.category,
      version: skill.version,
      enabled: skill.enabled,
      definition: skill.definition,
      config: skill.config,
      permissions: skill.permissions,
      tags: skill.tags,
      icon: skill.icon,
      shortcut: skill.shortcut,
    };
  }

  /**
   * 执行提示词技能
   */
  private async executePromptSkill(
    skill: Skill,
    definition: PromptSkill,
    context: SkillContext
  ): Promise<string> {
    // 填充模板
    const prompt = this.fillTemplate(definition.template, context.input);

    // 获取 AI 服务
    const aiService = getAIService();
    if (!aiService) {
      throw new Error('AI service not available');
    }

    // 执行 AI 调用
    const response = await aiService.streamText(prompt, {
      systemPrompt: definition.systemPrompt,
      ...definition.model,
    });

    return response;
  }

  /**
   * 执行工作流技能
   */
  private async executeWorkflowSkill(
    skill: Skill,
    definition: WorkflowSkill,
    context: SkillContext
  ): Promise<any> {
    const results: Map<string, any> = new Map();

    // 构建步骤执行图
    const stepGraph = this.buildStepGraph(definition.steps);

    // 按顺序执行步骤
    for (const step of definition.steps) {
      // 检查依赖
      if (step.dependsOn) {
        for (const dep of step.dependsOn) {
          if (!results.has(dep)) {
            throw new Error(`Dependency not met: ${dep}`);
          }
        }
      }

      // 执行步骤
      const stepResult = await this.executeWorkflowStep(step, results, context);
      results.set(step.id, stepResult);

      // 报告进度
      if (context.progress) {
        const current = results.size;
        const total = definition.steps.length;
        context.progress(current, total, step.name);
      }
    }

    // 返回最后一步的结果
    const lastStep = definition.steps[definition.steps.length - 1];
    return results.get(lastStep.id);
  }

  /**
   * 执行工具技能
   */
  private async executeToolSkill(
    skill: Skill,
    definition: ToolSkill,
    context: SkillContext
  ): Promise<any> {
    const mcpManager = getMCPManager();

    // 映射参数
    const params: Record<string, any> = {};
    for (const [key, value] of Object.entries(definition.parameterMapping)) {
      if (typeof value === 'string' && value.startsWith('$')) {
        // 参数引用
        const ref = value.substring(1);
        params[key] = context.input[ref];
      } else {
        params[key] = value;
      }
    }

    // 构建执行上下文
    const mcpContext = {
      aiConfig: context.aiConfig,
      userContext: context.environment,
      metadata: {},
      log: context.log,
    };

    // 执行工具
    const result = await mcpManager.executeTool(definition.tool, params, mcpContext);

    // 处理结果
    if (definition.resultProcessing) {
      return this.processResult(result, definition.resultProcessing);
    }

    return result;
  }

  /**
   * 执行混合技能
   */
  private async executeHybridSkill(
    skill: Skill,
    definition: HybridSkill,
    context: SkillContext
  ): Promise<any> {
    const results: any[] = [];

    // 执行子技能
    for (const subSkillDef of definition.skills) {
      const subSkill = this.skills.get(subSkillDef.skillId);
      if (!subSkill) {
        throw new Error(`Sub-skill not found: ${subSkillDef.skillId}`);
      }

      // 映射参数
      const mappedInput: Record<string, any> = {};
      if (subSkillDef.parameterMapping) {
        for (const [key, value] of Object.entries(subSkillDef.parameterMapping)) {
          if (typeof value === 'string' && value.startsWith('$')) {
            const ref = value.substring(1);
            mappedInput[key] = context.input[ref];
          } else {
            mappedInput[key] = value;
          }
        }
      } else {
        Object.assign(mappedInput, context.input);
      }

      // 创建新上下文
      const subContext: SkillContext = {
        ...context,
        input: mappedInput,
      };

      // 执行子技能
      const result = await this.execute(subSkill.id, subContext);
      if (!result.success) {
        throw new Error(`Sub-skill execution failed: ${result.error}`);
      }

      results.push(result.output);
    }

    // 合并结果
    if (definition.resultMerge) {
      return this.mergeResults(results, definition.resultMerge);
    }

    return results;
  }

  /**
   * 执行工作流步骤
   */
  private async executeWorkflowStep(
    step: WorkflowStep,
    previousResults: Map<string, any>,
    context: SkillContext
  ): Promise<any> {
    switch (step.type) {
      case 'prompt':
        return await this.executePromptStep(step, previousResults, context);
      case 'tool':
        return await this.executeToolStep(step, previousResults, context);
      case 'transform':
        return await this.executeTransformStep(step, previousResults, context);
      default:
        throw new Error(`Unsupported step type: ${step.type}`);
    }
  }

  /**
   * 执行提示词步骤
   */
  private async executePromptStep(
    step: WorkflowStep,
    previousResults: Map<string, any>,
    context: SkillContext
  ): Promise<string> {
    const config = step.config as any;

    // 准备输入数据
    const inputData = {
      ...context.input,
      ...Array.from(previousResults.entries()).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}),
    };

    // 填充模板
    const prompt = this.fillTemplate(config.template, inputData);

    // 获取 AI 服务
    const aiService = getAIService();
    if (!aiService) {
      throw new Error('AI service not available');
    }

    // 执行 AI 调用
    return await aiService.streamText(prompt, config.model || {});
  }

  /**
   * 执行工具步骤
   */
  private async executeToolStep(
    step: WorkflowStep,
    previousResults: Map<string, any>,
    context: SkillContext
  ): Promise<any> {
    const config = step.config as any;
    const mcpManager = getMCPManager();

    // 准备参数
    const params: Record<string, any> = {};
    for (const [key, value] of Object.entries(config.parameters)) {
      params[key] = this.resolveValue(value, context.input, previousResults);
    }

    // 构建上下文
    const mcpContext = {
      aiConfig: context.aiConfig,
      userContext: context.environment,
      metadata: {},
      log: context.log,
    };

    // 执行工具
    return await mcpManager.executeTool(config.tool, params, mcpContext);
  }

  /**
   * 执行转换步骤
   */
  private async executeTransformStep(
    step: WorkflowStep,
    previousResults: Map<string, any>,
    context: SkillContext
  ): Promise<any> {
    const config = step.config as any;

    // 获取输入值
    const inputValue = this.resolveValue(config.input, context.input, previousResults);

    // 应用转换
    switch (config.transform) {
      case 'uppercase':
        return String(inputValue).toUpperCase();
      case 'lowercase':
        return String(inputValue).toLowerCase();
      case 'length':
        return String(inputValue).length;
      case 'split':
        return String(inputValue).split('\n');
      case 'join':
        return Array.isArray(inputValue) ? inputValue.join('\n') : inputValue;
      default:
        return inputValue;
    }
  }

  /**
   * 填充模板
   */
  private fillTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return data[key] !== undefined ? String(data[key]) : `{{${key}}}`;
    });
  }

  /**
   * 解析值
   */
  private resolveValue(
    value: any,
    input: Record<string, any>,
    results: Map<string, any>
  ): any {
    if (typeof value === 'string' && value.startsWith('$')) {
      const ref = value.substring(1);
      if (input[ref] !== undefined) return input[ref];
      if (results.has(ref)) return results.get(ref);
      return value;
    }
    return value;
  }

  /**
   * 构建步骤图
   */
  private buildStepGraph(steps: WorkflowStep[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    for (const step of steps) {
      graph.set(step.id, step.dependsOn || []);
    }

    return graph;
  }

  /**
   * 处理结果
   */
  private processResult(result: any, processing: any): any {
    switch (processing.format) {
      case 'text':
        return String(result);
      case 'json':
        return JSON.stringify(result, null, 2);
      case 'markdown':
        if (processing.template) {
          return this.fillTemplate(processing.template, result);
        }
        return String(result);
      default:
        return result;
    }
  }

  /**
   * 合并结果
   */
  private mergeResults(results: any[], merge: any): any {
    switch (merge.strategy) {
      case 'append':
        return results.flat();
      case 'merge':
        return Object.assign({}, ...results);
      case 'template':
        if (merge.template) {
          const data = { results };
          return this.fillTemplate(merge.template, data);
        }
        return results;
      default:
        return results;
    }
  }

  /**
   * 加载技能
   */
  private loadSkills(): void {
    if (!existsSync(this.storagePath)) {
      return;
    }

    try {
      const data = JSON.parse(readFileSync(this.storagePath, 'utf-8'));
      const skills = data.skills || [];

      for (const skill of skills) {
        this.skills.set(skill.id, skill);
      }

      console.log(`[SKILL] Loaded ${this.skills.size} skills from disk`);
    } catch (error) {
      console.error('[SKILL] Failed to load skills:', error);
    }
  }

  /**
   * 保存技能
   */
  private saveSkills(): void {
    try {
      const data = {
        skills: Array.from(this.skills.values()),
        version: 1,
      };

      // 确保目录存在
      const dir = require('path').dirname(this.storagePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(this.storagePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[SKILL] Failed to save skills:', error);
    }
  }
}

// 全局技能管理器实例
let globalSkillManager: SkillManagerImpl | null = null;

export function getSkillManager(): SkillManager {
  if (!globalSkillManager) {
    globalSkillManager = new SkillManagerImpl();
  }
  return globalSkillManager;
}

export { SkillManagerImpl };
