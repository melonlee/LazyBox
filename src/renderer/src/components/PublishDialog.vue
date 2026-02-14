<!--
  多平台发布对话框
-->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { X, Check, Loader2, Globe, Download } from 'lucide-vue-next';
import { Button } from '@renderer/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import { Checkbox } from '@renderer/components/ui/checkbox';
import { toast } from 'vue-sonner';

const props = defineProps<{
  modelValue: boolean;
  content: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

// 状态
const platforms = ref<Array<{ name: string; displayName: string; icon: string; enabled: boolean }>>([]);
const selectedPlatforms = ref<string[]>([]);
const isLoading = ref(false);
const publishResults = ref<Map<string, any>>(new Map());

// 表单数据
const title = ref('');
const author = ref('');
const tags = ref('');
const summary = ref('');

// 加载平台列表
const loadPlatforms = async () => {
  try {
    const result = await window.$api.publishGetPlatforms();
    platforms.value = result;
  } catch (error) {
    console.error('Failed to load platforms:', error);
  }
};

// 发布
const handlePublish = async () => {
  if (selectedPlatforms.value.length === 0) {
    toast.error('请至少选择一个平台');
    return;
  }

  isLoading.value = true;

  try {
    const metadata = {
      title: title.value,
      author: author.value,
      tags: tags.value ? tags.value.split(',').map(t => t.trim()) : [],
      summary: summary.value,
    };

    const result = await window.$api.publishToPlatforms(
      props.content,
      metadata,
      selectedPlatforms.value
    );

    if (result.success) {
      publishResults.value = new Map(Object.entries(result.results));
      toast.success(`发布完成！成功 ${Object.values(result.results).filter((r: any) => r.success).length}/${selectedPlatforms.value.length} 个平台`);
    }
  } catch (error) {
    console.error('Publish error:', error);
    toast.error('发布失败');
  } finally {
    isLoading.value = false;
  }
};

// 导出为文件
const handleExport = async () => {
  try {
    const result = await window.$api.publishSelectSavePath();
    if (result.canceled) return;

    const metadata = {
      title: title.value,
      author: author.value,
      tags: tags.value ? tags.value.split(',').map(t => t.trim()) : [],
      summary: summary.value,
    };

    const exportResult = await window.$api.publishExportFile(
      props.content,
      metadata,
      'markdown',
      result.filePath
    );

    if (exportResult.success) {
      toast.success(`已导出到 ${exportResult.postUrl}`);
    }
  } catch (error) {
    console.error('Export error:', error);
    toast.error('导出失败');
  }
};

// 平台选择状态
const isPlatformSelected = (platformName: string) => {
  return selectedPlatforms.value.includes(platformName);
};

const togglePlatform = (platformName: string) => {
  const index = selectedPlatforms.value.indexOf(platformName);
  if (index > -1) {
    selectedPlatforms.value.splice(index, 1);
  } else {
    selectedPlatforms.value.push(platformName);
  }
};

// 全选/取消全选
const toggleAll = () => {
  if (selectedPlatforms.value.length === platforms.value.length) {
    selectedPlatforms.value = [];
  } else {
    selectedPlatforms.value = platforms.value.map(p => p.name);
  }
};

const isAllSelected = computed(() => {
  return platforms.value.length > 0 && selectedPlatforms.value.length === platforms.value.length;
});

// 监听打开
watch(() => props.modelValue, (open) => {
  if (open) {
    loadPlatforms();

    // 自动从内容中提取标题
    const titleMatch = props.content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      title.value = titleMatch[1];
    }
  }
});
</script>

<template>
  <Dialog :open="modelValue" @update:open="emit('update:modelValue', $event)">
    <DialogContent class="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle>发布到多平台</DialogTitle>
        <DialogDescription>
          选择要发布的平台，一键发布文章
        </DialogDescription>
      </DialogHeader>

      <div class="flex-1 overflow-y-auto p-6 space-y-6">
        <!-- 基本信息 -->
        <div class="space-y-4">
          <h3 class="text-sm font-medium">文章信息</h3>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-sm">标题</label>
              <input
                v-model="title"
                type="text"
                class="w-full px-3 py-2 bg-transparent border rounded-md text-sm"
                placeholder="文章标题"
              />
            </div>

            <div class="space-y-2">
              <label class="text-sm">作者</label>
              <input
                v-model="author"
                type="text"
                class="w-full px-3 py-2 bg-transparent border rounded-md text-sm"
                placeholder="作者名称"
              />
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-sm">标签（逗号分隔）</label>
            <input
              v-model="tags"
              type="text"
              class="w-full px-3 py-2 bg-transparent border rounded-md text-sm"
              placeholder="技术, 前端, JavaScript"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm">摘要</label>
            <textarea
              v-model="summary"
              class="w-full px-3 py-2 bg-transparent border rounded-md text-sm min-h-[80px] resize-none"
              placeholder="文章摘要..."
            />
          </div>
        </div>

        <!-- 平台选择 -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium">选择平台</h3>
            <button
              @click="toggleAll"
              class="text-xs text-blue-500 hover:underline"
            >
              {{ isAllSelected ? '取消全选' : '全选' }}
            </button>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="platform in platforms"
              :key="platform.name"
              @click="togglePlatform(platform.name)"
              class="p-4 border rounded-lg text-left transition-colors"
              :class="isPlatformSelected(platform.name) ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:border-gray-600'"
            >
              <div class="flex items-center gap-2">
                <span class="text-xl">{{ platform.icon }}</span>
                <span class="text-sm font-medium">{{ platform.displayName }}</span>
                <Check v-if="isPlatformSelected(platform.name)" class="h-4 w-4 ml-auto text-blue-500" />
              </div>
            </button>
          </div>

          <div class="text-xs text-gray-500">
            已选择 {{ selectedPlatforms.length }} 个平台
          </div>
        </div>

        <!-- 发布结果 -->
        <div v-if="publishResults.size > 0" class="space-y-4">
          <h3 class="text-sm font-medium">发布结果</h3>

          <div class="space-y-2">
            <div
              v-for="[platformName, result] of publishResults"
              :key="platformName"
              class="flex items-center justify-between p-3 border rounded-lg"
              :class="result.success ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5'"
            >
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium">{{ platformName }}</span>
                <span
                  class="text-xs"
                  :class="result.success ? 'text-green-500' : 'text-red-500'"
                >
                  {{ result.success ? '成功' : result.error || '失败' }}
                </span>
              </div>
              <Check v-if="result.success" class="h-4 w-4 text-green-500" />
            </div>
          </div>
        </div>
      </div>

      <DialogFooter class="flex gap-2">
        <Button variant="outline" @click="handleExport">
          <Download class="h-4 w-4 mr-1" />
          导出文件
        </Button>

        <Button
          @click="handlePublish"
          :disabled="selectedPlatforms.length === 0 || isLoading"
        >
          <Globe class="h-4 w-4 mr-1" />
          {{ isLoading ? '发布中...' : '发布' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
