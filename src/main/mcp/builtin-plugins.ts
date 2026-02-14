/**
 * 内置 MCP 插件
 * 提供常用的编辑器工具和功能
 */

import { MCPPlugin } from './types';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

/**
 * 文件系统插件
 * 提供文件读写操作
 */
export const filesystemPlugin: MCPPlugin = {
  id: 'builtin-filesystem',
  name: 'File System',
  version: '1.0.0',
  description: 'Read and write files on the local filesystem',
  enabled: true,

  tools: [
    {
      name: 'read_file',
      description: 'Read the contents of a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The path to the file to read',
          },
        },
        required: ['path'],
      },
      handler: async ({ path }, context) => {
        try {
          const content = await readFile(resolve(path), 'utf-8');
          return { content };
        } catch (error: any) {
          throw new Error(`Failed to read file: ${error.message}`);
        }
      },
      permissions: ['fs:read'],
    },
    {
      name: 'write_file',
      description: 'Write content to a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The path to the file to write',
          },
          content: {
            type: 'string',
            description: 'The content to write to the file',
          },
        },
        required: ['path', 'content'],
      },
      handler: async ({ path, content }, context) => {
        try {
          const { writeFile } = require('fs/promises');
          await writeFile(resolve(path), content, 'utf-8');
          return { success: true };
        } catch (error: any) {
          throw new Error(`Failed to write file: ${error.message}`);
        }
      },
      permissions: ['fs:write'],
    },
  ],

  resources: [
    {
      uri: 'file:///{path}',
      name: 'Local File',
      description: 'Access to local files',
      mimeType: 'text/plain',
      handler: async (uri, context) => {
        const path = uri.replace('file:///', '');
        const content = await readFile(resolve(path), 'utf-8');
        return content;
      },
      writable: true,
      writeHandler: async (uri, content, context) => {
        const path = uri.replace('file:///', '');
        const { writeFile } = require('fs/promises');
        await writeFile(resolve(path), content, 'utf-8');
      },
    },
  ],
};

/**
 * 搜索插件
 * 提供文件搜索功能
 */
export const searchPlugin: MCPPlugin = {
  id: 'builtin-search',
  name: 'Search',
  version: '1.0.0',
  description: 'Search for files and content',
  enabled: true,

  tools: [
    {
      name: 'search_files',
      description: 'Search for files by name',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query',
          },
          path: {
            type: 'string',
            description: 'The path to search in (default: current directory)',
          },
        },
        required: ['query'],
      },
      handler: async ({ query, path = '.' }, context) => {
        try {
          const { readdir } = require('fs/promises');
          const { resolve } = require('path');

          const entries = await readdir(resolve(path), { withFileTypes: true });
          const results = entries
            .filter(entry => entry.name.toLowerCase().includes(query.toLowerCase()))
            .map(entry => ({
              name: entry.name,
              type: entry.isDirectory() ? 'directory' : 'file',
              path: resolve(path, entry.name),
            }));

          return { results };
        } catch (error: any) {
          throw new Error(`Search failed: ${error.message}`);
        }
      },
      permissions: ['fs:read'],
    },
    {
      name: 'search_content',
      description: 'Search for content within files',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query',
          },
          path: {
            type: 'string',
            description: 'The path to search in (default: current directory)',
          },
          filePattern: {
            type: 'string',
            description: 'File pattern to match (e.g., *.md)',
          },
        },
        required: ['query'],
      },
      handler: async ({ query, path = '.', filePattern }, context) => {
        try {
          const { readdir, readFile } = require('fs/promises');
          const { resolve, join } = require('path');
          const { glob } = require('glob');

          const pattern = filePattern || '**/*';
          const files = await glob(pattern, { cwd: resolve(path) });

          const results: Array<{ file: string; matches: number }> = [];

          for (const file of files) {
            try {
              const content = await readFile(join(path, file), 'utf-8');
              const regex = new RegExp(query, 'gi');
              const matches = content.match(regex);

              if (matches && matches.length > 0) {
                results.push({ file, matches: matches.length });
              }
            } catch (error) {
              // Skip files that can't be read
            }
          }

          return { results };
        } catch (error: any) {
          throw new Error(`Content search failed: ${error.message}`);
        }
      },
      permissions: ['fs:read'],
    },
  ],
};

/**
 * Git 插件
 * 提供 Git 操作
 */
export const gitPlugin: MCPPlugin = {
  id: 'builtin-git',
  name: 'Git',
  version: '1.0.0',
  description: 'Git version control operations',
  enabled: true,

  tools: [
    {
      name: 'git_status',
      description: 'Get git status',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The path to the git repository',
          },
        },
        required: ['path'],
      },
      handler: async ({ path }, context) => {
        try {
          const { execSync } = require('child_process');
          const status = execSync('git status --porcelain', {
            cwd: resolve(path),
            encoding: 'utf-8',
          });
          return { status };
        } catch (error: any) {
          throw new Error(`Git status failed: ${error.message}`);
        }
      },
      permissions: ['git:read'],
    },
    {
      name: 'git_diff',
      description: 'Get git diff',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The path to the git repository',
          },
          file: {
            type: 'string',
            description: 'Specific file to diff',
          },
        },
        required: ['path'],
      },
      handler: async ({ path, file }, context) => {
        try {
          const { execSync } = require('child_process');
          const args = file ? `-- ${file}` : '';
          const diff = execSync(`git diff ${args}`, {
            cwd: resolve(path),
            encoding: 'utf-8',
          });
          return { diff };
        } catch (error: any) {
          throw new Error(`Git diff failed: ${error.message}`);
        }
      },
      permissions: ['git:read'],
    },
  ],
};

/**
 * 系统插件
 * 提供系统信息
 */
export const systemPlugin: MCPPlugin = {
  id: 'builtin-system',
  name: 'System',
  version: '1.0.0',
  description: 'System information and utilities',
  enabled: true,

  tools: [
    {
      name: 'get_system_info',
      description: 'Get system information',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async (_params, context) => {
        const os = require('os');
        return {
          platform: os.platform(),
          arch: os.arch(),
          version: os.release(),
          hostname: os.hostname(),
          cpus: os.cpus().length,
          totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + ' GB',
          freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024) + ' GB',
          uptime: Math.round(os.uptime() / 3600) + ' hours',
        };
      },
      permissions: [],
    },
    {
      name: 'execute_command',
      description: 'Execute a shell command (use with caution)',
      inputSchema: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The command to execute',
          },
        },
        required: ['command'],
      },
      handler: async ({ command }, context) => {
        try {
          const { execSync } = require('child_process');
          const output = execSync(command, { encoding: 'utf-8', maxBuffer: 1024 * 1024 });
          return { output };
        } catch (error: any) {
          throw new Error(`Command execution failed: ${error.message}`);
        }
      },
      permissions: ['system:exec'],
    },
  ],

  resources: [
    {
      uri: 'system://info',
      name: 'System Information',
      description: 'Current system information',
      mimeType: 'application/json',
      handler: async (_uri, context) => {
        const os = require('os');
        return JSON.stringify({
          platform: os.platform(),
          arch: os.arch(),
          version: os.release(),
          hostname: os.hostname(),
          cpus: os.cpus().length,
          totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + ' GB',
          freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024) + ' GB',
        }, null, 2);
      },
    },
  ],
};

/**
 * 获取所有内置插件
 */
export function getBuiltinPlugins(): MCPPlugin[] {
  return [
    filesystemPlugin,
    searchPlugin,
    gitPlugin,
    systemPlugin,
  ];
}

/**
 * 注册所有内置插件
 */
export function registerBuiltinPlugins(manager: any): void {
  const plugins = getBuiltinPlugins();

  for (const plugin of plugins) {
    try {
      manager.register(plugin);
    } catch (error) {
      console.error(`[MCP] Failed to register builtin plugin ${plugin.id}:`, error);
    }
  }

  console.log(`[MCP] Registered ${plugins.length} builtin plugins`);
}
