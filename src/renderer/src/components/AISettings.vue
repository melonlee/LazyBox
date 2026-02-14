<!--
  AI 设置面板组件
-->
<script setup lang="ts">
import { Check, Eye, EyeOff, Sparkles } from 'lucide-vue-next';
import { useAI } from '@renderer/composables/useAI';
import { Button } from '@renderer/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import { Input } from '@renderer/components/ui/input';
import { Switch } from '@renderer/components/ui/switch';
import { toast } from 'vue-sonner';

const {
  aiConfig,
  isLoading,
  initAIConfig,
  updateAIConfig,
  checkAIEnabled,
  isAIEnabled,
} = useAI();

// 显示 API Key
const showAPIKey = ref(false);

// 临时表单数据
const formData = ref({
  apiKey: '',
  provider: 'claude' as 'claude' | 'openai',
  model: 'claude-3-5-sonnet-20241022',
});

// 模型选项
const modelOptions = [
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
  { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
  { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
];

// 初始化
onMounted(async () => {
  await initAIConfig();
  // 同步配置到表单
  formData.value.apiKey = aiConfig.value.apiKey || '';
  formData.value.provider = aiConfig.value.provider || 'claude';
  formData.value.model = aiConfig.value.model || 'claude-3-5-sonnet-20241022';
});

// 保存配置
const saveConfig = async () => {
  try {
    isLoading.value = true;

    // 如果启用了 AI 但没有 API Key，提示用户
    if (!formData.value.apiKey) {
      toast.error('请输入 API Key');
      return;
    }

    await updateAIConfig({
      apiKey: formData.value.apiKey,
      provider: formData.value.provider,
      model: formData.value.model,
      enabled: true,
    });

    toast.success('AI 配置已保存');
  } catch (e) {
    console.error('Failed to save AI config:', e);
    toast.error('保存失败，请重试');
  } finally {
    isLoading.value = false;
  }
};

// 切换 AI 开关
const toggleAI = async (enabled: boolean) => {
  try {
    isLoading.value = true;

    if (enabled && !formData.value.apiKey) {
      toast.error('请先输入 API Key');
      return;
    }

    await updateAIConfig({ enabled });
    await checkAIEnabled();

    toast.success(enabled ? 'AI 已启用' : 'AI 已禁用');
  } catch (e) {
    console.error('Failed to toggle AI:', e);
    toast.error('操作失败，请重试');
  } finally {
    isLoading.value = false;
  }
};

// 测试连接
const testConnection = async () => {
  if (!formData.value.apiKey) {
    toast.error('请先输入 API Key');
    return;
  }

  try {
    isLoading.value = true;

    // 临时保存配置进行测试
    await updateAIConfig({
      apiKey: formData.value.apiKey,
      provider: formData.value.provider,
      model: formData.value.model,
    });

    // 尝试调用 AI API
    const { useAI: useAIUtil } = await import('@renderer/composables/useAI');
    const ai = useAIUtil();
    const result = await ai.generateText('你好，请回复"测试成功"', { maxTokens: 10 });

    if (result) {
      toast.success('连接测试成功');
    }
  } catch (e) {
    console.error('Connection test failed:', e);
    toast.error('连接测试失败，请检查 API Key');
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="ai-settings space-y-4">
    <!-- 标题 -->
    <div class="flex items-center gap-2 border-b pb-2">
      <Sparkles class="h-5 w-5 text-blue-500" />
      <h2 class="text-lg font-semibold">AI 设置</h2>
    </div>

    <!-- AI 开关 -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Switch
          :checked="isAIEnabled"
          @update:checked="toggleAI"
        />
        <span class="text-sm">启用 AI 功能</span>
      </div>
      <div v-if="isAIEnabled" class="flex items-center gap-1 text-xs text-green-500">
        <Check class="h-3 w-3" />
        <span>已启用</span>
      </div>
    </div>

    <!-- API Provider -->
    <div class="space-y-2">
      <label class="text-sm font-medium">AI 提供商</label>
      <Select
        v-model="formData.provider"
        :disabled="isLoading"
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="claude">Claude (Anthropic)</SelectItem>
          <SelectItem value="openai" disabled>OpenAI (即将支持)</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- API Key -->
    <div class="space-y-2">
      <label class="text-sm font-medium">API Key</label>
      <div class="flex gap-2">
        <div class="relative flex-1">
          <Input
            v-model="formData.apiKey"
            :type="showAPIKey ? 'text' : 'password'"
            placeholder="输入 API Key"
            :disabled="isLoading"
            class="pr-8"
          />
          <button
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            @click="showAPIKey = !showAPIKey"
          >
            <Eye v-if="!showAPIKey" class="h-4 w-4" />
            <EyeOff v-else class="h-4 w-4" />
          </button>
        </div>
      </div>
      <p class="text-xs text-gray-500">
        获取 Claude API Key:
        <a
          href="https://console.anthropic.com/"
          target="_blank"
          class="text-blue-500 hover:underline"
        >
          console.anthropic.com
        </a>
      </p>
    </div>

    <!-- 模型选择 -->
    <div class="space-y-2">
      <label class="text-sm font-medium">模型</label>
      <Select
        v-model="formData.model"
        :disabled="isLoading || formData.provider !== 'claude'"
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="option in modelOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- 操作按钮 -->
    <div class="flex gap-2 pt-2">
      <Button
        variant="default"
        :disabled="isLoading"
        @click="saveConfig"
        class="flex-1"
      >
        <Check v-if="!isLoading" class="h-4 w-4 mr-1" />
        {{ isLoading ? '保存中...' : '保存配置' }}
      </Button>
      <Button
        variant="outline"
        :disabled="isLoading || !formData.apiKey"
        @click="testConnection"
      >
        测试连接
      </Button>
    </div>
  </div>
</template>

<style scoped>
.ai-settings {
  padding: 1rem;
}
</style>
