import type { Workspace, WorkspaceState } from '@renderer/types'
import { v4 as uuidv4 } from 'uuid'

const WORKSPACE_STORAGE_KEY = '__workspace_state'
const MAX_RECENT_WORKSPACES = 10

export const useWorkspaceStore = defineStore('workspace', () => {
  // 从 localStorage 加载初始状态
  const loadInitialState = (): WorkspaceState => {
    const stored = localStorage.getItem(WORKSPACE_STORAGE_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (e) {
        console.error('Failed to parse workspace state:', e)
      }
    }
    return {
      workspaces: [],
      currentWorkspaceId: null,
      recentWorkspaceIds: []
    }
  }

  const state = reactive<WorkspaceState>(loadInitialState())

  // 保存状态到 localStorage
  const saveState = () => {
    const stateToSave: WorkspaceState = {
      workspaces: state.workspaces,
      currentWorkspaceId: state.currentWorkspaceId,
      recentWorkspaceIds: state.recentWorkspaceIds
    }
    localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(stateToSave))
    console.log('[Workspace] State saved to localStorage:', stateToSave)
  }

  // 计算属性
  const workspaces = computed(() => state.workspaces)
  const currentWorkspaceId = computed(() => state.currentWorkspaceId)
  const currentWorkspace = computed(() => 
    state.workspaces.find(w => w.id === state.currentWorkspaceId)
  )
  
  // 最近打开的工作空间（按打开时间排序）
  const recentWorkspaces = computed(() => {
    return state.recentWorkspaceIds
      .map(id => state.workspaces.find(w => w.id === id))
      .filter(Boolean) as Workspace[]
  })

  // 是否有工作空间
  const hasWorkspaces = computed(() => state.workspaces.length > 0)

  // 是否已打开工作空间
  const hasOpenWorkspace = computed(() => !!state.currentWorkspaceId)

  // 创建新工作空间
  const createWorkspace = async (name: string, path: string, options?: { icon?: string, description?: string }) => {
    console.log('[Workspace] Creating new workspace:', { name, path, options })
    
    // 检查路径是否已存在
    const existing = state.workspaces.find(w => w.path === path)
    if (existing) {
      console.log('[Workspace] Workspace already exists at path, returning existing:', existing)
      toast.info(`工作空间 "${existing.name}" 已存在，将打开该工作空间`)
      return existing
    }

    // 通过 IPC 创建工作空间目录
    console.log('[Workspace] Calling IPC to create workspace directory...')
    const success = await window.$api.createWorkspace(path)
    console.log('[Workspace] IPC create workspace result:', success)
    
    if (!success) {
      toast.error('创建工作空间失败')
      return null
    }

    const workspace: Workspace = {
      id: uuidv4(),
      name,
      path,
      lastOpened: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      icon: options?.icon,
      description: options?.description
    }

    console.log('[Workspace] Workspace object created:', workspace)
    state.workspaces.push(workspace)
    saveState()
    
    console.log('[Workspace] Workspace added to state and saved')
    toast.success(`工作空间 "${name}" 创建成功`)
    return workspace
  }

  // 打开已有工作空间
  const openExistingWorkspace = async (path: string, name?: string) => {
    console.log('[Workspace] Opening existing workspace:', path)
    
    // 检查路径是否已存在
    const existing = state.workspaces.find(w => w.path === path)
    if (existing) {
      console.log('[Workspace] Workspace already exists, setting as current:', existing.id)
      return setCurrentWorkspace(existing.id)
    }

    // 通过 IPC 验证工作空间
    console.log('[Workspace] Validating workspace path...')
    const isValid = await window.$api.validateWorkspace(path)
    console.log('[Workspace] Validation result:', isValid)
    
    if (!isValid) {
      toast.error('无效的工作空间路径')
      return null
    }

    // 从路径中提取名称
    const workspaceName = name || path.split('/').pop() || '未命名工作空间'
    console.log('[Workspace] Creating workspace with name:', workspaceName)

    const workspace: Workspace = {
      id: uuidv4(),
      name: workspaceName,
      path,
      lastOpened: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }

    state.workspaces.push(workspace)
    saveState()
    console.log('[Workspace] Workspace added to state, setting as current')
    
    return setCurrentWorkspace(workspace.id)
  }

  // 设置当前工作空间
  const setCurrentWorkspace = (workspaceId: string) => {
    console.log('[Workspace] Setting current workspace:', workspaceId)
    
    const workspace = state.workspaces.find(w => w.id === workspaceId)
    if (!workspace) {
      console.error('[Workspace] Workspace not found:', workspaceId)
      toast.error('工作空间不存在')
      return null
    }

    console.log('[Workspace] Found workspace:', workspace.name, workspace.path)
    state.currentWorkspaceId = workspaceId
    workspace.lastOpened = new Date().toISOString()

    // 更新最近打开列表
    state.recentWorkspaceIds = [
      workspaceId,
      ...state.recentWorkspaceIds.filter(id => id !== workspaceId)
    ].slice(0, MAX_RECENT_WORKSPACES)

    saveState()
    console.log('[Workspace] Current workspace set successfully, currentWorkspaceId:', state.currentWorkspaceId)
    console.log('[Workspace] hasOpenWorkspace should now be:', !!state.currentWorkspaceId)
    
    return workspace
  }

  // 关闭当前工作空间
  const closeCurrentWorkspace = () => {
    state.currentWorkspaceId = null
    saveState()
  }

  // 重命名工作空间
  const renameWorkspace = (workspaceId: string, newName: string) => {
    const workspace = state.workspaces.find(w => w.id === workspaceId)
    if (!workspace) {
      toast.error('工作空间不存在')
      return false
    }

    workspace.name = newName
    saveState()
    toast.success('重命名成功')
    return true
  }

  // 更新工作空间信息
  const updateWorkspace = (workspaceId: string, updates: Partial<Omit<Workspace, 'id' | 'path'>>) => {
    const workspace = state.workspaces.find(w => w.id === workspaceId)
    if (!workspace) {
      return false
    }

    Object.assign(workspace, updates)
    saveState()
    return true
  }

  // 删除工作空间（仅从列表移除，不删除文件）
  const removeWorkspace = (workspaceId: string) => {
    const index = state.workspaces.findIndex(w => w.id === workspaceId)
    if (index === -1) {
      toast.error('工作空间不存在')
      return false
    }

    const workspace = state.workspaces[index]
    state.workspaces.splice(index, 1)
    
    // 如果删除的是当前工作空间，则关闭
    if (state.currentWorkspaceId === workspaceId) {
      state.currentWorkspaceId = null
    }

    // 从最近列表移除
    state.recentWorkspaceIds = state.recentWorkspaceIds.filter(id => id !== workspaceId)

    saveState()
    toast.success(`工作空间 "${workspace.name}" 已移除`)
    return true
  }

  // 获取工作空间信息
  const getWorkspace = (workspaceId: string) => {
    return state.workspaces.find(w => w.id === workspaceId)
  }

  // 数据迁移：从旧版本迁移默认工作空间
  const migrateFromLegacy = async () => {
    // 检查是否已经有工作空间
    if (state.workspaces.length > 0) {
      return
    }

    // 检查是否存在旧版数据
    const legacyPosts = localStorage.getItem('__editor_content')
    if (!legacyPosts) {
      return
    }

    // 获取默认工作空间路径
    const defaultPath = await window.$api.getDefaultWorkspacePath()
    if (!defaultPath) {
      return
    }

    // 创建默认工作空间
    const workspace: Workspace = {
      id: uuidv4(),
      name: '我的笔记',
      path: defaultPath,
      lastOpened: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      icon: '📝',
      description: '默认工作空间'
    }

    state.workspaces.push(workspace)
    state.currentWorkspaceId = workspace.id
    state.recentWorkspaceIds = [workspace.id]
    
    saveState()
    console.log('Successfully migrated legacy workspace')
  }

  return {
    // State
    workspaces,
    currentWorkspaceId,
    currentWorkspace,
    recentWorkspaces,
    hasWorkspaces,
    hasOpenWorkspace,

    // Actions
    createWorkspace,
    openExistingWorkspace,
    setCurrentWorkspace,
    closeCurrentWorkspace,
    renameWorkspace,
    updateWorkspace,
    removeWorkspace,
    getWorkspace,
    migrateFromLegacy
  }
})

