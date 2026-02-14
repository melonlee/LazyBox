/**
 * Cursor 风格的 AI 内联编辑器
 * 在编辑器中直接显示 AI 建议和编辑
 */

import type { Editor } from 'codemirror';

export interface AISuggestion {
  text: string;
  type: 'continue' | 'edit' | 'insert';
}

interface InlineAIState {
  isGenerating: boolean;
  suggestion: AISuggestion | null;
  pendingRequest: AbortController | null;
}

export class CursorInlineAI {
  private editor: Editor;
  private state: InlineAIState = {
    isGenerating: false,
    suggestion: null,
    pendingRequest: null,
  };
  private ghostMarker: any = null;
  private ghostWidget: any = null;

  constructor(editor: Editor) {
    this.editor = editor;
    this.setupBindings();
  }

  private setupBindings() {
    // 键盘绑定在主编辑器设置中处理
    // 这里只提供 API
  }

  /**
   * 显示 ghost text (灰色建议文字)
   */
  showGhostText(text: string) {
    this.clearGhost();

    const cursor = this.editor.getCursor();
    const line = this.editor.getLine(cursor.line);
    const beforeCursor = line.slice(0, cursor.ch);

    // 创建 ghost widget
    const ghostDiv = document.createElement('div');
    ghostDiv.className = 'ai-ghost-widget';
    ghostDiv.innerHTML = `
      <span class="ai-ghost-before">${this.escapeHtml(beforeCursor)}</span><span class="ai-ghost-text">${this.escapeHtml(text)}</span>
    `;

    this.ghostWidget = (this.editor as any).addLineWidget(
      cursor.line,
      ghostDiv,
      {
        above: false,
        coverGutter: false,
      }
    );

    this.state.suggestion = { text, type: 'continue' };
  }

  /**
   * 清除 ghost text
   */
  clearGhost() {
    if (this.ghostWidget) {
      this.ghostWidget.clear();
      this.ghostWidget = null;
    }
    if (this.ghostMarker) {
      this.ghostMarker.clear();
      this.ghostMarker = null;
    }
    this.state.suggestion = null;
  }

  /**
   * 接受建议
   */
  acceptSuggestion() {
    if (!this.state.suggestion) return;

    const cursor = this.editor.getCursor();
    this.editor.replaceRange(this.state.suggestion.text, cursor);
    this.clearGhost();
  }

  /**
   * AI 续写 - 流式生成
   */
  async continueWriting(context: {
    content: string;
    cursorPosition: { line: number; ch: number };
    documentPath: string;
  }) {
    if (this.state.isGenerating) return;

    this.state.isGenerating = true;
    this.state.pendingRequest = new AbortController();

    try {
      // 显示 "思考中..." 占位符
      this.showGhostText('✨ 思考中...');

      // 监听流式响应
      let accumulated = '';
      const streamHandler = (data: { text: string }) => {
        accumulated += data.text;
        this.showGhostText(accumulated);
      };

      const endHandler = () => {
        window.$api.onAIStreamEnd(() => {});
        window.$api.onAIStreamError(() => {});
        window.$api.onAIStreamChunk(() => {});
      };

      window.$api.onAIStreamChunk(streamHandler);
      window.$api.onAIStreamEnd(endHandler);
      window.$api.onAIStreamError(() => {});

      await window.$api.aiStreamText(
        `请根据以下上下文继续写作，保持风格一致：

${context.content.slice(-500)}`,
        { maxTokens: 1000, temperature: 0.7 }
      );
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('AI continue error:', error);
        this.clearGhost();
      }
    } finally {
      this.state.isGenerating = false;
      this.state.pendingRequest = null;
    }
  }

  /**
   * 取消当前请求
   */
  cancel() {
    this.state.pendingRequest?.abort();
    this.clearGhost();
    this.state.isGenerating = false;
  }

  /**
   * 获取当前状态
   */
  getState() {
    return this.state;
  }

  private escapeHtml(text: string) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

// 全局实例
let globalInlineAI: CursorInlineAI | null = null;

export function initInlineAI(editor: Editor) {
  globalInlineAI = new CursorInlineAI(editor);
  return globalInlineAI;
}

export function getInlineAI() {
  return globalInlineAI;
}
