import { useState, useRef, useCallback } from 'react'
import SplashScreen from './components/SplashScreen'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import PreviewFrame from './components/PreviewFrame'
import FileViewer from './components/FileViewer'
import Terminal from './components/Terminal'
import AiChat from './components/AiChat'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { motion, AnimatePresence } from 'framer-motion'

export default function App() {
  // Sandbox state
  const [sandbox, setSandbox] = useState(null)
  const [status, setStatus] = useState('ready')

  // UI state
  const [activeTab, setActiveTab] = useState('preview')
  const [activeFile, setActiveFile] = useState(null)
  const [fileRefreshKey, setFileRefreshKey] = useState(0)
  
  // New Toggles
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isTerminalOpen, setIsTerminalOpen] = useState(false)

  const [isAiChatOpen, setIsAiChatOpen] = useState(true)

  // Terminal resize
  const [terminalHeight, setTerminalHeight] = useState(250)
  const isDragging = useRef(false)
  const dragStartY = useRef(0)
  const dragStartH = useRef(0)

  // Preview refresh
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0)

  const handleSandboxCreated = useCallback((data) => {
    const agentBase = `http://${data.sandboxId}.agent.${import.meta.env.VITE_PUBLIC_BASE_HOST || 'localhost:8080'}`
    setSandbox({ sandboxId: data.sandboxId, previewUrl: data.previewUrl, agentBase, title: data.title })
    setStatus('ready')
  }, [])

  const handleFilesChanged = useCallback(() => {
    // Refresh the file explorer with the new/changed files
    setFileRefreshKey(k => k + 1)
    // Reload the live preview iframe so the AI's result shows immediately
    setPreviewRefreshKey(k => k + 1)
    // Surface the result to the user without a manual tab switch
    setActiveTab('preview')
  }, [])

  const handleFileSelect = useCallback((path) => {
    setActiveFile(path)
    setActiveTab('files')
  }, [])

  const handleDragStart = (e) => {
    isDragging.current = true
    dragStartY.current = e.clientY
    dragStartH.current = terminalHeight

    const onMove = (ev) => {
      if (!isDragging.current) return
      const delta = dragStartY.current - ev.clientY
      const newH = Math.min(Math.max(dragStartH.current + delta, 100), 600)
      setTerminalHeight(newH)
    }
    const onUp = () => {
      isDragging.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const handleCloseProject = () => setSandbox(null)
  
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout')
      setSandbox(null)
    } catch (err) {
      console.error('Failed to logout', err)
    }
  }

  const handleDownloadZip = async () => {
    if (!sandbox) return
    setStatus('loading')
    try {
      const res = await fetch(`${sandbox.agentBase}/list-files`)
      const data = await res.json()
      const files = data.files || []
      const zip = new JSZip()
      const chunkSize = 10
      for (let i = 0; i < files.length; i += chunkSize) {
        const chunk = files.slice(i, i + chunkSize)
        const contentRes = await fetch(`${sandbox.agentBase}/read-files?files=${chunk.join(',')}`)
        const contentData = await contentRes.json()
        chunk.forEach(file => {
          const fileData = contentData.files.find(f => Object.keys(f)[0].endsWith(file))
          if (fileData) {
            zip.file(file, Object.values(fileData)[0])
          }
        })
      }
      const blob = await zip.generateAsync({ type: 'blob' })
      saveAs(blob, `project-${sandbox.sandboxId.slice(0, 8)}.zip`)
    } catch (err) {
      console.error('Failed to create ZIP', err)
      setStatus('error')
    } finally {
      setStatus('ready')
    }
  }

  if (!sandbox) {
    return <SplashScreen onSandboxCreated={handleSandboxCreated} />
  }

  const { sandboxId, previewUrl, agentBase, title } = sandbox

  return (
    <div className="flex h-full w-full overflow-hidden" style={{ background: '#1F1F1D', color: 'var(--text-primary)' }}>
      {/* Left Sidebar */}
      <Sidebar 
        sandboxId={sandboxId}
        agentBase={agentBase}
        activeFile={activeFile}
        onFileSelect={handleFileSelect}
        fileRefreshKey={fileRefreshKey}
        onDownloadZip={handleDownloadZip}
        onCloseProject={handleCloseProject}
        onLogout={handleLogout}
        onToggleTerminal={() => setIsTerminalOpen(o => !o)}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(o => !o)}
      />

      {/* Main Center Area */}
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <Header 
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(true)}
          onRefreshPreview={() => setPreviewRefreshKey(k => k + 1)}
          previewUrl={previewUrl}
          isAiChatOpen={isAiChatOpen}
          onToggleAiChat={() => setIsAiChatOpen(o => !o)}
          projectTitle={title}
        />

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden relative">
            {activeTab === 'preview' ? (
              <PreviewFrame key={previewRefreshKey} previewUrl={previewUrl} />
            ) : (
              <FileViewer agentBase={agentBase} filePath={activeFile} />
            )}
          </div>
        </div>

        {/* Togglable Terminal (Warp Style) */}
        <AnimatePresence>
          {isTerminalOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: terminalHeight, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="w-full flex flex-col shrink-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#1A1A1A' }}
            >
              <div
                className="shrink-0 flex items-center justify-center cursor-row-resize select-none hover:bg-white/5 transition-colors"
                style={{ height: '6px', zIndex: 10 }}
                onMouseDown={handleDragStart}
              >
                <div className="w-10 h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
              </div>
              <div className="flex-1 overflow-hidden">
                <Terminal sandboxId={sandboxId} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Sidebar: AI Chat */}
      <AnimatePresence>
        {isAiChatOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            className="shrink-0 overflow-hidden" 
            style={{ borderLeft: '1px solid rgba(255,255,255,0.04)' }}
          >
            <div style={{ width: '380px', height: '100%' }}>
              <AiChat sandboxId={sandboxId} onFilesChanged={handleFilesChanged} onClose={() => setIsAiChatOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
