import { ipcMain, dialog, BrowserWindow, shell } from 'electron'
import { 
  writeContent2File, 
  updateContent2File, 
  defaultAppDir, 
  renameFile, 
  removeFile, 
  getFileContent,
  createFolder,
  renameFolder,
  removeFolder,
  moveFileOrFolder,
  copyFile,
  readDirectoryTree,
  createDir,
  checkIfDirExist
} from './local'
import * as path from 'path'
import * as fs from 'fs/promises'

export const initIpcMain = () => {
  // 旧版文件操作（保留向后兼容）
  ipcMain.handle('add-post', async (_, { title, content }) => {
    return writeContent2File(defaultAppDir, `${title}.md`, content);
  })

  ipcMain.handle('rename-post', async (_, { originTitle, newTitle }) => {
    return renameFile(defaultAppDir, `${originTitle}.md`, `${newTitle}.md`);
  })

  ipcMain.handle('remove-post', async (_, { title }) => {
    return removeFile(defaultAppDir, `${title}.md`);
  })

  ipcMain.handle('update-post', async (_, { title, content }) => {
    return updateContent2File(defaultAppDir, `${title}.md`, content);
  })

  ipcMain.handle('get-post', async (_, { title }) => {
    return getFileContent(defaultAppDir, `${title}.md`);
  })

  ipcMain.handle('import-post', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow() as BrowserWindow, {
      title: '选择 markdown 文件',
      filters: [{ name: 'Markdowns', extensions: ['md'] }],
      properties: ['openFile']
    })
    if (canceled || !filePaths.length) return ''
    const filePath = filePaths[0]
    return await getFileContent(filePath, '');
  })

  // 新版文件树操作
  ipcMain.handle('read-directory-tree', async (_, { workspaceDir }) => {
    const targetDir = workspaceDir || defaultAppDir;
    return readDirectoryTree(targetDir);
  })

  // 选择工作区文件夹
  ipcMain.handle('select-workspace-folder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow() as BrowserWindow, {
      title: '选择工作区文件夹',
      properties: ['openDirectory', 'createDirectory']
    })
    if (canceled || !filePaths.length) return ''
    return filePaths[0]
  })

  ipcMain.handle('create-folder', async (_, { parentPath, folderName }) => {
    return createFolder(parentPath, folderName);
  })

  ipcMain.handle('rename-folder', async (_, { oldPath, newName }) => {
    const dirName = path.dirname(oldPath);
    const newPath = path.join(dirName, newName);
    return renameFolder(oldPath, newPath);
  })

  ipcMain.handle('remove-folder', async (_, { folderPath }) => {
    return removeFolder(folderPath);
  })

  ipcMain.handle('create-file', async (_, { dirPath, fileName, content }) => {
    return writeContent2File(dirPath, fileName, content);
  })

  ipcMain.handle('rename-file', async (_, { filePath, newName }) => {
    const dirName = path.dirname(filePath);
    const oldName = path.basename(filePath);
    return renameFile(dirName, oldName, newName);
  })

  ipcMain.handle('remove-file', async (_, { filePath }) => {
    const dirName = path.dirname(filePath);
    const fileName = path.basename(filePath);
    return removeFile(dirName, fileName);
  })

  ipcMain.handle('read-file', async (_, { filePath }) => {
    const dirName = path.dirname(filePath);
    const fileName = path.basename(filePath);
    return getFileContent(dirName, fileName);
  })

  ipcMain.handle('read-image-as-base64', async (_, { filePath }) => {
    try {
      // 检查文件状态
      const stats = await fs.stat(filePath);
      
      if (!stats.isFile()) {
        throw new Error(`Not a file: ${filePath}`);
      }
      
      if (stats.size === 0) {
        throw new Error(`File is empty: ${filePath}`);
      }
      
      // 读取文件并转换为 base64
      const buffer = await fs.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase().slice(1);
      
      const mimeTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'bmp': 'image/bmp',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'ico': 'image/x-icon'
      };
      
      const mimeType = mimeTypes[ext] || 'image/png';
      const base64 = buffer.toString('base64');
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.error('Failed to read image:', error);
      throw error;
    }
  })

  ipcMain.handle('read-pdf-as-base64', async (_, { filePath }) => {
    try {
      // 检查文件状态
      const stats = await fs.stat(filePath);
      
      if (!stats.isFile()) {
        throw new Error(`Not a file: ${filePath}`);
      }
      
      if (stats.size === 0) {
        throw new Error(`File is empty: ${filePath}`);
      }
      
      // 读取 PDF 文件并转换为 base64
      const buffer = await fs.readFile(filePath);
      const base64 = buffer.toString('base64');
      return `data:application/pdf;base64,${base64}`;
    } catch (error) {
      console.error('Failed to read PDF:', error);
      throw error;
    }
  })

  ipcMain.handle('update-file', async (_, { filePath, content }) => {
    const dirName = path.dirname(filePath);
    const fileName = path.basename(filePath);
    return updateContent2File(dirName, fileName, content);
  })

  ipcMain.handle('move-file-or-folder', async (_, { sourcePath, targetPath }) => {
    return moveFileOrFolder(sourcePath, targetPath);
  })

  ipcMain.handle('copy-file', async (_, { sourcePath, targetPath }) => {
    return copyFile(sourcePath, targetPath);
  })

  // 工作空间相关 API
  ipcMain.handle('create-workspace', async (_, { path: workspacePath }) => {
    try {
      console.log('[IPC] Creating workspace directory:', workspacePath);
      const result = await createDir(workspacePath);
      console.log('[IPC] Create directory result:', result);
      const success = !!result;
      console.log('[IPC] Returning success:', success);
      return success;
    } catch (error) {
      console.error('[IPC] Failed to create workspace:', error);
      return false;
    }
  })

  ipcMain.handle('validate-workspace', async (_, { path: workspacePath }) => {
    try {
      const exists = await checkIfDirExist(workspacePath);
      return exists;
    } catch (error) {
      console.error('Failed to validate workspace:', error);
      return false;
    }
  })

  ipcMain.handle('get-default-workspace-path', async () => {
    return defaultAppDir;
  })

  ipcMain.handle('open-workspace-folder', async (_, { path: workspacePath }) => {
    try {
      await shell.openPath(workspacePath);
    } catch (error) {
      console.error('Failed to open workspace folder:', error);
    }
  })

  // 更新窗口标题
  ipcMain.handle('set-window-title', async (_, { title }) => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.setTitle(title);
    }
  })
}