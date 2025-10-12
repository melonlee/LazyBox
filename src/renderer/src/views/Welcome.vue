<script setup lang="ts">
import { useWorkspaceStore } from '@renderer/stores'
import { FolderOpen, MoreVertical, Trash2, Edit2, ExternalLink } from 'lucide-vue-next'
import type { Workspace } from '@renderer/types'

const workspaceStore = useWorkspaceStore()

const showCreateDialog = ref(false)
const newWorkspaceName = ref('')
const newWorkspacePath = ref('')

const showRenameDialog = ref(false)
const renamingWorkspaceId = ref<string | null>(null)
const renameWorkspaceName = ref('')

// 创建新工作空间
const handleCreateWorkspace = async () => {
  try {
    if (!newWorkspaceName.value.trim()) {
      toast.error('请输入工作空间名称')
      return
    }
    
    console.log('[Welcome] Creating workspace with name:', newWorkspaceName.value)
    const folderPath = await window.$api.selectWorkspaceFolder()
    console.log('[Welcome] Selected folder path:', folderPath)
    
    if (!folderPath) {
      console.log('[Welcome] No folder selected for create')
      return
    }

    newWorkspacePath.value = folderPath
    console.log('[Welcome] Calling createWorkspace...')
    const workspace = await workspaceStore.createWorkspace(newWorkspaceName.value, folderPath)
    console.log('[Welcome] Workspace created:', workspace)
    
    if (workspace) {
      showCreateDialog.value = false
      newWorkspaceName.value = ''
      newWorkspacePath.value = ''
      
      console.log('[Welcome] Setting current workspace to:', workspace.id)
      // 自动打开新创建的工作空间
      await workspaceStore.setCurrentWorkspace(workspace.id)
      console.log('[Welcome] Workspace set as current successfully')
    } else {
      console.error('[Welcome] Workspace creation returned null')
      toast.error('创建工作空间失败')
    }
  } catch (error) {
    console.error('[Welcome] Error creating workspace:', error)
    toast.error('创建工作空间时出错：' + (error as Error).message)
  }
}

// 打开已有工作空间
const handleOpenExisting = async () => {
  try {
    const folderPath = await window.$api.selectWorkspaceFolder()
    console.log('Selected folder path:', folderPath)
    
    if (!folderPath) {
      console.log('No folder selected')
      return
    }

    console.log('Opening workspace:', folderPath)
    const workspace = await workspaceStore.openExistingWorkspace(folderPath)
    console.log('Workspace opened:', workspace)
    
    if (!workspace) {
      toast.error('打开工作空间失败')
    }
  } catch (error) {
    console.error('Error opening workspace:', error)
    toast.error('打开工作空间时出错：' + (error as Error).message)
  }
}

// 打开工作空间
const openWorkspace = async (workspaceId: string) => {
  await workspaceStore.setCurrentWorkspace(workspaceId)
}

// 重命名工作空间
const handleRename = (workspace: Workspace) => {
  renamingWorkspaceId.value = workspace.id
  renameWorkspaceName.value = workspace.name
  showRenameDialog.value = true
}

const confirmRename = () => {
  if (!renamingWorkspaceId.value || !renameWorkspaceName.value.trim()) {
    return
  }
  
  workspaceStore.renameWorkspace(renamingWorkspaceId.value, renameWorkspaceName.value)
  showRenameDialog.value = false
  renamingWorkspaceId.value = null
  renameWorkspaceName.value = ''
}

// 删除工作空间
const handleRemove = (workspaceId: string) => {
  const workspace = workspaceStore.getWorkspace(workspaceId)
  if (!workspace) return

  const confirmed = confirm(`确定要移除工作空间 "${workspace.name}" 吗？\n\n这不会删除您的文件，只是从列表中移除。`)
  if (confirmed) {
    workspaceStore.removeWorkspace(workspaceId)
  }
}

// 在文件管理器中打开
const openInFinder = async (workspace: Workspace) => {
  await window.$api.openWorkspaceFolder(workspace.path)
}
</script>

<template>
  <div class="welcome-container">
    <!-- 左侧：最近打开 -->
    <div class="left-section">
      <div v-if="workspaceStore.recentWorkspaces.length > 0" class="recent-section">
        <h2 class="section-title">Recently Opened</h2>
        
        <div class="recent-list">
          <div
            v-for="workspace in workspaceStore.recentWorkspaces"
            :key="workspace.id"
            class="recent-item"
            @click="openWorkspace(workspace.id)"
          >
            <div class="recent-item-content">
              <div class="folder-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H11L9 5H5C3.89543 5 3 5.89543 3 7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              
              <div class="recent-info">
                <h3 class="recent-name">{{ workspace.name }}</h3>
                <p class="recent-path">{{ workspace.path }}</p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger as-child @click.stop>
                  <button class="more-btn">
                    <MoreVertical class="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem @click.stop="openWorkspace(workspace.id)">
                    <FolderOpen class="w-4 h-4 mr-2" />
                    打开工作空间
                  </DropdownMenuItem>
                  <DropdownMenuItem @click.stop="handleRename(workspace)">
                    <Edit2 class="w-4 h-4 mr-2" />
                    重命名
                  </DropdownMenuItem>
                  <DropdownMenuItem @click.stop="openInFinder(workspace)">
                    <ExternalLink class="w-4 h-4 mr-2" />
                    在文件管理器中打开
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    class="text-red-600"
                    @click.stop="handleRemove(workspace.id)"
                  >
                    <Trash2 class="w-4 h-4 mr-2" />
                    移除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧：Logo 和操作 -->
    <div class="right-section">
      <div class="brand-section">
        <h1 class="app-title">
          <span class="first-letter">L</span><span class="rest-letters">azyBox</span>
        </h1>
        <p class="app-subtitle">Your local-first notes workspace.</p>
      </div>

      <div class="action-cards">
        <div class="action-card" @click="showCreateDialog = true">
          <div class="action-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H11L9 5H5C3.89543 5 3 5.89543 3 7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="action-text">
            <h3 class="action-title">Create New Workspace</h3>
            <p class="action-desc">Start fresh with a new folder for your notes and ideas</p>
          </div>
        </div>

        <div class="action-card" @click="handleOpenExisting">
          <div class="action-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H11L9 5H5C3.89543 5 3 5.89543 3 7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="action-text">
            <h3 class="action-title">Open Existing Workspace</h3>
            <p class="action-desc">Continue working with an existing folder of notes</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建工作空间对话框 -->
    <Dialog v-model:open="showCreateDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建新工作空间</DialogTitle>
          <DialogDescription>
            为您的笔记创建一个新的工作空间
          </DialogDescription>
        </DialogHeader>
        
        <div class="dialog-form">
          <div class="form-field">
            <Label for="workspace-name">工作空间名称</Label>
            <Input
              id="workspace-name"
              v-model="newWorkspaceName"
              placeholder="例如：我的笔记"
              @keyup.enter="handleCreateWorkspace"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showCreateDialog = false">
            取消
          </Button>
          <Button @click="handleCreateWorkspace">
            创建并打开
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 重命名工作空间对话框 -->
    <Dialog v-model:open="showRenameDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重命名工作空间</DialogTitle>
        </DialogHeader>
        
        <div class="dialog-form">
          <div class="form-field">
            <Label for="rename-workspace">新名称</Label>
            <Input
              id="rename-workspace"
              v-model="renameWorkspaceName"
              @keyup.enter="confirmRename"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showRenameDialog = false">
            取消
          </Button>
          <Button @click="confirmRename">
            确认
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style lang="less" scoped>
.welcome-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a2332;
  overflow: hidden;
  padding: 2rem;
}

.welcome-container::before {
  content: '';
  position: absolute;
  inset: 0;
  display: flex;
  max-width: 1400px;
  margin: 0 auto;
}

.welcome-container > * {
  position: relative;
  z-index: 1;
}

// 左侧区域
.left-section {
  flex: 1;
  max-width: 500px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  min-height: 0; // 关键：允许 flex 子元素收缩
  max-height: 80vh;
}

.recent-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; // 关键：允许 flex 子元素收缩
  overflow: hidden; // 防止内容溢出
}

.section-title {
  font-size: 1.125rem;
  font-weight: 500;
  color: #e2e8f0;
  margin: 0 0 1rem 0;
  letter-spacing: -0.01em;
}

.recent-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.5rem;
  min-height: 0; // 关键：允许滚动
  
  // 美化滚动条
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(26, 35, 50, 0.3);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.2);
    border-radius: 3px;
    transition: all 0.3s ease;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(139, 92, 246, 0.4);
  }
}

.recent-item {
  flex-shrink: 0; // 防止卡片被压缩
  background: rgba(51, 65, 85, 0.4);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(51, 65, 85, 0.6);
    border-color: rgba(148, 163, 184, 0.2);
    transform: translateY(-2px);
  }
}

.recent-item-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.folder-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 92, 246, 0.15);
  border-radius: 8px;
  color: #a78bfa;
}

.recent-info {
  flex: 1;
  min-width: 0;
}

.recent-name {
  font-size: 0.9375rem;
  font-weight: 500;
  color: #f1f5f9;
  margin: 0 0 0.25rem;
  letter-spacing: -0.01em;
}

.recent-path {
  font-size: 0.8125rem;
  color: #94a3b8;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-btn {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0;

  &:hover {
    background: rgba(148, 163, 184, 0.1);
    color: #e2e8f0;
  }
}

.recent-item:hover .more-btn {
  opacity: 1;
}

// 右侧区域
.right-section {
  flex: 1;
  max-width: 500px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.brand-section {
  text-align: center;
  margin-bottom: 2rem;
}

.app-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  letter-spacing: -0.02em;
  display: inline-block;
  position: relative;
  
  // 整體發光效果
  filter: drop-shadow(0 0 20px rgba(139, 92, 246, 0.3));
  animation: breathe 3s ease-in-out infinite;
}

// 首字母特殊樣式
.first-letter {
  font-size: 1.2em;
  background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 50%, #7c3aed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 
    0 0 30px rgba(139, 92, 246, 0.6),
    0 0 60px rgba(139, 92, 246, 0.4);
  -webkit-text-stroke: 1px rgba(167, 139, 250, 0.3);
  animation: glow-pulse 2s ease-in-out infinite alternate;
}

// 其餘字母樣式
.rest-letters {
  background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 50%, #c7d2fe 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 
    0 2px 10px rgba(248, 250, 252, 0.3),
    0 4px 20px rgba(167, 139, 250, 0.2);
  -webkit-text-stroke: 0.5px rgba(248, 250, 252, 0.1);
}

// 發光脈衝動畫
@keyframes glow-pulse {
  0% {
    text-shadow: 
      0 0 20px rgba(139, 92, 246, 0.6),
      0 0 40px rgba(139, 92, 246, 0.4),
      0 0 60px rgba(139, 92, 246, 0.2);
  }
  100% {
    text-shadow: 
      0 0 30px rgba(139, 92, 246, 0.8),
      0 0 60px rgba(139, 92, 246, 0.6),
      0 0 90px rgba(139, 92, 246, 0.4);
  }
}

// 呼吸動畫
@keyframes breathe {
  0%, 100% {
    filter: drop-shadow(0 0 20px rgba(139, 92, 246, 0.3));
  }
  50% {
    filter: drop-shadow(0 0 30px rgba(139, 92, 246, 0.5));
  }
}

.app-subtitle {
  font-size: 1rem;
  color: #94a3b8;
  margin: 0;
  letter-spacing: -0.01em;
}

.action-cards {
  width: 100%;
  max-width: 450px;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.action-card {
  background: rgba(51, 65, 85, 0.4);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: flex-start;
  gap: 1rem;

  &:hover {
    background: rgba(51, 65, 85, 0.6);
    border-color: rgba(148, 163, 184, 0.2);
    transform: translateY(-2px);
  }
}

.action-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 92, 246, 0.15);
  border-radius: 10px;
  color: #a78bfa;
}

.action-text {
  flex: 1;
  padding-top: 0.25rem;
}

.action-title {
  font-size: 1.0625rem;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0 0 0.375rem;
  letter-spacing: -0.01em;
}

.action-desc {
  font-size: 0.875rem;
  color: #94a3b8;
  margin: 0;
  line-height: 1.5;
}

// 对话框
.dialog-form {
  padding: 1rem 0;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

// 响应式
@media (max-width: 1024px) {
  .welcome-container {
    flex-direction: column;
  }

  .left-section,
  .right-section {
    flex: none;
    padding: 2rem;
  }

  .left-section {
    max-height: 40vh;
  }
}
</style>

