import type { FileNode } from '@renderer/types'
import { defineStore } from 'pinia'
import * as path from 'path-browserify'

export const useFileTreeStore = defineStore('fileTree', () => {
  // 文件树数据
  const fileTree = ref<FileNode[]>([])
  
  // 当前选中的节点
  const selectedNode = ref<FileNode | null>(null)
  
  // 当前工作区目录
  const currentWorkspace = useStorage<string | null>('lazybox-current-workspace', null)
  
  // 最近打开的工作区列表
  const recentWorkspaces = useStorage<string[]>('lazybox-recent-workspaces', [])
  
  // 加载状态
  const isLoading = ref(false)
  
  // 错误信息
  const error = ref<string | null>(null)

  // 选择工作区文件夹
  const selectWorkspaceFolder = async () => {
    try {
      const folderPath = await window.$api.selectWorkspaceFolder()
      if (folderPath) {
        await openWorkspace(folderPath)
        return folderPath
      }
      return ''
    } catch (e) {
      console.error('selectWorkspaceFolder error', e)
      toast.error('选择文件夹失败')
      return ''
    }
  }

  // 打开工作区
  const openWorkspace = async (workspacePath: string) => {
    currentWorkspace.value = workspacePath
    
    // 添加到最近打开列表（去重并保持在前面）
    const filtered = recentWorkspaces.value.filter(w => w !== workspacePath)
    recentWorkspaces.value = [workspacePath, ...filtered].slice(0, 10) // 最多保存 10 个
    
    await loadFileTree()
    toast.success('工作区已打开')
  }

  // 关闭工作区
  const closeWorkspace = () => {
    currentWorkspace.value = null
    fileTree.value = []
    selectedNode.value = null
  }

  // 加载文件树
  const loadFileTree = async () => {
    if (!currentWorkspace.value) {
      fileTree.value = []
      return
    }

    isLoading.value = true
    error.value = null
    try {
      const tree = await window.$api.readDirectoryTree(currentWorkspace.value)
      fileTree.value = tree as any
    } catch (e) {
      error.value = '加载文件树失败'
      console.error('loadFileTree error', e)
    } finally {
      isLoading.value = false
    }
  }

  // 选择节点
  const selectNode = (node: FileNode) => {
    selectedNode.value = node
  }

  // 获取当前工作区路径（用于创建文件/文件夹时的默认路径）
  const getWorkspacePath = () => {
    return currentWorkspace.value || ''
  }

  // 创建文件
  const createFile = async (parentPath: string, fileName: string) => {
    if (!currentWorkspace.value) {
      toast.error('请先打开一个工作区')
      return ''
    }

    try {
      const content = `# ${fileName.replace('.md', '')}\n\n`
      const fullFileName = fileName.endsWith('.md') ? fileName : `${fileName}.md`
      const result = await window.$api.createFile(parentPath, fullFileName, content)
      if (result) {
        await loadFileTree()
        toast.success('文件创建成功')
        return result
      } else {
        toast.error('文件创建失败，文件可能已存在')
        return ''
      }
    } catch (e) {
      console.error('createFile error', e)
      toast.error('文件创建失败')
      return ''
    }
  }

  // 创建文件夹
  const createFolder = async (parentPath: string, folderName: string) => {
    if (!currentWorkspace.value) {
      toast.error('请先打开一个工作区')
      return ''
    }

    try {
      const result = await window.$api.createFolder(parentPath, folderName)
      if (result) {
        await loadFileTree()
        toast.success('文件夹创建成功')
        return result
      } else {
        toast.error('文件夹创建失败，文件夹可能已存在')
        return ''
      }
    } catch (e) {
      console.error('createFolder error', e)
      toast.error('文件夹创建失败')
      return ''
    }
  }

  // 重命名节点
  const renameNode = async (node: FileNode, newName: string) => {
    try {
      let result = ''
      if (node.type === 'file') {
        const fullName = newName.endsWith('.md') ? newName : `${newName}.md`
        result = await window.$api.renameFile(node.path, fullName)
      } else {
        result = await window.$api.renameFolder(node.path, newName)
      }
      
      if (result) {
        await loadFileTree()
        toast.success(`${node.type === 'file' ? '文件' : '文件夹'}重命名成功`)
        return result
      } else {
        toast.error('重命名失败，名称可能已存在')
        return ''
      }
    } catch (e) {
      console.error('renameNode error', e)
      toast.error('重命名失败')
      return ''
    }
  }

  // 删除节点
  const deleteNode = async (node: FileNode) => {
    try {
      let result = ''
      if (node.type === 'file') {
        result = await window.$api.removeFile(node.path)
      } else {
        result = await window.$api.removeFolder(node.path)
      }
      
      if (result) {
        // 如果删除的是当前选中的节点，清空选中状态
        if (selectedNode.value?.id === node.id) {
          selectedNode.value = null
        }
        await loadFileTree()
        toast.success(`${node.type === 'file' ? '文件' : '文件夹'}删除成功`)
        return result
      } else {
        toast.error('删除失败')
        return ''
      }
    } catch (e) {
      console.error('deleteNode error', e)
      toast.error('删除失败')
      return ''
    }
  }

  // 移动节点
  const moveNode = async (sourceNode: FileNode, targetNode: FileNode) => {
    try {
      // 目标必须是文件夹
      if (targetNode.type !== 'folder') {
        toast.error('只能移动到文件夹中')
        return ''
      }

      // 不能移动到自己内部
      if (sourceNode.id === targetNode.id) {
        return ''
      }

      // 不能移动到自己的子目录
      if (isDescendant(sourceNode, targetNode)) {
        toast.error('不能移动到自己的子目录')
        return ''
      }

      const targetPath = path.join(targetNode.path, path.basename(sourceNode.path))
      const result = await window.$api.moveFileOrFolder(sourceNode.path, targetPath)
      
      if (result) {
        await loadFileTree()
        toast.success('移动成功')
        return result
      } else {
        toast.error('移动失败，目标位置可能已存在同名文件')
        return ''
      }
    } catch (e) {
      console.error('moveNode error', e)
      toast.error('移动失败')
      return ''
    }
  }

  // 复制文件
  const copyNode = async (sourceNode: FileNode, targetNode: FileNode) => {
    try {
      // 只支持复制文件
      if (sourceNode.type !== 'file') {
        toast.error('当前只支持复制文件')
        return ''
      }

      // 目标必须是文件夹
      if (targetNode.type !== 'folder') {
        toast.error('只能复制到文件夹中')
        return ''
      }

      const fileName = path.basename(sourceNode.path)
      const targetPath = path.join(targetNode.path, fileName)
      const result = await window.$api.copyFile(sourceNode.path, targetPath)
      
      if (result) {
        await loadFileTree()
        toast.success('复制成功')
        return result
      } else {
        toast.error('复制失败，目标位置可能已存在同名文件')
        return ''
      }
    } catch (e) {
      console.error('copyNode error', e)
      toast.error('复制失败')
      return ''
    }
  }

  // 判断 node1 是否是 node2 的祖先节点
  const isDescendant = (ancestor: FileNode, node: FileNode): boolean => {
    if (!ancestor.children) return false
    
    for (const child of ancestor.children) {
      if (child.id === node.id) return true
      if (isDescendant(child, node)) return true
    }
    
    return false
  }

  // 根据路径查找节点
  const findNodeByPath = (nodes: FileNode[], targetPath: string): FileNode | null => {
    for (const node of nodes) {
      if (node.path === targetPath) return node
      if (node.children) {
        const found = findNodeByPath(node.children, targetPath)
        if (found) return found
      }
    }
    return null
  }

  // 读取文件内容
  const readFileContent = async (filePath: string) => {
    try {
      const content = await window.$api.readFile(filePath)
      return content
    } catch (e) {
      console.error('readFileContent error', e)
      toast.error('读取文件失败')
      return ''
    }
  }

  // 更新文件内容
  const updateFileContent = async (filePath: string, content: string) => {
    try {
      const result = await window.$api.updateFile(filePath, content)
      if (result) {
        return result
      } else {
        toast.error('保存文件失败')
        return ''
      }
    } catch (e) {
      console.error('updateFileContent error', e)
      toast.error('保存文件失败')
      return ''
    }
  }

  return {
    fileTree,
    selectedNode,
    currentWorkspace,
    recentWorkspaces,
    isLoading,
    error,
    selectWorkspaceFolder,
    openWorkspace,
    closeWorkspace,
    getWorkspacePath,
    loadFileTree,
    selectNode,
    createFile,
    createFolder,
    renameNode,
    deleteNode,
    moveNode,
    copyNode,
    findNodeByPath,
    readFileContent,
    updateFileContent,
  }
})

