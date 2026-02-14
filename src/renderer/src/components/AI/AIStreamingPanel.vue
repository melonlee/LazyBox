<!--
  AI 流式响应显示组件
  用于显示 AI 生成过程中的流式输出
-->
<script setup lang="ts">
import { Loader2, Sparkles, X, Copy, Check } from 'lucide-vue-next';
import { Button } from '@renderer/components/ui/button';
import { ref, watch, nextTick } from 'vue';
import { toast } from 'vue-sonner';

const props = defineProps<{
  modelValue: boolean;
  title?: string;
  generating?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'cancel': [];
  'apply': [text: string];
}>();

const content = ref('');
const container = useTemplateRef<HTMLDivElement | undefined>('container');

// 监听打开状态
watch(() => props.modelValue, (open) => {
  if (!open) {
    content.value = '';
  }
});

// 添加文本
const appendText = (text: string) => {
  content.value += text;
  // 自动滚动到底部
  nextTick(() => {
    if (container.value) {
      container.value.scrollTop = container.value.scrollHeight;
    }
  });
};

// 设置内容
const setContent = (text: string) => {
  content.value = text;
};

// 复制内容
const copyContent = async () => {
  try {
    await navigator.clipboard.writeText(content.value);
    toast.success('已复制到剪贴板');
  } catch (e) {
    toast.error('复制失败');
  }
};

// 关闭对话框
const close = () => {
  if (props.generating) {
    // 如果正在生成，提示用户
    const confirmed = confirm('AI 正在生成中，确定要取消吗？');
    if (!confirmed) return;
    emit('cancel');
  }
  emit('update:modelValue', false);
};

// 应用生成的内容
const apply = () => {
  if (!content.value) return;
  emit('apply', content.value);
  emit('update:modelValue', false);
};

// 暴露方法给父组件
defineExpose({
  appendText,
  setContent,
});
</script>

<template>
  <div
    v-if="modelValue"
    class="ai-streaming-panel fixed bottom-4 right-4 w-[500px] max-w-[calc(100vw-2rem)] bg-background border rounded-lg shadow-lg z-50 flex flex-col max-h-[600px]"
  >
    <!-- 标题栏 -->
    <div class="flex items-center justify-between p-4 border-b">
      <div class="flex items-center gap-2">
        <Sparkles class="h-4 w-4 text-blue-500" />
        <span class="font-medium">{{ title || 'AI 生成中...' }}</span>
        <Loader2 v-if="generating" class="h-4 w-4 animate-spin text-blue-500" />
      </div>
      <div class="flex items-center gap-1">
        <Button
          v-if="!generating && content"
          variant="ghost"
          size="sm"
          @click="copyContent"
        >
          <Copy class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          @click="close"
        >
          <X class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div
      ref="container"
      class="flex-1 overflow-y-auto p-4 min-h-[200px]"
    >
      <div
        v-if="content"
        class="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap"
        v-text="content"
      />
      <div
        v-else-if="generating"
        class="flex items-center justify-center h-full text-muted-foreground"
      >
        <Loader2 class="h-6 w-6 animate-spin mr-2" />
        <span>AI 正在思考...</span>
      </div>
      <div
        v-else
        class="flex items-center justify-center h-full text-muted-foreground"
      >
        <span>等待 AI 生成内容...</span>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="flex items-center justify-between p-4 border-t">
      <div class="text-sm text-muted-foreground">
        {{ content.length }} 字符
      </div>
      <div class="flex gap-2">
        <Button
          v-if="generating"
          variant="outline"
          size="sm"
          @click="$emit('cancel')"
        >
          取消生成
        </Button>
        <Button
          v-if="!generating && content"
          size="sm"
          @click="apply"
        >
          <Check class="h-4 w-4 mr-1" />
          应用
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-streaming-panel .prose {
  font-size: 0.875rem;
  line-height: 1.6;
}

/* 滚动条样式 */
.ai-streaming-panel :deep(.overflow-y-auto)::-webkit-scrollbar {
  width: 6px;
}

.ai-streaming-panel :deep(.overflow-y-auto)::-webkit-scrollbar-track {
  background: transparent;
}

.ai-streaming-panel :deep(.overflow-y-auto)::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 3px;
}

.ai-streaming-panel :deep(.overflow-y-auto)::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
}
</style>
