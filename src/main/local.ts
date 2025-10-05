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