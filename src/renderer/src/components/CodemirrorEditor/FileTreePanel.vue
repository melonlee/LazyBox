<script setup lang="ts">
import { useStore } from '@renderer/stores'
import { useFileTreeStore } from '@renderer/stores/fileTree'
import type { FileNode } from '@renderer/types'
import FileTree from '@renderer/components/FileTree/FileTree.vue'
import emitter from '@renderer/utils/event'
import { FolderOpen, Folder, MoreVertical, X } from 'lucide-vue-next'

const store = useStore()
const fileTreeStore = useFileTreeStore()

// 面板可见性
const isOpen = computed({
  get: () => store.isOpenPostSlider,
  set: (val) => store.isOpenPostSlider = val
})

// 对话框状态
const createFileDialog = ref(false)
const createFolderDialog = ref(false)
const renameDialog = ref(false)
const deleteDialog = ref(false)

// 输入框内容
const newFileName = ref('')
const newFolderName = ref('')
const renameValue = ref('')

// 当前操作的节点
const currentNode = ref<FileNode | null>(null)
const parentFolderForCreate = ref<FileNode | null>(null)

// 打开工作区
const handleOpenWorkspace = async () => {
  await fileTreeStore.selectWorkspaceFolder()
}

// 打开最近的工作区
const handleOpenRecentWorkspace = async (workspacePath: string) => {
  await fileTreeStore.openWorkspace(workspacePath)
}

// 关闭工作区
const handleCloseWorkspace = () => {
  fileTreeStore.closeWorkspace()
}

// 加载文件树
onMounted(async () => {
  // 如果有当前工作区，则加载
  if (fileTreeStore.currentWorkspace) {
    await fileTreeStore.loadFileTree()
  }
  
  // 监听新建文件事件
  emitter.on('new-file', () => {
    handleCreateFile()
  })
})

onUnmounted(() => {
  emitter.off('new-file')
})

// 选择文件
const handleSelectNode = async (node: FileNode) => {
  if (node.type === 'file') {
    fileTreeStore.selectNode(node)
    
    // 读取文件内容并显示在编辑器中
    const content = await fileTreeStore.readFileContent(node.path)
    if (store.editor) {
      toRaw(store.editor).setValue(content)
    }
  }
}

// 创建文件
const handleCreateFile = (parentNode: FileNode | null = null) => {
  createFileDialog.value = true
  newFileName.value = ''
  
  // 优先使用传入的父节点，其次使用当前选中的节点（如果是文件夹）
  if (parentNode) {
    parentFolderForCreate.value = parentNode
  } else if (fileTreeStore.selectedNode?.type === 'folder') {
    parentFolderForCreate.value = fileTreeStore.selectedNode
  } else {
    parentFolderForCreate.value = null
  }
}

const confirmCreateFile = async () => {
  if (!newFileName.value.trim()) {
    toast.error('文件名不能为空')
    return
  }

  // 确定父目录路径
  const parentPath = parentFolderForCreate.value?.path || getDefaultAppDir()
  
  const result = await fileTreeStore.createFile(parentPath, newFileName.value)
  if (result) {
    createFileDialog.value = false
    
    // 选中新创建的文件
    const newNode = fileTreeStore.findNodeByPath(fileTreeStore.fileTree, result)
    if (newNode) {
      await handleSelectNode(newNode)
    }
  }
}

// 创建文件夹
const handleCreateFolder = (parentNode: FileNode | null) => {
  createFolderDialog.value = true
  newFolderName.value = ''
  parentFolderForCreate.value = parentNode
}

const confirmCreateFolder = async () => {
  if (!newFolderName.value.trim()) {
    toast.error('文件夹名不能为空')
    return
  }

  const parentPath = parentFolderForCreate.value?.path || getDefaultAppDir()
  
  const result = await fileTreeStore.createFolder(parentPath, newFolderName.value)
  if (result) {
    createFolderDialog.value = false
  }
}

// 重命名
const handleRename = (node: FileNode) => {
  currentNode.value = node
  renameValue.value = node.type === 'file' 
    ? node.name.replace('.md', '') 
    : node.name
  renameDialog.value = true
}

const confirmRename = async () => {
  if (!renameValue.value.trim()) {
    toast.error('名称不能为空')
    return
  }

  if (currentNode.value) {
    const result = await fileTreeStore.renameNode(currentNode.value, renameValue.value)
    if (result) {
      renameDialog.value = false
    }
  }
}

// 删除
const handleDelete = (node: FileNode) => {
  currentNode.value = node
  deleteDialog.value = true
}

const confirmDelete = async () => {
  if (currentNode.value) {
    const result = await fileTreeStore.deleteNode(currentNode.value)
    if (result) {
      deleteDialog.value = false
    }
  }
}

// 移动节点
const handleMoveNode = async (sourceNode: FileNode, targetNode: FileNode) => {
  await fileTreeStore.moveNode(sourceNode, targetNode)
}

// 复制节点
const handleCopyNode = async (sourceNode: FileNode, targetNode: FileNode) => {
  await fileTreeStore.copyNode(sourceNode, targetNode)
}

// 获取默认应用目录
const getDefaultAppDir = () => {
  return fileTreeStore.getWorkspacePath()
}

// 保存当前文件（集成到编辑器的保存逻辑）
watch(() => store.editor?.getValue(), () => {
  // 自动保存当前文件
  if (fileTreeStore.selectedNode?.type === 'file' && store.editor) {
    const content = store.editor.getValue()
    // 使用防抖避免频繁保存
    debouncedSave(fileTreeStore.selectedNode.path, content)
  }
})

const debouncedSave = useDebounceFn(async (filePath: string, content: string) => {
  await fileTreeStore.updateFileContent(filePath, content)
}, 1000)
</script>

<template>
  <div
    class="file-tree-panel"
    :class="{
      'is-open': isOpen,
    }"
  >
    <div
      class="panel-content"
      :class="{
        'translate-x-0': isOpen,
        '-translate-x-full': !isOpen,
      }"
    >
      <!-- 欢迎界面 -->
      <div v-if="!fileTreeStore.currentWorkspace" class="welcome-screen">
        <div class="welcome-content">
          <h3 class="welcome-title">欢迎使用 LazyBox</h3>
          <p class="welcome-desc">打开一个文件夹开始编辑</p>
          
          <Button class="open-folder-btn" @click="handleOpenWorkspace">
            <FolderOpen class="mr-2 size-4" />
            打开文件夹
          </Button>

          <!-- 最近打开的工作区 -->
          <div v-if="fileTreeStore.recentWorkspaces.length > 0" class="recent-workspaces">
            <h4 class="recent-title">最近打开</h4>
            <div class="recent-list">
              <button
                v-for="workspace in fileTreeStore.recentWorkspaces"
                :key="workspace"
                class="recent-item"
                @click="handleOpenRecentWorkspace(workspace)"
              >
                <Folder class="size-4" />
                <span class="recent-path">{{ workspace }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 文件树 -->
      <FileTree
        v-else
        :nodes="fileTreeStore.fileTree"
        :selected-id="fileTreeStore.selectedNode?.id"
        @select="handleSelectNode"
        @create-file="handleCreateFile"
        @create-folder="handleCreateFolder"
        @rename-node="handleRename"
        @delete-node="handleDelete"
        @move-node="handleMoveNode"
        @copy-node="handleCopyNode"
      >
        <template #toolbar>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button size="xs" variant="ghost" title="工作区">
                <MoreVertical class="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem @click="handleOpenWorkspace">
                <FolderOpen class="mr-2 size-4" />
                打开文件夹
              </DropdownMenuItem>
              <DropdownMenuItem @click="handleCloseWorkspace">
                <X class="mr-2 size-4" />
                关闭工作区
              </DropdownMenuItem>
              <DropdownMenuSeparator v-if="fileTreeStore.recentWorkspaces.length > 1" />
              <DropdownMenuLabel v-if="fileTreeStore.recentWorkspaces.length > 1">
                最近打开
              </DropdownMenuLabel>
              <DropdownMenuItem
                v-for="workspace in fileTreeStore.recentWorkspaces.slice(0, 5)"
                :key="workspace"
                @click="handleOpenRecentWorkspace(workspace)"
              >
                <Folder class="mr-2 size-4" />
                <span class="truncate text-xs">{{ workspace.split('/').pop() }}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </template>
      </FileTree>
    </div>

    <!-- 创建文件对话框 -->
    <Dialog v-model:open="createFileDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建文件</DialogTitle>
          <DialogDescription>
            请输入文件名（自动添加 .md 后缀）
          </DialogDescription>
        </DialogHeader>
        <Input v-model="newFileName" placeholder="文件名" @keyup.enter="confirmCreateFile" />
        <DialogFooter>
          <Button variant="outline" @click="createFileDialog = false">
            取消
          </Button>
          <Button @click="confirmCreateFile">
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 创建文件夹对话框 -->
    <Dialog v-model:open="createFolderDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建文件夹</DialogTitle>
          <DialogDescription>
            请输入文件夹名称
          </DialogDescription>
        </DialogHeader>
        <Input v-model="newFolderName" placeholder="文件夹名称" @keyup.enter="confirmCreateFolder" />
        <DialogFooter>
          <Button variant="outline" @click="createFolderDialog = false">
            取消
          </Button>
          <Button @click="confirmCreateFolder">
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 重命名对话框 -->
    <Dialog v-model:open="renameDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重命名</DialogTitle>
          <DialogDescription>
            请输入新的名称
          </DialogDescription>
        </DialogHeader>
        <Input v-model="renameValue" @keyup.enter="confirmRename" />
        <DialogFooter>
          <Button variant="outline" @click="renameDialog = false">
            取消
          </Button>
          <Button @click="confirmRename">
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 删除确认对话框 -->
    <AlertDialog v-model:open="deleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除</AlertDialogTitle>
          <AlertDialogDescription>
            确定要删除 "{{ currentNode?.name }}" 吗？此操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction @click="confirmDelete">
            确认删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<style scoped>
.file-tree-panel {
  overflow: hidden;
  background-color: rgb(249 250 251 / 0.2);
  transition: width 0.3s ease;
}

.file-tree-panel.is-open {
  width: 250px;
}

.file-tree-panel:not(.is-open) {
  width: 0;
}

.dark .file-tree-panel {
  background-color: #191c20;
}

.panel-content {
  height: 100%;
  width: 250px;
  overflow: hidden;
  border-right: 2px solid rgb(249 250 251 / 0.2);
  padding: 8px;
  transition: transform 0.3s ease;
}

.dark .panel-content {
  border-right-color: rgba(255, 255, 255, 0.05);
}

/* 欢迎界面 */
.welcome-screen {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.welcome-content {
  text-align: center;
  max-width: 100%;
}

.welcome-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: rgba(0, 0, 0, 0.85);
}

.dark .welcome-title {
  color: rgba(255, 255, 255, 0.85);
}

.welcome-desc {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 24px;
}

.dark .welcome-desc {
  color: rgba(255, 255, 255, 0.45);
}

.open-folder-btn {
  width: 100%;
  margin-bottom: 24px;
}

/* 最近打开 */
.recent-workspaces {
  margin-top: 24px;
  text-align: left;
}

.recent-title {
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.65);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dark .recent-title {
  color: rgba(255, 255, 255, 0.65);
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  font-size: 12px;
  text-align: left;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  color: rgba(0, 0, 0, 0.65);
}

.recent-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.dark .recent-item {
  color: rgba(255, 255, 255, 0.65);
}

.dark .recent-item:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

.recent-path {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

