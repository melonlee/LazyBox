import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { defaultDocumentName, defaultDocumentPath } from '../main/local'

// Custom APIs for renderer
const api = {
  onMessage: (callback) => ipcRenderer.on('message-to-renderer', (_, ...args) => callback(...args)),
  
  // 旧版 API（保留向后兼容）
  addPost2Local: (title, content) => ipcRenderer.invoke('add-post', { title, content }),
  renamePost: (originTitle, newTitle) => ipcRenderer.invoke('rename-post', { originTitle, newTitle }),
  removePost: (title) => ipcRenderer.invoke('remove-post', { title }),
  updatePost: (title, content) => ipcRenderer.invoke('update-post', { title, content }),
  getPost: (title) => ipcRenderer.invoke('get-post', { title }),
  importPost: () => ipcRenderer.invoke('import-post'),

  // 新版文件树 API
  readDirectoryTree: (workspaceDir?: string) => ipcRenderer.invoke('read-directory-tree', { workspaceDir }),
  selectWorkspaceFolder: () => ipcRenderer.invoke('select-workspace-folder'),
  createFolder: (parentPath: string, folderName: string) => 
    ipcRenderer.invoke('create-folder', { parentPath, folderName }),
  renameFolder: (oldPath: string, newName: string) => 
    ipcRenderer.invoke('rename-folder', { oldPath, newName }),
  removeFolder: (folderPath: string) => 
    ipcRenderer.invoke('remove-folder', { folderPath }),
  createFile: (dirPath: string, fileName: string, content: string) => 
    ipcRenderer.invoke('create-file', { dirPath, fileName, content }),
  renameFile: (filePath: string, newName: string) => 
    ipcRenderer.invoke('rename-file', { filePath, newName }),
  removeFile: (filePath: string) => 
    ipcRenderer.invoke('remove-file', { filePath }),
  readFile: (filePath: string) => 
    ipcRenderer.invoke('read-file', { filePath }),
  readImageAsBase64: (filePath: string) => 
    ipcRenderer.invoke('read-image-as-base64', { filePath }),
  readPdfAsBase64: (filePath: string) => 
    ipcRenderer.invoke('read-pdf-as-base64', { filePath }),
  updateFile: (filePath: string, content: string) => 
    ipcRenderer.invoke('update-file', { filePath, content }),
  moveFileOrFolder: (sourcePath: string, targetPath: string) => 
    ipcRenderer.invoke('move-file-or-folder', { sourcePath, targetPath }),
  copyFile: (sourcePath: string, targetPath: string) => 
    ipcRenderer.invoke('copy-file', { sourcePath, targetPath }),

  // 工作空间 API
  createWorkspace: (path: string) => 
    ipcRenderer.invoke('create-workspace', { path }),
  validateWorkspace: (path: string) => 
    ipcRenderer.invoke('validate-workspace', { path }),
  getDefaultWorkspacePath: () => 
    ipcRenderer.invoke('get-default-workspace-path'),
  openWorkspaceFolder: (path: string) => 
    ipcRenderer.invoke('open-workspace-folder', { path }),
  
  // 窗口管理 API
  setWindowTitle: (title: string) => 
    ipcRenderer.invoke('set-window-title', { title })
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('$api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.$api = api
}
