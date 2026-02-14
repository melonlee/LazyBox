<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { altKey, altSign, ctrlKey, shiftKey, shiftSign } from '@renderer/config'
import { useDisplayStore, useStore } from '@renderer/stores'
import { useFileTreeStore } from '@renderer/stores/fileTree'
import {
  checkImage,
  formatDoc,
  toBase64,
} from '@renderer/utils'
import fileApi from '@renderer/utils/file'
import CodeMirror from 'codemirror'

const store = useStore()
const displayStore = useDisplayStore()
const fileTreeStore = useFileTreeStore()
const { isDark, output, editor, readingTime } = storeToRefs(store)

const {
  editorRefresh,
  exportEditorContent2HTML,
  exportEditorContent2MD,
  formatContent,
  importMarkdownContent,
  importDefaultContent,
  resetStyleConfirm,
} = store

const {
  toggleShowInsertFormDialog,
  toggleShowUploadImgDialog,
} = displayStore

const isImgLoading = ref(false)
const timeout = ref<NodeJS.Timeout>()

const preview = ref<HTMLDivElement | null>(null)

// 使浏览区与编辑区滚动条建立同步联系
function leftAndRightScroll() {
  const scrollCB = (text: string) => {
    let source: HTMLElement
    let target: HTMLElement

    clearTimeout(timeout.value)
    if (text === `preview`) {
      source = preview.value!
      target = document.querySelector<HTMLElement>(`.CodeMirror-scroll`)!

      editor.value!.off(`scroll`, editorScrollCB)
      timeout.value = setTimeout(() => {
        editor.value!.on(`scroll`, editorScrollCB)
      }, 300)
    }
    else {
      source = document.querySelector<HTMLElement>(`.CodeMirror-scroll`)!
      target = preview.value!

      target.removeEventListener(`scroll`, previewScrollCB, false)
      timeout.value = setTimeout(() => {
        target.addEventListener(`scroll`, previewScrollCB, false)
      }, 300)
    }

    const percentage
      = source.scrollTop / (source.scrollHeight - source.offsetHeight)
    const height = percentage * (target.scrollHeight - target.offsetHeight)

    target.scrollTo(0, height)
  }

  function editorScrollCB() {
    scrollCB(`editor`)
  }

  function previewScrollCB() {
    scrollCB(`preview`)
  }

  (preview.value!).addEventListener(`scroll`, previewScrollCB, false)
  editor.value!.on(`scroll`, editorScrollCB)
}

onMounted(() => {
  setTimeout(() => {
    leftAndRightScroll()
  }, 300)
})

// 更新编辑器
function onEditorRefresh() {
  editorRefresh()
}

const backLight = ref(false)
const isCoping = ref(false)
const imageBase64 = ref<string>('')
const pdfBase64 = ref<string>('')

function startCopy() {
  isCoping.value = true
  backLight.value = true
}

// 加载图片
const loadImage = async (filePath: string) => {
  try {
    imageBase64.value = ''  // 先清空
    const base64Data = await window.$api.readImageAsBase64(filePath)
    imageBase64.value = base64Data
  } catch (error) {
    console.error('Failed to load image:', error)
    toast.error(`无法加载图片: ${error?.message || '未知错误'}`)
  }
}

// 加载 PDF
const loadPdf = async (filePath: string) => {
  try {
    pdfBase64.value = ''  // 先清空
    const base64Data = await window.$api.readPdfAsBase64(filePath)
    pdfBase64.value = base64Data
  } catch (error) {
    console.error('Failed to load PDF:', error)
    toast.error(`无法加载 PDF: ${error?.message || '未知错误'}`)
  }
}

// 在系统默认应用中打开 PDF
const openPdfExternally = async () => {
  if (store.currentFilePath && store.currentFileType === 'pdf') {
    try {
      await window.electron.shell.openPath(store.currentFilePath)
    } catch (error) {
      console.error('Failed to open PDF externally:', error)
      toast.error('无法打开 PDF 文件')
    }
  }
}

// 监听当前文件变化
watch([() => store.currentFilePath, () => store.currentFileType], async ([newPath, newType]) => {
  if (newType === 'image' && newPath) {
    await loadImage(newPath)
    pdfBase64.value = ''  // 清空 PDF 数据
  } else if (newType === 'pdf' && newPath) {
    await loadPdf(newPath)
    imageBase64.value = ''  // 清空图片数据
  } else {
    imageBase64.value = ''  // 清空图片数据
    pdfBase64.value = ''  // 清空 PDF 数据
  }
}, { immediate: true })

// 可调整大小的分隔条
const editorWidth = useStorage('editor-width-percentage', 50) // 默认50%
const fileTreeWidth = useStorage('file-tree-width', 250) // 文件树宽度，默认250px
const isDraggingEditor = ref(false)
const isDraggingFileTree = ref(false)
const containerRef = ref<HTMLElement | null>(null)

// 编辑器分隔条
const handleEditorMouseDown = () => {
  isDraggingEditor.value = true
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

// 文件树分隔条
const handleFileTreeMouseDown = () => {
  isDraggingFileTree.value = true
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const handleMouseMove = (e: MouseEvent) => {
  if (!containerRef.value) return
  
  const containerRect = containerRef.value.getBoundingClientRect()
  const offsetX = e.clientX - containerRect.left
  
  // 拖动文件树分隔条
  if (isDraggingFileTree.value && store.isOpenPostSlider) {
    let width = offsetX
    // 限制范围在 200px - 500px
    width = Math.max(200, Math.min(500, width))
    fileTreeWidth.value = width
  }
  
  // 拖动编辑器分隔条
  if (isDraggingEditor.value) {
    const currentFileTreeWidth = store.isOpenPostSlider ? fileTreeWidth.value : 0
    
    // 可用宽度（减去文件树和其他固定宽度）
    const availableWidth = containerRect.width - currentFileTreeWidth
    
    // 计算百分比（相对于可用宽度）
    let percentage = ((offsetX - currentFileTreeWidth) / availableWidth) * 100
    
    // 限制范围在 20% - 80%
    percentage = Math.max(20, Math.min(80, percentage))
    
    editorWidth.value = percentage
  }
}

const handleMouseUp = () => {
  isDraggingEditor.value = false
  isDraggingFileTree.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})

// 拷贝结束
function endCopy() {
  backLight.value = false
  setTimeout(() => {
    isCoping.value = false
  }, 800)
}

function beforeUpload(file: File) {
  // validate image
  const checkResult = checkImage(file)
  if (!checkResult.ok) {
    toast.error(checkResult.msg!)
    return false
  }

  // check image host
  const imgHost = localStorage.getItem(`imgHost`) || `default`
  localStorage.setItem(`imgHost`, imgHost)

  const config = localStorage.getItem(`${imgHost}Config`)
  const isValidHost = imgHost === `default` || config
  if (!isValidHost) {
    toast.error(`请先配置 ${imgHost} 图床参数`)
    return false
  }
  return true
}

// 图片上传结束
function uploaded(imageUrl: string) {
  if (!imageUrl) {
    toast.error(`上传图片未知异常`)
    return
  }
  toggleShowUploadImgDialog(false)
  // 上传成功，获取光标
  const cursor = editor.value!.getCursor()
  const markdownImage = `![](${imageUrl})`
  // 将 Markdown 形式的 URL 插入编辑框光标所在位置
  toRaw(store.editor!).replaceSelection(`\n${markdownImage}\n`, cursor as any)
  toast.success(`图片上传成功`)
}
function uploadImage(file: File, cb?: { (url: any): void, (arg0: unknown): void } | undefined) {
  isImgLoading.value = true

  toBase64(file)
    .then(base64Content => fileApi.fileUpload(base64Content, file))
    .then((url) => {
      if (cb) {
        cb(url)
      }
      else {
        uploaded(url)
      }
    })
    .catch((err) => {
      toast.error(err.message)
    })
    .finally(() => {
      isImgLoading.value = false
    })
}

const changeTimer = ref<NodeJS.Timeout>()

// 监听暗色模式并更新编辑器
watch(isDark, () => {
  const theme = isDark.value ? `darcula` : `xq-light`
  toRaw(editor.value)?.setOption?.(`theme`, theme)
})

// 初始化编辑器
async function initEditor() {
  const editorDom = document.querySelector<HTMLTextAreaElement>(`#editor`)
  if (!editorDom) {
    console.error('Editor DOM element not found')
    return
  }

  // 编辑器内容由文件树选择时加载，这里不需要预加载
  editor.value = CodeMirror.fromTextArea(editorDom, {
    mode: `text/x-markdown`,
    theme: isDark.value ? `darcula` : `xq-light`,
    lineNumbers: true,
    lineWrapping: true,
    styleActiveLine: true,
    autoCloseBrackets: true,
    extraKeys: {
      [`${shiftKey}-${altKey}-F`]: function autoFormat(editor) {
        formatDoc(editor.getValue()).then((doc) => {
          editor.setValue(doc)
        })
      },
      [`${ctrlKey}-B`]: function bold(editor) {
        const selected = editor.getSelection()
        editor.replaceSelection(`**${selected}**`)
      },
      [`${ctrlKey}-I`]: function italic(editor) {
        const selected = editor.getSelection()
        editor.replaceSelection(`*${selected}*`)
      },
      [`${ctrlKey}-D`]: function del(editor) {
        const selected = editor.getSelection()
        editor.replaceSelection(`~~${selected}~~`)
      },
      [`${ctrlKey}-K`]: function italic(editor) {
        const selected = editor.getSelection()
        editor.replaceSelection(`[${selected}]()`)
      },
      [`${ctrlKey}-E`]: function code(editor) {
        const selected = editor.getSelection()
        editor.replaceSelection(`\`${selected}\``)
      },
      // AI 快捷键
      [`${shiftKey}-${ctrlKey}-A`]: function aiContinue(editor) {
        emitter.emit('ai:continue-writing')
      },
      [`${shiftKey}-${ctrlKey}-P`]: function aiPolish(editor) {
        emitter.emit('ai:polish')
      },
      [`${shiftKey}-${ctrlKey}-E`]: function aiExpand(editor) {
        emitter.emit('ai:expand')
      },
      // 预备弃用
      [`${ctrlKey}-L`]: function code(editor) {
        const selected = editor.getSelection()
        editor.replaceSelection(`\`${selected}\``)
      },
    },
  })

  editor.value.on(`change`, (e) => {
    clearTimeout(changeTimer.value)
    changeTimer.value = setTimeout(async () => {
      onEditorRefresh()
      
      // 保存到文件树系统 - 只对 markdown 文件进行自动保存，避免覆盖图片/PDF等二进制文件
      if (fileTreeStore.selectedNode?.type === 'file' && store.currentFileType === 'markdown') {
      const content = e.getValue()
        await fileTreeStore.updateFileContent(fileTreeStore.selectedNode.path, content)
      }
    }, 300)
  })

  // 粘贴上传图片并插入
  editor.value.on(`paste`, (_cm, e) => {
    if (!(e.clipboardData && e.clipboardData.items) || isImgLoading.value) {
      return
    }
    for (let i = 0, len = e.clipboardData.items.length; i < len; ++i) {
      const item = e.clipboardData.items[i]
      if (item.kind === `file`) {
        // 校验图床参数
        const pasteFile = item.getAsFile()!
        const isValid = beforeUpload(pasteFile)
        if (!isValid) {
          continue
        }
        uploadImage(pasteFile)
      }
    }
  })
}

const container = ref(null)

// 工具函数，添加格式
function addFormat(cmd: string | number) {
  (editor.value as any).options.extraKeys[cmd](editor.value)
}

const codeMirrorWrapper = ref<ComponentPublicInstance<HTMLDivElement> | null>(null)

// 转换 markdown 中的本地图片为线上图片
// todo 处理事件覆盖
function mdLocalToRemote() {
  const dom = codeMirrorWrapper.value!

  // 上传 md 中的图片
  const uploadMdImg = async ({ md, list }: { md: { str: string, path: string, file: File }, list: { path: string, file: File }[] }) => {
    const mdImgList = [
      ...(md.str.matchAll(/!\[(.*?)\]\((.*?)\)/g) || []),
    ].filter((item) => {
      return item // 获取所有相对地址的图片
    })
    const root = md.path.match(/.+?\//)![0]
    const resList = await Promise.all<{ matchStr: string, url: string }>(
      mdImgList.map((item) => {
        return new Promise((resolve) => {
          let [, , matchStr] = item
          matchStr = matchStr.replace(/^.\//, ``) // 处理 ./img/ 为 img/ 统一相对路径风格
          const { file }
            = list.find(f => f.path === `${root}${matchStr}`) || {}
          uploadImage(file!, (url) => {
            resolve({ matchStr, url })
          })
        })
      }),
    )
    resList.forEach((item) => {
      md.str = md.str
        .replace(`](./${item.matchStr})`, `](${item.url})`)
        .replace(`](${item.matchStr})`, `](${item.url})`)
    })
    editor.value!.setValue(md.str)
  }

  dom.ondragover = evt => evt.preventDefault()
  dom.ondrop = async (evt: any) => {
    evt.preventDefault()
    for (const item of evt.dataTransfer.items) {
      item.getAsFileSystemHandle().then(async (handle: { kind: string, getFile: () => any }) => {
        if (handle.kind === `directory`) {
          const list = await showFileStructure(handle) as { path: string, file: File }[]
          const md = await getMd({ list })
          uploadMdImg({ md, list })
        }
        else {
          const file = await handle.getFile()
          console.log(`file`, file)
        }
      })
    }
  }

  // 从文件列表中查找一个 md 文件并解析
  async function getMd({ list }: { list: { path: string, file: File }[] }) {
    return new Promise<{ str: string, file: File, path: string }>((resolve) => {
      const { path, file } = list.find(item => item.path.match(/\.md$/))!
      const reader = new FileReader()
      reader.readAsText(file!, `UTF-8`)
      reader.onload = (evt) => {
        resolve({
          str: evt.target!.result as string,
          file,
          path,
        })
      }
    })
  }

  // 转换文件系统句柄中的文件为文件列表
  async function showFileStructure(root: any) {
    const result = []
    let cwd = ``
    try {
      const dirs = [root]
      for (const dir of dirs) {
        cwd += `${dir.name}/`
        for await (const [, handle] of dir) {
          if (handle.kind === `file`) {
            result.push({
              path: cwd + handle.name,
              file: await handle.getFile(),
            })
          }
          else {
            result.push({
              path: `${cwd + handle.name}/`,
            })
            dirs.push(handle)
          }
        }
      }
    }
    catch (err) {
      console.error(err)
    }
    return result
  }
}

onMounted(async () => {
  await initEditor()
  onEditorRefresh()
  mdLocalToRemote()
  
  // 延迟绑定滚动事件，确保DOM已渲染
  setTimeout(() => {
    if (store.viewMode === 'split') {
      leftAndRightScroll()
    }
  }, 300)
})
</script>

<template>
  <div ref="container" class="container flex flex-col">
    <EditorHeader
      @add-format="addFormat"
      @format-content="formatContent"
      @start-copy="startCopy"
      @end-copy="endCopy"
    />
    <main class="container-main flex flex-1 flex-col">
      <div 
        ref="containerRef"
        class="container-main-section border-radius-10 relative flex flex-1 overflow-hidden border-1"
      >
        <FileTreePanel :width="fileTreeWidth" />
        
        <!-- 文件树和编辑器之间的分隔条 -->
        <div 
          v-show="store.isOpenPostSlider"
          class="resize-handle"
          @mousedown="handleFileTreeMouseDown"
        >
          <div class="resize-handle-line" />
        </div>
        
        <div
          ref="codeMirrorWrapper"
          class="codeMirror-wrapper editor-border relative"
          :class="{
            'order-1': !store.isEditOnLeft,
          }"
          :style="store.viewMode === 'split' ? { width: `${editorWidth}%` } : { flex: 1 }"
        >
          <!-- 视图模式切换按钮 -->
          <div class="view-mode-toggle">
            <TooltipProvider :delay-duration="200">
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    variant="ghost"
                    size="sm"
                    :class="{ 'active': store.viewMode === 'edit' }"
                    @click="store.viewMode = 'edit'"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">编辑模式</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider :delay-duration="200">
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    variant="ghost"
                    size="sm"
                    :class="{ 'active': store.viewMode === 'split' }"
                    @click="store.viewMode = 'split'"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/></svg>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">分屏模式</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <!-- 图片预览 -->
          <div v-show="store.currentFileType === 'image'" class="h-full image-preview-container">
            <div class="image-preview-wrapper">
              <div class="image-preview-header">
                <h3 class="image-file-name">{{ store.currentFilePath.split('/').pop() }}</h3>
                <span class="image-file-path">{{ store.currentFilePath }}</span>
              </div>
              <div class="image-preview-content">
                <img v-if="imageBase64" :src="imageBase64" alt="Image preview" class="preview-image" />
                <div v-else class="image-loading">加载中...</div>
              </div>
            </div>
          </div>
          
          <!-- PDF 预览 -->
          <div v-show="store.currentFileType === 'pdf'" class="h-full pdf-preview-container">
            <div class="pdf-preview-wrapper">
              <div class="pdf-preview-header">
                <div class="pdf-header-info">
                  <h3 class="pdf-file-name">{{ store.currentFilePath.split('/').pop() }}</h3>
                  <span class="pdf-file-path">{{ store.currentFilePath }}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  @click="openPdfExternally"
                  class="open-external-btn"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" x2="21" y1="14" y2="3"></line></svg>
                  在系统中打开
                </Button>
              </div>
              <div class="pdf-preview-content">
                <iframe v-if="pdfBase64" :src="pdfBase64" class="pdf-viewer" />
                <div v-else class="pdf-loading">加载中...</div>
              </div>
            </div>
          </div>
          
          <!-- 编辑器 -->
          <div v-show="store.currentFileType !== 'image' && store.currentFileType !== 'pdf' && (store.viewMode === 'edit' || store.viewMode === 'split')" class="h-full">
          <ContextMenu>
            <ContextMenuTrigger>
              <textarea
                id="editor"
                type="textarea"
                placeholder="Your markdown text here."
              />
            </ContextMenuTrigger>
            <ContextMenuContent class="w-64">
              <ContextMenuItem inset @click="toggleShowUploadImgDialog()">
                上传图片
              </ContextMenuItem>
              <ContextMenuItem inset @click="toggleShowInsertFormDialog()">
                插入表格
              </ContextMenuItem>
              <ContextMenuItem inset @click="resetStyleConfirm()">
                恢复默认样式
              </ContextMenuItem>
              <ContextMenuItem inset @click="importDefaultContent()">
                导入默认文档
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem inset @click="importMarkdownContent()">
                导入 .md 文档
              </ContextMenuItem>
              <ContextMenuItem inset @click="exportEditorContent2MD()">
                导出 .md 文档
              </ContextMenuItem>
              <ContextMenuItem inset @click="exportEditorContent2HTML()">
                导出 .html
              </ContextMenuItem>
              <ContextMenuItem inset @click="formatContent()">
                格式化
                <ContextMenuShortcut>{{ altSign }} + {{ shiftSign }} + F</ContextMenuShortcut>
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>
        </div>
        
        <!-- 可拖动的分隔条（仅在分屏模式显示） -->
        <div 
          v-show="store.viewMode === 'split'"
          class="resize-handle"
          @mousedown="handleEditorMouseDown"
        >
          <div class="resize-handle-line" />
        </div>
        
        <div
          v-show="store.viewMode === 'split'"
          id="preview"
          ref="preview"
          class="preview-wrapper p-5"
          :style="{ width: `${100 - editorWidth}%` }"
        >
          <div id="output-wrapper" :class="{ output_night: !backLight }">
            <div class="preview border-x-1 shadow-xl">
              <section id="output" v-html="output" />
              <div v-if="isCoping" class="loading-mask">
                <div class="loading-mask-box">
                  <div class="loading__img" />
                  <span>正在生成</span>
                </div>
              </div>
            </div>
          </div>

          <BackTop target="preview" :right="40" :bottom="40" />
        </div>
        <CssEditor class="order-2 flex-1" />
        <RightSlider class="order-2" />
      </div>
      <footer class="h-[30px] flex select-none items-center justify-end px-4 text-[12px] footer-stats">
        字数 {{ readingTime?.words }}， 阅读大约需 {{ Math.ceil(readingTime?.minutes ?? 0) }} 分钟
      </footer>

      <UploadImgDialog @upload-image="uploadImage" />

      <InsertFormDialog />

      <RunLoading />

      <AlertDialog v-model:open="store.isOpenConfirmDialog">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>提示</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将丢失本地自定义样式，是否继续？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction @click="store.resetStyle()">
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  </div>
</template>

<style lang="less" scoped>
@import url('../assets/less/app.less');
</style>

<style lang="less" scoped>
.container {
  height: 100vh;
  min-width: 100%;
  padding: 0;
  background: #1a2332;
}

.container-main {
  overflow: hidden;
  padding: 1rem;
}

.container-main-section {
  background: rgba(51, 65, 85, 0.4);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(148, 163, 184, 0.1) !important;
  border-radius: 12px !important;
}

#output-wrapper {
  position: relative;
  user-select: text;
  height: 100%;
}

.loading-mask {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  text-align: center;
  color: hsl(var(--foreground));
  background-color: hsl(var(--background));

  .loading-mask-box {
    position: sticky;
    top: 50%;
    transform: translateY(-50%);

    .loading__img {
      width: 75px;
      height: 75px;
      background: url('../assets/images/favicon.png') no-repeat;
      margin: 1em auto;
      background-size: cover;
    }
  }
}

:deep(.preview-table) {
  border-spacing: 0;
}

.codeMirror-wrapper,
.preview-wrapper {
  height: 100%;
}

.codeMirror-wrapper {
  overflow-x: auto;
  background-color: transparent;
}

.codeMirror-wrapper :deep(.CodeMirror) {
  background-color: transparent;
  color: #e2e8f0;
}

.codeMirror-wrapper :deep(.CodeMirror-gutters) {
  background-color: transparent;
  border-right: 1px solid rgba(148, 163, 184, 0.1);
}

.codeMirror-wrapper :deep(.CodeMirror-linenumber) {
  color: #94a3b8;
  padding: 0 8px 0 5px;
  min-width: 30px;
  text-align: right;
}

.codeMirror-wrapper :deep(.CodeMirror-guttermarker) {
  color: #a78bfa;
}

.codeMirror-wrapper :deep(.CodeMirror-activeline) {
  .CodeMirror-linenumber {
    color: #e2e8f0;
    font-weight: 500;
  }
}

.editor-border {
  border-left: 1px solid rgba(148, 163, 184, 0.15);
  border-right: 1px solid rgba(148, 163, 184, 0.15);
}

.preview-wrapper {
  background-color: transparent;
}

.preview-wrapper :deep(.preview) {
  background-color: rgba(255, 255, 255, 0.95);
  color: #1e293b;
}

.preview-wrapper :deep(#output-wrapper) {
  background-color: transparent;
}

.footer-stats {
  color: #94a3b8;
}

// 视图模式切换按钮
.view-mode-toggle {
  position: absolute;
  top: 8px;
  right: 12px;
  z-index: 10;
  display: flex;
  gap: 4px;
  background: rgba(51, 65, 85, 0.9);
  backdrop-filter: blur(12px);
  padding: 4px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  
  :deep(button) {
    color: #94a3b8;
    padding: 6px;
    height: auto;
    min-width: 32px;
    
    &:hover {
      background-color: rgba(139, 92, 246, 0.2);
      color: #e2e8f0;
    }
    
    &.active {
      background-color: rgba(139, 92, 246, 0.3);
      color: #a78bfa;
    }
  }
}

// 可拖动的分隔条
.resize-handle {
  width: 4px;
  cursor: col-resize;
  background-color: transparent;
  position: relative;
  flex-shrink: 0;
  z-index: 10;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: rgba(139, 92, 246, 0.2);
    
    .resize-handle-line {
      opacity: 1;
      background-color: rgba(139, 92, 246, 0.6);
    }
  }
  
  &:active {
    background-color: rgba(139, 92, 246, 0.3);
  }
}

.resize-handle-line {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 40px;
  background-color: rgba(148, 163, 184, 0.3);
  border-radius: 2px;
  opacity: 0;
  transition: all 0.2s ease;
  pointer-events: none;
}

// 拖动时的全局样式
body.dragging {
  cursor: col-resize !important;
  user-select: none !important;
}

// 图片预览
.image-preview-container {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  overflow: auto;
  
  // 美化滚动条
  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(26, 35, 50, 0.3);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.2);
    border-radius: 3px;
    transition: all 0.3s ease;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(139, 92, 246, 0.4);
  }
}

.image-preview-wrapper {
  width: 100%;
  max-width: 1200px;
  padding: 2rem;
}

.image-preview-header {
  margin-bottom: 1.5rem;
  text-align: center;
  
  .image-file-name {
    font-size: 1.25rem;
    font-weight: 600;
    color: #e2e8f0;
    margin: 0 0 0.5rem 0;
  }
  
  .image-file-path {
    font-size: 0.875rem;
    color: #94a3b8;
  }
}

.image-preview-content {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(51, 65, 85, 0.3);
  border-radius: 12px;
  padding: 2rem;
  min-height: 400px;
}

.preview-image {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.image-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 1rem;
  min-height: 200px;
}

// PDF 预览样式
.pdf-preview-container {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: 1rem;
}

.pdf-preview-wrapper {
  width: 100%;
  max-width: 1400px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.pdf-preview-header {
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  
  .pdf-header-info {
    flex: 1;
    text-align: center;
  }
  
  .pdf-file-name {
    font-size: 1.25rem;
    font-weight: 600;
    color: #e2e8f0;
    margin: 0 0 0.5rem 0;
  }
  
  .pdf-file-path {
    font-size: 0.875rem;
    color: #94a3b8;
  }
  
  .open-external-btn {
    background-color: rgba(139, 92, 246, 0.1);
    border-color: rgba(139, 92, 246, 0.3);
    color: #e2e8f0;
    
    &:hover {
      background-color: rgba(139, 92, 246, 0.2);
      border-color: rgba(139, 92, 246, 0.5);
    }
  }
}

.pdf-preview-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(51, 65, 85, 0.3);
  border-radius: 12px;
  padding: 1rem;
  overflow: hidden;
}

.pdf-viewer {
  width: 100%;
  height: 100%;
  min-height: 600px;
  border: none;
  border-radius: 8px;
  background-color: #ffffff;
}

.pdf-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 1rem;
  min-height: 400px;
}
</style>
