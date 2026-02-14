<!--
  Cursor 风格的 AI 命令面板
  Cmd+K 触发，提供快捷的 AI 操作
-->
<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import { Sparkles, Loader2, ChevronRight } from 'lucide-vue-next';

const props = defineProps<{
  modelValue: boolean;
  selectedText?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'execute': [command: string, params?: any];
}>();

const searchQuery = ref('');
const selectedIndex = ref(0);
const containerRef = ref<HTMLElement>();

// AI 命令列表
const commands = computed(() => {
  const baseCommands = [
    {
      id: 'continue',
      label: 'AI 续写',
      description: '根据上下文继续写作',
      icon: '✍️',
      shortcut: 'Cmd+L',
      when: true,
    },
    {
      id: 'polish-professional',
      label: '润色为专业风格',
      description: '使文本更加专业正式',
      icon: '🎯',
      when: !!props.selectedText,
    },
    {
      id: 'polish-casual',
      label: '润色为轻松风格',
      description: '使文本更加轻松口语',
      icon: '💬',
      when: !!props.selectedText,
    },
    {
      id: 'polish-concise',
      label: '精简文本',
      description: '去除冗余，保留核心',
      icon: '✂️',
      when: !!props.selectedText,
    },
    {
      id: 'expand',
      label: '扩写内容',
      description: '增加更多细节和说明',
      icon: '📝',
      when: !!props.selectedText,
    },
    {
      id: 'summarize',
      label: '生成摘要',
      description: '提取核心观点',
      icon: '📋',
      when: !!props.selectedText,
    },
    {
      id: 'outline',
      label: '生成大纲',
      description: '为指定主题生成文章大纲',
      icon: '🗂️',
      when: true,
    },
    {
      id: 'analyze',
      label: '分析内容',
      description: '提取关键词和话题',
      icon: '🔍',
      when: !!props.selectedText,
    },
    {
      id: 'translate',
      label: '翻译',
      description: '翻译成英文/中文',
      icon: '🌐',
      when: !!props.selectedText,
      subcommands: [
        { id: 'translate-en', label: '翻译成英文' },
        { id: 'translate-zh', label: '翻译成中文' },
      ],
    },
  ];

  if (!searchQuery.value) {
    return baseCommands.filter(c => c.when);
  }

  // 搜索过滤
  const query = searchQuery.value.toLowerCase();
  return baseCommands.filter(c =>
    c.when && (
      c.label.toLowerCase().includes(query) ||
      c.description.toLowerCase().includes(query)
    )
  );
});

const selectedCommand = computed(() => commands.value[selectedIndex.value]);

// 键盘导航
const handleKeydown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      selectedIndex.value = Math.min(selectedIndex.value + 1, commands.value.length - 1);
      break;
    case 'ArrowUp':
      e.preventDefault();
      selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
      break;
    case 'Enter':
      e.preventDefault();
      executeCommand(selectedCommand.value);
      break;
    case 'Escape':
      e.preventDefault();
      emit('update:modelValue', false);
      break;
  }
};

const executeCommand = (command: any) => {
  if (!command) return;

  emit('execute', command.id, {
    selectedText: props.selectedText,
  });

  // 重置状态
  searchQuery.value = '';
  selectedIndex.value = 0;
  emit('update:modelValue', false);
};

// 重置状态
watch(() => props.modelValue, (open) => {
  if (open) {
    searchQuery.value = '';
    selectedIndex.value = 0;
    nextTick(() => {
      containerRef.value?.querySelector('input')?.focus();
    });
  }
});

// 搜索时重置选择
watch(searchQuery, () => {
  selectedIndex.value = 0;
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="ai-command-palette-overlay"
      @click.self="emit('update:modelValue', false)"
    >
      <div
        ref="containerRef"
        class="ai-command-palette"
        @keydown="handleKeydown"
      >
        <!-- 搜索输入框 -->
        <div class="palette-header">
          <Sparkles class="w-5 h-5 text-blue-500" />
          <input
            v-model="searchQuery"
            type="text"
            class="palette-input"
            placeholder="输入命令或搜索..."
            autocomplete="off"
          />
        </div>

        <!-- 命令列表 -->
        <div class="palette-commands">
          <div
            v-for="(command, index) in commands"
            :key="command.id"
            class="palette-command"
            :class="{ selected: index === selectedIndex }"
            @click="executeCommand(command)"
            @mouseenter="selectedIndex = index"
          >
            <div class="command-icon">{{ command.icon }}</div>
            <div class="command-content">
              <div class="command-label">{{ command.label }}</div>
              <div class="command-description">{{ command.description }}</div>
            </div>
            <div v-if="command.shortcut" class="command-shortcut">
              {{ command.shortcut }}
            </div>
            <ChevronRight v-if="command.subcommands" class="w-4 h-4" />
          </div>

          <!-- 无结果 -->
          <div v-if="commands.length === 0" class="palette-empty">
            没有找到匹配的命令
          </div>
        </div>

        <!-- 底部提示 -->
        <div class="palette-footer">
          <span class="hint">↑↓ 选择</span>
          <span class="hint">Enter 执行</span>
          <span class="hint">Esc 关闭</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ai-command-palette-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.ai-command-palette {
  width: 90%;
  max-width: 560px;
  background: oklch(0.2 0 0);
  border: 1px solid oklch(0.3 0 0);
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.palette-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid oklch(0.25 0 0);
}

.palette-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 16px;
  color: oklch(0.9 0 0);
}

.palette-input::placeholder {
  color: oklch(0.5 0 0);
}

.palette-commands {
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
}

.palette-command {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.palette-command:hover,
.palette-command.selected {
  background: oklch(0.25 0 0);
}

.command-icon {
  font-size: 20px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.command-content {
  flex: 1;
}

.command-label {
  font-size: 14px;
  font-weight: 500;
  color: oklch(0.9 0 0);
}

.command-description {
  font-size: 12px;
  color: oklch(0.5 0 0);
  margin-top: 2px;
}

.command-shortcut {
  font-size: 12px;
  color: oklch(0.4 0 0);
  background: oklch(0.15 0 0);
  padding: 4px 8px;
  border-radius: 4px;
}

.palette-empty {
  padding: 40px;
  text-align: center;
  color: oklch(0.5 0 0);
}

.palette-footer {
  display: flex;
  gap: 16px;
  padding: 12px 16px;
  border-top: 1px solid oklch(0.25 0 0);
}

.hint {
  font-size: 12px;
  color: oklch(0.4 0 0);
}

/* 滚动条 */
.palette-commands::-webkit-scrollbar {
  width: 8px;
}

.palette-commands::-webkit-scrollbar-track {
  background: transparent;
}

.palette-commands::-webkit-scrollbar-thumb {
  background: oklch(0.2 0 0);
  border-radius: 4px;
}

.palette-commands::-webkit-scrollbar-thumb:hover {
  background: oklch(0.25 0 0);
}
</style>
