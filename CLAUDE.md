# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the application for production
- `npm run typecheck` - Run TypeScript type checking for both main and renderer processes
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run build:win` - Build Windows executable
- `npm run build:mac` - Build macOS executable
- `npm run build:linux` - Build Linux executable

## Project Architecture

LazyBox is an Electron-based desktop Markdown editor, forked from doocs/md. The app uses a multi-process Electron architecture:

### Process Structure

- **Main Process** (`src/main/`) - Node.js environment, handles window management, file system operations, and IPC
- **Preload** (`src/preload/`) - Bridge between main and renderer, exposes safe APIs via `contextBridge`
- **Renderer Process** (`src/renderer/`) - Vue 3 application with Pinia state management

### Key Architectural Patterns

#### IPC Communication
All file operations and system calls go through IPC handlers defined in `src/main/ipc.ts`. The preload script (`src/preload/index.ts`) exposes these as `window.$api` with two API sets:

1. **Legacy API** - Single-file operations (`addPost`, `renamePost`, `removePost`, etc.)
2. **New API** - Workspace-based file tree operations (`createFile`, `readDirectoryTree`, `moveFileOrFolder`, etc.)

#### Workspace System
The app uses a workspace-based file management system:

- **Workspace Store** (`src/renderer/src/stores/workspace.ts`) - Manages multiple workspaces, tracks current/recent workspaces, persists to localStorage
- **File Tree Store** (`src/renderer/src/stores/fileTree.ts`) - Handles file tree loading, file/folder CRUD operations
- **Local File Operations** (`src/main/local.ts`) - Main process file system utilities with `defaultAppDir = ~/documents/codes/LazyBox`

#### View Routing
App.vue conditionally renders based on workspace state:
- `Welcome.vue` - Shown when no workspace is open (workspace selection screen)
- `CodemirrorEditor.vue` - Main editor when a workspace is active

#### Markdown Rendering Pipeline
The renderer system (`src/renderer/src/utils/renderer.ts`) uses:
- `marked` for Markdown parsing
- `highlight.js` for code syntax highlighting
- `mermaid` for diagram rendering
- `DOMPurify` for sanitization
- Custom theme system with CSS-in-JS styling

Theme customization flows through:
1. Base theme definitions in `@renderer/config/theme.ts`
2. CSS editor (`CssEditor.vue`) for user custom CSS
3. `renderer.ts` combines theme + custom CSS + applies to rendered output

#### State Management
- **Main Store** (`src/renderer/src/stores/index.ts`) - Editor state, theme settings, CSS configuration
- **Workspace Store** - Workspace CRUD, recent workspaces tracking
- **File Tree Store** - File tree loading and operations
- **Display Store** - UI state (dialogs, sliders visibility)

### File Structure Notes

- UI components in `src/renderer/src/components/ui/` are auto-imported Radix Vue wrappers
- `CodemirrorEditor` directory contains the main editor interface with sub-panels (FileTreePanel, PostSlider, RightSlider, CssEditor)
- The app uses `path-browserify` for path operations in renderer (original Node `path` is polyfilled)
- Assets are imported through Vite's `?asset` and `?raw` suffixes

### Key Constants

- Default workspace path: `~/documents/codes/LazyBox`
- Default document name: `探索 Markdown`
- First-run flag key: `lazybox-first-run-4`

### TypeScript Configuration

The project uses project references with separate configs:
- `tsconfig.node.json` - Main process (Node.js types)
- `tsconfig.web.json` - Renderer process (DOM types)
