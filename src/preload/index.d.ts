import { ElectronAPI } from '@electron-toolkit/preload'

interface FileNodeData {
  id: string
  name: string
  type: 'file' | 'folder'
  path: string
  parentId?: string
  children?: FileNodeData[]
  metadata?: {
    createdAt: Date
    updatedAt: Date
    size?: number
  }
}

interface LazyBoxAPI {
  onMessage: (callback: (...args: any[]) => void) => void
  
  // 旧版 API
  addPost2Local: (title: string, content: string) => Promise<string>
  renamePost: (originTitle: string, newTitle: string) => Promise<string>
  removePost: (title: string) => Promise<string>
  updatePost: (title: string, content: string) => Promise<string>
  getPost: (title: string) => Promise<string>
  importPost: () => Promise<string>

  // 新版文件树 API
  readDirectoryTree: (workspaceDir?: string) => Promise<FileNodeData[]>
  selectWorkspaceFolder: () => Promise<string>
  createFolder: (parentPath: string, folderName: string) => Promise<string>
  renameFolder: (oldPath: string, newName: string) => Promise<string>
  removeFolder: (folderPath: string) => Promise<string>
  createFile: (dirPath: string, fileName: string, content: string) => Promise<string>
  renameFile: (filePath: string, newName: string) => Promise<string>
  removeFile: (filePath: string) => Promise<string>
  readFile: (filePath: string) => Promise<string>
  readImageAsBase64: (filePath: string) => Promise<string>
  readPdfAsBase64: (filePath: string) => Promise<string>
  updateFile: (filePath: string, content: string) => Promise<string>
  moveFileOrFolder: (sourcePath: string, targetPath: string) => Promise<string>
  copyFile: (sourcePath: string, targetPath: string) => Promise<string>

  // 工作空间 API
  createWorkspace: (path: string) => Promise<boolean>
  validateWorkspace: (path: string) => Promise<boolean>
  getDefaultWorkspacePath: () => Promise<string>
  openWorkspaceFolder: (path: string) => Promise<void>

  // 窗口管理 API
  setWindowTitle: (title: string) => Promise<void>
}

declare global {
  interface Window {
    electron: ElectronAPI
    $api: LazyBoxAPI
  }
}
