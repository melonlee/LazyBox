import { ipcMain, dialog, BrowserWindow } from 'electron'
import { writeContent2File, updateContent2File, defaultAppDir, renameFile, removeFile, getFileContent } from './local'

export const initIpcMain = () => {
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
}