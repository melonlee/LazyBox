import { ipcMain, dialog, BrowserWindow } from 'electron'
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
  readDirectoryTree
} from './local'
import * as path from 'path'

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
}