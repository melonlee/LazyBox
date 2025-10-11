/**
 * 本地文件处理
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { getStore, setStore } from './store';
import DEFAULT_DOCUMENT_PATH from '../../resources/markdown.md?asset';

const promiseFs = fs.promises;

export const defaultAppDir = path.join(app.getPath('documents'), 'codes', 'woocs');
export const defaultDocumentName = '探索 Markdown';
export const defaultDocumentPath = path.join(defaultAppDir, `${defaultDocumentName}.md`);

export const checkIfDirExist = async (dirname: string) => {
  try {
    const stats = await promiseFs.stat(dirname);
    return stats.isDirectory();
  } catch(err) {
    console.log('checkIfDirExist fs stats error', err);
    return false;
  }
}

export const checkIfFileExist = async (filename: string) => {
  try {
    const stats = await promiseFs.stat(filename);
    return stats.isFile();
  } catch(err) {
    console.log('checkIfFileExist fs stats error', err);
    return false;
  }
}

export const createDir = async (dirname: string) => {
  const isDirExist = await checkIfDirExist(dirname);
  if (isDirExist) return;
  try {
    await promiseFs.mkdir(dirname, { recursive: true });
    return dirname;
  } catch(e) {
    console.log('mkdir error', e);
    return false;
  }
}

export const writeContent2File = async (dirname: string, filename: string, content: string) => {
  try {
    const filePath = path.join(dirname, filename);
    const ifFileExist = await checkIfFileExist(filePath);
    if (!ifFileExist) {
      await promiseFs.writeFile(filePath, content, { encoding: 'utf-8' });
      return filePath;
    }
    return '';
  } catch(e) {
    console.log('writeFile error', dirname, filename, e);
    return '';
  }
}

export const updateContent2File = async (dirname: string, filename: string, content: string) => {
  try {
    const filePath = path.join(dirname, filename);
    await promiseFs.writeFile(filePath, content, { encoding: 'utf-8' });
    return filePath;
  } catch(e) {
    console.log('writeFile error', dirname, filename, e);
    return '';
  }
}

export const renameFile = async (dirname: string, originFilename: string, newFileName: string) => {
  try {
    const filePath = path.join(dirname, newFileName);
    const ifFileExist = await checkIfFileExist(filePath);
    if (!ifFileExist) {
      await promiseFs.rename(path.join(dirname, originFilename), filePath)
      return filePath
    }
    return ''
  } catch(e) {
    console.log('writeFile error', dirname, originFilename, newFileName, e);
    return '';
  }
}

export const removeFile = async (dirname: string, filename: string) => {
  try {
    const filePath = path.join(dirname, filename);
    await promiseFs.unlink(filePath)
    return filePath
  } catch(e) {
    console.log('writeFile error', dirname, filename, e);
    return '';
  }
}

export const getFileContent = async (dirname: string, filename: string) => {
  try {
    const filePath = path.join(dirname, filename);
    return await promiseFs.readFile(filePath, { encoding: 'utf-8' });
  } catch(e) {
    console.log('writeFile error', dirname, filename, e);
    return '';
  }
}

export const initDocumentDir = async () => {
  await createDir(defaultAppDir);

  // 如果第一次启动应用，则创建默认文件
  if (!getStore('woocs-first-run-4')) {
    const defaultFileContent = await promiseFs.readFile(DEFAULT_DOCUMENT_PATH, { encoding: 'utf-8' });
    writeContent2File(defaultAppDir, `${defaultDocumentName}.md`, defaultFileContent);
    setStore('woocs-first-run-4', '1');
  }
}

// 文件夹操作
export const createFolder = async (dirPath: string, folderName: string) => {
  try {
    const folderPath = path.join(dirPath, folderName);
    const isFolderExist = await checkIfDirExist(folderPath);
    if (isFolderExist) {
      return '';
    }
    await promiseFs.mkdir(folderPath, { recursive: true });
    return folderPath;
  } catch(e) {
    console.log('createFolder error', dirPath, folderName, e);
    return '';
  }
}

export const renameFolder = async (oldPath: string, newPath: string) => {
  try {
    const isNewPathExist = await checkIfDirExist(newPath);
    if (isNewPathExist) {
      return '';
    }
    await promiseFs.rename(oldPath, newPath);
    return newPath;
  } catch(e) {
    console.log('renameFolder error', oldPath, newPath, e);
    return '';
  }
}

export const removeFolder = async (folderPath: string) => {
  try {
    await promiseFs.rm(folderPath, { recursive: true, force: true });
    return folderPath;
  } catch(e) {
    console.log('removeFolder error', folderPath, e);
    return '';
  }
}

// 移动文件或文件夹
export const moveFileOrFolder = async (sourcePath: string, targetPath: string) => {
  try {
    await promiseFs.rename(sourcePath, targetPath);
    return targetPath;
  } catch(e) {
    console.log('moveFileOrFolder error', sourcePath, targetPath, e);
    return '';
  }
}

// 复制文件
export const copyFile = async (sourcePath: string, targetPath: string) => {
  try {
    await promiseFs.copyFile(sourcePath, targetPath);
    return targetPath;
  } catch(e) {
    console.log('copyFile error', sourcePath, targetPath, e);
    return '';
  }
}

// 读取目录树（递归）
export interface FileNodeData {
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

export const readDirectoryTree = async (dirPath: string, parentId?: string): Promise<FileNodeData[]> => {
  try {
    const entries = await promiseFs.readdir(dirPath, { withFileTypes: true });
    const nodes: FileNodeData[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const stats = await promiseFs.stat(fullPath);
      
      const nodeId = fullPath.replace(defaultAppDir, '').replace(/^\//, '');
      
      const node: FileNodeData = {
        id: nodeId || 'root',
        name: entry.name,
        type: entry.isDirectory() ? 'folder' : 'file',
        path: fullPath,
        parentId,
        metadata: {
          createdAt: stats.birthtime,
          updatedAt: stats.mtime,
          size: stats.size,
        }
      };

      if (entry.isDirectory()) {
        node.children = await readDirectoryTree(fullPath, nodeId);
      } else if (!entry.name.endsWith('.md')) {
        // 跳过非 markdown 文件
        continue;
      }

      nodes.push(node);
    }

    // 按类型（文件夹在前）和名称排序
    return nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name, 'zh-CN');
    });
  } catch(e) {
    console.log('readDirectoryTree error', dirPath, e);
    return [];
  }
}