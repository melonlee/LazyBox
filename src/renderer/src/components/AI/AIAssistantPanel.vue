<!--
  AI 助手面板组件
  提供快捷的 AI 操作入口
-->
<script setup lang="ts">
import { Sparkles, PenLine, Wand2, FileText, ListTree, Loader2 } from 'lucide-vue-next';
import { Button } from '@renderer/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@renderer/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@renderer/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import { Textarea } from '@renderer/components/ui/textarea';
import { useAI } from '@renderer/composables/useAI';
import { useStore } from '@renderer/stores';
import { toast } from 'vue-sonner';

const props = defineProps<{
  documentPath?: string;
}>();

const emit = defineEmits<{
  insert: [text: string];
  replace: [text: string];
}>();

const store = useStore();
const { isLoading, isStreaming, streamedText, isAIEnabled } = useAI();

// 对话框状态
const showOutlineDialog = ref(false);
const showPolishDialog = ref(false);
const showExpandDialog = ref(false);

// 大纲生成
const outlineTopic = ref('');
const outlineStyle = ref('blog' as 'blog' | 'tutorial' | 'academic' | 'technical' | 'news' | 'story');
const generatedOutline = ref<any>(null);

// 润色
const polishText = ref('');
const polishStyle = ref('professional');
const polishedResult = ref('');

// 扩写
const expandText = ref('');
const expandLength = ref(500);
const expandedResult = ref('');

// AI 续写
const isContinuing = ref(false);

// 选项配置
const polishStyles = [
  { value: 'professional', label: '专业正式', desc: '适合正式文档和报告' },
  { value: 'casual', label: '轻松口语', desc: '更自然亲切的表达' },
  { value: 'academic', label: '学术风格', desc: '严谨、客观、专业' },
  { value: 'concise', label: '简洁明了', desc: '去除冗余，保留核心' },
  { value: 'detailed', label: '详细阐述', desc: '增加细节和例证' },
  { value: 'humorous', label: '幽默风趣', desc: '增加趣味性' },
];

const outlineStyles = [
  { value: 'blog', label: '博客文章' },
  { value: 'tutorial', label: '教程' },
  { value: 'academic', label: '学术论文' },
  { value: 'technical', label: '技术文档' },
  { value: 'news', label: '新闻报道' },
  { value: 'story', label: '故事创作' },
];

// 获取选中的文本
const getSelectedText = () => {
  const editor = store.editor;
  if (!editor) return '';

  const selection = editor.getSelection();
  return selection || '';
};

// 获取编辑器内容
const getEditorContent = () => {
  const editor = store.editor;
  if (!editor) return '';

  return editor.getValue();
};

// 获取光标位置
const getCursorPosition = () => {
  const editor = store.editor;
  if (!editor) return { line: 0, ch: 0 };

  return editor.getCursor();
};

// AI 续写
const handleContinueWriting = async () => {
  if (!isAIEnabled.value) {
    toast.error('请先在设置中启用 AI 功能');
    return;
  }

  if (isContinuing.value) return;

  try {
    isContinuing.value = true;
    const { useAI: useAIUtil } = await import('@renderer/composables/useAI');
    const ai = useAIUtil();

    const content = getEditorContent();
    const cursorPos = getCursorPosition();

    const result = await ai.continueWriting({
      content,
      cursorPosition: cursorPos,
      selection: null,
      documentPath: props.documentPath || '',
    });

    // 插入到光标位置
    const editor = store.editor;
    if (editor && result) {
      const cursor = editor.getCursor();
      editor.replaceRange(result, cursor);
      toast.success('AI 续写完成');
    }
  } catch (e) {
    console.error('Continue writing error:', e);
    toast.error('AI 续写失败');
  } finally {
    isContinuing.value = false;
  }
};

// 生成大纲
const handleGenerateOutline = async () => {
  if (!outlineTopic.value.trim()) {
    toast.error('请输入主题');
    return;
  }

  try {
    const { useAI: useAIUtil } = await import('@renderer/composables/useAI');
    const ai = useAIUtil();

    const result = await ai.generateOutline(outlineTopic.value, outlineStyle.value);
    generatedOutline.value = result;
  } catch (e) {
    console.error('Generate outline error:', e);
    toast.error('生成大纲失败');
  }
};

// 应用大纲
const applyOutline = () => {
  if (!generatedOutline.value) return;

  // 将大纲转换为 Markdown
  let markdown = `# ${generatedOutline.value.title}\n\n`;

  const sectionsToMarkdown = (sections: any[], level = 1) => {
    for (const section of sections) {
      const prefix = '#'.repeat(level + 1);
      markdown += `${prefix} ${section.title}\n\n`;
      if (section.children && section.children.length > 0) {
        sectionsToMarkdown(section.children, level + 1);
      }
    }
  };

  if (generatedOutline.value.outline?.sections) {
    sectionsToMarkdown(generatedOutline.value.outline.sections);
  }

  emit('replace', markdown);
  showOutlineDialog.value = false;
  outlineTopic.value = '';
  generatedOutline.value = null;
  toast.success('大纲已应用');
};

// 润色文本
const handlePolish = async () => {
  const textToPolish = polishText.value || getSelectedText();

  if (!textToPolish) {
    toast.error('请选择要润色的文本');
    polishText.value = getSelectedText();
    return;
  }

  try {
    const { useAI: useAIUtil } = await import('@renderer/composables/useAI');
    const ai = useAIUtil();

    const result = await ai.polishText(textToPolish, polishStyle.value);
    polishedResult.value = result;
  } catch (e) {
    console.error('Polish error:', e);
    toast.error('润色失败');
  }
};

// 应用润色结果
const applyPolish = () => {
  if (!polishedResult.value) return;

  const editor = store.editor;
  if (editor) {
    // 替换选中的文本
    const selection = editor.getSelection();
    if (selection) {
      const cursor = editor.getCursor();
      editor.replaceSelection(polishedResult.value);
    } else {
      // 如果没有选中，插入到光标位置
      const cursor = editor.getCursor();
      editor.replaceRange(polishedResult.value, cursor);
    }
  }

  showPolishDialog.value = false;
  polishText.value = '';
  polishedResult.value = '';
  toast.success('润色已应用');
};

// 扩写文本
const handleExpand = async () => {
  const textToExpand = expandText.value || getSelectedText();

  if (!textToExpand) {
    toast.error('请选择要扩写的文本');
    expandText.value = getSelectedText();
    return;
  }

  try {
    const { useAI: useAIUtil } = await import('@renderer/composables/useAI');
    const ai = useAIUtil();

    const result = await ai.expandText(textToExpand, expandLength.value);
    expandedResult.value = result;
  } catch (e) {
    console.error('Expand error:', e);
    toast.error('扩写失败');
  }
};

// 应用扩写结果
const applyExpand = () => {
  if (!expandedResult.value) return;

  emit('replace', expandedResult.value);
  showExpandDialog.value = false;
  expandText.value = '';
  expandedResult.value = '';
  toast.success('扩写已应用');
};

// 打开润色对话框
const openPolishDialog = () => {
  polishText.value = getSelectedText();
  showPolishDialog.value = true;
};

// 打开扩写对话框
const openExpandDialog = () => {
  expandText.value = getSelectedText();
  showExpandDialog.value = true;
};
</script>

<template>
  <div class="ai-assistant-panel">
    <!-- 主要 AI 操作按钮 -->
    <div class="flex gap-2">
      <!-- AI 续写 -->
      <Button
        variant="default"
        :disabled="!isAIEnabled || isContinuing || isLoading"
        @click="handleContinueWriting"
        class="relative"
      >
        <Sparkles class="h-4 w-4 mr-1" />
        AI 续写
        <DropdownMenuShortcut>⌘⇧A</DropdownMenuShortcut>
        <Loader2 v-if="isContinuing" class="h-4 w-4 ml-1 animate-spin" />
      </Button>

      <!-- 更多 AI 操作 -->
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="outline" :disabled="!isAIEnabled || isLoading">
            <Wand2 class="h-4 w-4 mr-1" />
            AI 助手
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56">
          <DropdownMenuGroup>
            <DropdownMenuItem @click="openPolishDialog">
              <PenLine class="h-4 w-4 mr-2" />
              <span>AI 润色</span>
              <DropdownMenuShortcut>⌘⇧P</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem @click="openExpandDialog">
              <FileText class="h-4 w-4 mr-2" />
              <span>AI 扩写</span>
              <DropdownMenuShortcut>⌘⇧E</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem @click="showOutlineDialog = true">
              <ListTree class="h-4 w-4 mr-2" />
              <span>生成大纲</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <!-- 大纲生成对话框 -->
    <Dialog v-model:open="showOutlineDialog">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI 生成文章大纲</DialogTitle>
          <DialogDescription>
            输入文章主题，AI 将为您生成结构化的文章大纲
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">文章主题</label>
            <Input
              v-model="outlineTopic"
              placeholder="例如：React 18 新特性解析"
              @keydown.enter="handleGenerateOutline"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium">文章类型</label>
            <Select v-model="outlineStyle">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="style in outlineStyles"
                  :key="style.value"
                  :value="style.value"
                >
                  {{ style.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            @click="handleGenerateOutline"
            :disabled="!outlineTopic || isLoading"
            class="w-full"
          >
            <Sparkles class="h-4 w-4 mr-1" />
            {{ isLoading ? '生成中...' : '生成大纲' }}
          </Button>

          <!-- 生成结果 -->
          <div v-if="generatedOutline" class="space-y-3 border-t pt-4">
            <div class="space-y-2">
              <h3 class="font-medium">{{ generatedOutline.title }}</h3>
              <p class="text-sm text-muted-foreground">
                预估字数：{{ generatedOutline.estimatedWordCount }}
              </p>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="tag in generatedOutline.suggestedTags"
                  :key="tag"
                  class="text-xs bg-secondary px-2 py-1 rounded"
                >
                  {{ tag }}
                </span>
              </div>
            </div>

            <div class="space-y-1 text-sm">
              <div
                v-for="(section, i) in generatedOutline.outline?.sections"
                :key="i"
                class="pl-2"
                :style="{ paddingLeft: `${section.level * 16}px` }"
              >
                {{ '#'.repeat(section.level + 1) }} {{ section.title }}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showOutlineDialog = false">
            取消
          </Button>
          <Button
            v-if="generatedOutline"
            @click="applyOutline"
          >
            应用大纲
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 润色对话框 -->
    <Dialog v-model:open="showPolishDialog">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI 润色文本</DialogTitle>
          <DialogDescription>
            选择润色风格，AI 将优化您的文本表达
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">润色风格</label>
            <Select v-model="polishStyle">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="style in polishStyles"
                  :key="style.value"
                  :value="style.value"
                >
                  <div>
                    <div class="font-medium">{{ style.label }}</div>
                    <div class="text-xs text-muted-foreground">{{ style.desc }}</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium">原文本</label>
            <Textarea
              v-model="polishText"
              placeholder="选择要润色的文本，或直接输入..."
              class="min-h-[120px] resize-none"
            />
          </div>

          <Button
            @click="handlePolish"
            :disabled="!polishText || isLoading"
            class="w-full"
          >
            <Wand2 class="h-4 w-4 mr-1" />
            {{ isLoading ? '润色中...' : '开始润色' }}
          </Button>

          <!-- 润色结果 -->
          <div v-if="polishedResult" class="space-y-2 border-t pt-4">
            <label class="text-sm font-medium">润色结果</label>
            <div class="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
              {{ polishedResult }}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showPolishDialog = false">
            取消
          </Button>
          <Button
            v-if="polishedResult"
            @click="applyPolish"
          >
            应用结果
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 扩写对话框 -->
    <Dialog v-model:open="showExpandDialog">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI 扩写文本</DialogTitle>
          <DialogDescription>
            AI 将根据您的文本生成更丰富的内容
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">目标字数</label>
            <Input
              v-model.number="expandLength"
              type="number"
              placeholder="500"
              min="100"
              max="5000"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium">原文本</label>
            <Textarea
              v-model="expandText"
              placeholder="选择要扩写的文本，或直接输入..."
              class="min-h-[120px] resize-none"
            />
          </div>

          <Button
            @click="handleExpand"
            :disabled="!expandText || isLoading"
            class="w-full"
          >
            <FileText class="h-4 w-4 mr-1" />
            {{ isLoading ? '扩写中...' : '开始扩写' }}
          </Button>

          <!-- 扩写结果 -->
          <div v-if="expandedResult" class="space-y-2 border-t pt-4">
            <label class="text-sm font-medium">扩写结果</label>
            <div class="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
              {{ expandedResult }}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showExpandDialog = false">
            取消
          </Button>
          <Button
            v-if="expandedResult"
            @click="applyExpand"
          >
            应用结果
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
.ai-assistant-panel {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
