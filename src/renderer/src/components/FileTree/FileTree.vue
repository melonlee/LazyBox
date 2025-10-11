<script setup lang="ts">
import type { FileNode } from '@renderer/types'
import FileTreeNode from './FileTreeNode.vue'
import { Search, Plus, FolderPlus, X } from 'lucide-vue-next'

interface Props {
  nodes: FileNode[]
  selectedId?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  selectedId: null,
})

const emit = defineEmits<{
  select: [node: FileNode]
  createFile: [parentNode: FileNode | null]
  createFolder: [parentNode: FileNode | null]
  renameNode: [node: FileNode]
  deleteNode: [node: FileNode]
  moveNode: [sourceNode: FileNode, targetNode: FileNode]
  copyNode: [sourceNode: FileNode, targetNode: FileNode]
}>()

// 搜索功能
const searchQuery = ref('')
const isSearching = computed(() => searchQuery.value.trim() !== '')

// 展开状态管理
const expandedIds = ref<Set<string>>(new Set())

// 拖拽状态
const draggingId = ref<string | null>(null)
const dragOverId = ref<string | null>(null)

// 右键菜单
const contextMenuPosition = ref({ x: 0, y: 0 })
const contextMenuNode = ref<FileNode | null>(null)
const showContextMenu = ref(false)

// 切换折叠状态
const toggleNode = (nodeId: string) => {
  if (expandedIds.value.has(nodeId)) {
    expandedIds.value.delete(nodeId)
  } else {
    expandedIds.value.add(nodeId)
  }
}

// 选择节点
const handleSelect = (node: FileNode) => {
  emit('select', node)
}

// 右键菜单
const handleContextMenu = (event: MouseEvent, node: FileNode) => {
  contextMenuPosition.value = { x: event.clientX, y: event.clientY }
  contextMenuNode.value = node
  showContextMenu.value = true
}

const closeContextMenu = () => {
  showContextMenu.value = false
  contextMenuNode.value = null
}

// 菜单操作
const handleCreateFile = () => {
  // 如果右键点击的是文件夹，则在该文件夹下创建；否则在根目录创建
  const parentNode = contextMenuNode.value?.type === 'folder' ? contextMenuNode.value : null
  emit('createFile', parentNode)
  closeContextMenu()
}

const handleCreateFolder = () => {
  // 如果右键点击的是文件夹，则在该文件夹下创建；否则在根目录创建
  const parentNode = contextMenuNode.value?.type === 'folder' ? contextMenuNode.value : null
  emit('createFolder', parentNode)
  closeContextMenu()
}

const handleRename = () => {
  if (contextMenuNode.value) {
    emit('renameNode', contextMenuNode.value)
  }
  closeContextMenu()
}

const handleDelete = () => {
  if (contextMenuNode.value) {
    emit('deleteNode', contextMenuNode.value)
  }
  closeContextMenu()
}

// 拖拽处理
const handleDragStart = (event: DragEvent, node: FileNode) => {
  draggingId.value = node.id
}

const handleDragOver = (event: DragEvent, node: FileNode) => {
  dragOverId.value = node.id
}

const handleDrop = async (event: DragEvent, targetNode: FileNode) => {
  const sourceId = event.dataTransfer!.getData('nodeId')
  const sourcePath = event.dataTransfer!.getData('nodePath')
  
  if (!sourceId || sourceId === targetNode.id) {
    draggingId.value = null
    dragOverId.value = null
    return
  }

  // 找到源节点
  const sourceNode = findNodeById(props.nodes, sourceId)
  if (!sourceNode) return

  // 判断是移动还是复制
  if (event.ctrlKey || event.metaKey) {
    emit('copyNode', sourceNode, targetNode)
  } else {
    emit('moveNode', sourceNode, targetNode)
  }

  draggingId.value = null
  dragOverId.value = null
}

// 递归查找节点
const findNodeById = (nodes: FileNode[], id: string): FileNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }
  return null
}

// 搜索过滤
const filteredNodes = computed(() => {
  if (!isSearching.value) return props.nodes
  return filterNodes(props.nodes, searchQuery.value.toLowerCase())
})

const filterNodes = (nodes: FileNode[], query: string): FileNode[] => {
  const result: FileNode[] = []
  
  for (const node of nodes) {
    const nameMatch = node.name.toLowerCase().includes(query)
    let filteredChildren: FileNode[] = []
    
    if (node.children) {
      filteredChildren = filterNodes(node.children, query)
    }
    
    if (nameMatch || filteredChildren.length > 0) {
      result.push({
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : node.children,
      })
      
      // 自动展开匹配的节点
      if (node.type === 'folder' && (nameMatch || filteredChildren.length > 0)) {
        expandedIds.value.add(node.id)
      }
    }
  }
  
  return result
}

const clearSearch = () => {
  searchQuery.value = ''
}

// 点击空白处关闭右键菜单
onMounted(() => {
  document.addEventListener('click', closeContextMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu)
})

// 暴露给父组件的方法
defineExpose({
  expandNode: (nodeId: string) => expandedIds.value.add(nodeId),
  collapseNode: (nodeId: string) => expandedIds.value.delete(nodeId),
  expandAll: () => {
    const expandAll = (nodes: FileNode[]) => {
      nodes.forEach(node => {
        if (node.type === 'folder') {
          expandedIds.value.add(node.id)
          if (node.children) expandAll(node.children)
        }
      })
    }
    expandAll(props.nodes)
  },
  collapseAll: () => expandedIds.value.clear(),
})
</script>

<template>
  <div class="file-tree">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <div class="search-input-wrapper">
        <Search class="search-icon size-4" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索文件..."
          class="search-input"
        >
        <button
          v-if="isSearching"
          class="clear-btn"
          @click="clearSearch"
        >
          <X class="size-4" />
        </button>
      </div>
      <div class="action-buttons">
        <slot name="toolbar" />
        <Button size="xs" variant="ghost" title="新建文件" @click="handleCreateFile">
          <Plus class="size-4" />
        </Button>
        <Button size="xs" variant="ghost" title="新建文件夹" @click="handleCreateFolder()">
          <FolderPlus class="size-4" />
        </Button>
      </div>
    </div>

    <!-- 文件树 -->
    <div class="tree-container">
      <FileTreeNode
        v-for="node in filteredNodes"
        :key="node.id"
        :node="node"
        :is-expanded="expandedIds.has(node.id)"
        :is-selected="selectedId === node.id"
        :is-dragging="draggingId === node.id"
        :expanded-ids="expandedIds"
        :selected-id="selectedId"
        :dragging-id="draggingId"
        @toggle="toggleNode"
        @select="handleSelect"
        @context-menu="handleContextMenu"
        @drag-start="handleDragStart"
        @drag-over="handleDragOver"
        @drop="handleDrop"
      />
      
      <div v-if="filteredNodes.length === 0" class="empty-state">
        <p v-if="isSearching">没有找到匹配的文件</p>
        <p v-else>暂无文件</p>
      </div>
    </div>

    <!-- 右键菜单 -->
    <Teleport to="body">
      <div
        v-if="showContextMenu"
        class="context-menu"
        :style="{
          left: `${contextMenuPosition.x}px`,
          top: `${contextMenuPosition.y}px`,
        }"
        @click.stop
      >
        <div class="context-menu-item" @click="handleCreateFile">
          <Plus class="size-4" />
          <span>新建文件</span>
        </div>
        <div class="context-menu-item" @click="handleCreateFolder">
          <FolderPlus class="size-4" />
          <span>新建文件夹</span>
        </div>
        <div class="context-menu-divider" />
        <div class="context-menu-item" @click="handleRename">
          <span>重命名</span>
        </div>
        <div class="context-menu-item danger" @click="handleDelete">
          <span>删除</span>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.file-tree {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #fff;
  border-radius: 6px;
}

.dark .file-tree {
  background-color: #1a1a1a;
}

.search-bar {
  padding: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.dark .search-bar {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.search-icon {
  position: absolute;
  left: 8px;
  color: rgba(0, 0, 0, 0.4);
  pointer-events: none;
}

.dark .search-icon {
  color: rgba(255, 255, 255, 0.4);
}

.search-input {
  width: 100%;
  padding: 6px 32px 6px 32px;
  font-size: 13px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  outline: none;
  transition: border-color 0.15s ease;
  background-color: transparent;
}

.search-input:focus {
  border-color: rgba(59, 130, 246, 0.5);
}

.dark .search-input {
  border-color: rgba(255, 255, 255, 0.15);
  color: white;
}

.clear-btn {
  position: absolute;
  right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.4);
  border-radius: 2px;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.clear-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: rgba(0, 0, 0, 0.7);
}

.dark .clear-btn {
  color: rgba(255, 255, 255, 0.4);
}

.dark .clear-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
}

.action-buttons {
  display: flex;
  gap: 4px;
}

.tree-container {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: rgba(0, 0, 0, 0.4);
  font-size: 13px;
}

.dark .empty-state {
  color: rgba(255, 255, 255, 0.4);
}

/* 右键菜单 */
.context-menu {
  position: fixed;
  z-index: 9999;
  min-width: 180px;
  padding: 4px;
  background-color: white;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.dark .context-menu {
  background-color: #2a2a2a;
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s ease;
}

.context-menu-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.dark .context-menu-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.context-menu-item.danger {
  color: #ef4444;
}

.context-menu-divider {
  height: 1px;
  margin: 4px 0;
  background-color: rgba(0, 0, 0, 0.1);
}

.dark .context-menu-divider {
  background-color: rgba(255, 255, 255, 0.1);
}
</style>

