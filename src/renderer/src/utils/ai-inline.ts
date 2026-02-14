/**
 * Cursor 风格的 AI 编辑器增强
 * 参考 Cursor 的设计原则：
 * - 内联显示 AI 建议 (ghost text)
 * - Tab 接受，ESC 拒绝
 * - 不打断工作流
 * - Cmd+K 快捷命令
 */

import type { Editor } from 'codemirror';

interface AISuggestion {
  id: string;
  text: string;
  type: 'continue' | 'edit' | 'command';
  prompt?: string;
}

interface AIInlineState {
  isGenerating: boolean;
  currentSuggestion: AISuggestion | null;
  suggestions: AISuggestion[];
  selectedIndex: number;
}

/**
 * Cursor 风格的 AI 内联编辑器
 */
export class CursorAIInline {
  private editor: Editor;
  private state: AIInlineState = {
    isGenerating: false,
    currentSuggestion: null,
    suggestions: [],
    selectedIndex: 0,
  };
  private ghostWidget: any = null;
  private commandPalette: any = null;

  constructor(editor: Editor) {
    this.editor = editor;
    this.setupKeyBindings();
  }

  /**
   * 设置快捷键绑定
   */
  private setupKeyBindings() {
    // Tab - 接受 AI 建议
    // ESC - 拒绝 AI 建议
    // Cmd+K - 打开命令面板
    // Cmd+L - AI 续写
    // Cmd+I - AI 编辑选中内容
  }

  /**
   * 显示 ghost text (灰色建议文字)
   */
  showGhostText(text: string) {
    this.removeGhostText();

    const cursor = this.editor.getCursor();
    const line = this.editor.getLine(cursor.line);

    // 创建 ghost text widget
    this.ghostWidget = (this.editor as any).addLineWidget(
      cursor.line,
      document.createElement('div'),
      {
        above: false,
        handleMouseEvents: true,
      }
    );

    const widgetNode = this.ghostWidget.node;
    widgetNode.className = 'ai-ghost-text';
    widgetNode.innerHTML = `
      <span class="ai-ghost-prefix">${line.slice(0, cursor.ch)}</span>
      <span class="ai-ghost-suggestion">${text}</span>
    `;

    // 样式
    widgetNode.style.cssText = `
      position: relative;
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      color: transparent;
      pointer-events: none;
    `;

    const ghostSuggestion = widgetNode.querySelector('.ai-ghost-suggestion') as HTMLElement;
    ghostSuggestion.style.cssText = `
      color: rgba(128, 128, 128, 0.6);
      font-style: italic;
    `;

    this.state.currentSuggestion = {
      id: 'ghost-' + Date.now(),
      text,
      type: 'continue',
    };
  }

  /**
   * 移除 ghost text
   */
  removeGhostText() {
    if (this.ghostWidget) {
      this.ghostWidget.clear();
      this.ghostWidget = null;
    }
    this.state.currentSuggestion = null;
  }

  /**
   * 接受 AI 建议
   */
  acceptSuggestion() {
    if (!this.state.currentSuggestion) return;

    const cursor = this.editor.getCursor();
    this.editor.replaceRange(
      this.state.currentSuggestion.text,
      cursor,
      cursor
    );

    this.removeGhostText();
  }

  /**
   * AI 续写 - 流式生成并实时显示
   */
  async continueWriting(context: {
    beforeCursor: string;
    afterCursor: string;
    documentPath: string;
  }) {
    if (this.state.isGenerating) return;

    this.state.isGenerating = true;

    try {
      const response = await window.$api.aiContinueWriting({
        content: context.beforeCursor + context.afterCursor,
        cursorPosition: { line: 0, ch: context.beforeCursor.length },
        selection: null,
        documentPath: context.documentPath,
      });

      // 流式显示
      let accumulated = '';
      for (const char of response) {
        accumulated += char;
        this.showGhostText(accumulated);

        // 等待一小段时间，创造打字效果
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    } finally {
      this.state.isGenerating = false;
    }
  }

  /**
   * AI 编辑选中内容
   */
  async editSelection(instruction: string) {
    const selection = this.editor.getSelection();
    if (!selection) return;

    // 显示 "正在思考..."
    this.showGhostText('✨ 思考中...');

    try {
      const result = await window.$api.aiPolishText(selection, instruction);
      this.showGhostText(result);
    } catch (error) {
      this.removeGhostText();
    }
  }

  /**
   * 打开命令面板
   */
  openCommandPalette() {
    // TODO: 实现命令面板
    console.log('Open command palette');
  }
}

/**
 * 全局 AI 内联编辑器实例
 */
let globalAIInline: CursorAIInline | null = null;

export function initAIInline(editor: Editor) {
  globalAIInline = new CursorAIInline(editor);

  // 绑定快捷键
  (editor as any).on('keydown', (instance: Editor, event: KeyboardEvent) => {
    if (!globalAIInline) return;

    // Tab - 接受建议
    if (event.key === 'Tab' && globalAIInline['state'].currentSuggestion) {
      event.preventDefault();
      globalAIInline.acceptSuggestion();
      return;
    }

    // ESC - 拒绝建议
    if (event.key === 'Escape') {
      event.preventDefault();
      globalAIInline.removeGhostText();
      return;
    }
  });

  return globalAIInline;
}

export function getAIInline() {
  return globalAIInline;
}
