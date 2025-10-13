<script setup lang="ts">
import type { FileNode } from '@renderer/types'
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Image, File, FileType } from 'lucide-vue-next'

interface Props {
  node: FileNode
  level?: number
  isExpanded?: boolean
  isSelected?: boolean
  isDragging?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  level: 0,
  isExpanded: false,
  isSelected: false,
  isDragging: false,
})

const emit = defineEmits<{
  toggle: [nodeId: string]
  select: [node: FileNode]
  contextMenu: [event: MouseEvent, node: FileNode]
  dragStart: [event: DragEvent, node: FileNode]
  dragOver: [event: DragEvent, node: FileNode]
  drop: [event: DragEvent, node: FileNode]
}>()

const isFolder = computed(() => props.node.type === 'folder')
const childrenCount = computed(() => props.node.children?.length || 0)

// 获取文件扩展名
const fileExtension = computed(() => {
  if (isFolder.value) return ''
  const parts = props.node.name.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
})

// 判断文件类型
const isImageFile = computed(() => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico']
  return imageExtensions.includes(fileExtension.value)
})

const isMarkdownFile = computed(() => {
  return fileExtension.value === 'md' || fileExtension.value === 'markdown'
})

const isPdfFile = computed(() => {
  return fileExtension.value === 'pdf'
})

const handleToggle = () => {
  if (isFolder.value) {
    emit('toggle', props.node.id)
  }
}

const handleSelect = () => {
  emit('select', props.node)
}

const handleContextMenu = (event: MouseEvent) => {
  event.preventDefault()
  emit('contextMenu', event, props.node)
}

const handleDragStart = (event: DragEvent) => {
  event.dataTransfer!.effectAllowed = 'move'
  event.dataTransfer!.setData('nodeId', props.node.id)
  event.dataTransfer!.setData('nodePath', props.node.path)
  event.dataTransfer!.setData('nodeType', props.node.type)
  emit('dragStart', event, props.node)
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (isFolder.value) {
    event.dataTransfer!.dropEffect = 'move'
    emit('dragOver', event, props.node)
  }
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  event.stopPropagation()
  if (isFolder.value) {
    emit('drop', event, props.node)
  }
}

const paddingLeft = computed(() => `${props.level * 12 + 8}px`)
</script>

<template>
  <div>
    <div
      class="file-tree-node"
      :class="{
        'is-selected': isSelected,
        'is-folder': isFolder,
        'is-dragging': isDragging,
      }"
      :style="{ paddingLeft }"
      :draggable="true"
      @click="handleSelect"
      @contextmenu="handleContextMenu"
      @dragstart="handleDragStart"
      @dragover="handleDragOver"
      @drop="handleDrop"
    >
      <div class="node-content">
        <button
          v-if="isFolder"
          class="toggle-btn"
          @click.stop="handleToggle"
        >
          <ChevronRight v-if="!isExpanded" class="size-4" />
          <ChevronDown v-else class="size-4" />
        </button>
        <div v-else class="toggle-placeholder" />

        <div class="node-icon">
          <FolderOpen v-if="isFolder && isExpanded" class="size-4 text-yellow-500" />
          <Folder v-else-if="isFolder" class="size-4 text-yellow-600" />
          <Image v-else-if="isImageFile" class="size-4 text-green-500" />
          <FileText v-else-if="isMarkdownFile" class="size-4 text-blue-500" />
          <FileType v-else-if="isPdfFile" class="size-4 text-red-500" />
          <File v-else class="size-4 text-gray-400" />
        </div>

        <span class="node-name line-clamp-1">{{ node.name }}</span>

        <span v-if="isFolder && childrenCount > 0" class="node-count">
          {{ childrenCount }}
        </span>
      </div>
    </div>

    <template v-if="isFolder && isExpanded && node.children">
      <FileTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :level="level + 1"
        :is-expanded="$attrs.expandedIds?.has(child.id)"
        :is-selected="$attrs.selectedId === child.id"
        :is-dragging="$attrs.draggingId === child.id"
        @toggle="emit('toggle', $event)"
        @select="emit('select', $event)"
        @context-menu="emit('contextMenu', $event, arguments[1])"
        @drag-start="emit('dragStart', $event, arguments[1])"
        @drag-over="emit('dragOver', $event, arguments[1])"
        @drop="emit('drop', $event, arguments[1])"
      />
    </template>
  </div>
</template>

<style scoped>
.file-tree-node {
  position: relative;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.15s ease;
  border-radius: 4px;
  margin: 1px 4px;
  color: #e2e8f0;
}

.file-tree-node:hover {
  background-color: rgba(139, 92, 246, 0.15);
}

.file-tree-node.is-selected {
  background-color: rgba(139, 92, 246, 0.25);
}

.file-tree-node.is-dragging {
  opacity: 0.5;
}

.node-content {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding-right: 8px;
}

.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: currentColor;
  opacity: 0.7;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.toggle-btn:hover {
  opacity: 1;
}

.toggle-placeholder {
  width: 16px;
  flex-shrink: 0;
}

.node-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.node-name {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #e2e8f0;
}

.node-count {
  font-size: 11px;
  color: #94a3b8;
  background-color: rgba(148, 163, 184, 0.15);
  padding: 0 6px;
  border-radius: 10px;
  line-height: 18px;
}
</style>

