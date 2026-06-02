import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PanelLeftClose, PanelLeft, Download, LogOut, TerminalSquare, User, Zap, X, ChevronDown, ChevronUp, FolderOpen } from 'lucide-react'
import FileExplorer from './FileExplorer'

export default function Sidebar({
  sandboxId,
  agentBase,
  activeFile,
  onFileSelect,
  fileRefreshKey,
  onDownloadZip,
  onCloseProject,
  onLogout,
  onToggleTerminal,
  isSidebarOpen,
  onToggleSidebar
}) {
  const [accountOpen, setAccountOpen] = useState(false)
  const [userName, setUserName] = useState('User')

  // Fetch user name from auth
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          if (data.name) setUserName(data.name)
        }
      } catch (e) {
        // Silently fail — will show default "User"
      }
    }
    fetchUser()
  }, [])

  const collapsedWidth = 48

  return (
    <motion.aside
      initial={{ width: 260 }}
      animate={{ width: isSidebarOpen ? 260 : collapsedWidth }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="h-full flex flex-col shrink-0 overflow-hidden"
      style={{
        background: '#1D1D1D',
        borderRight: '1px solid rgba(255,255,255,0.04)'
      }}
    >
      {/* Collapsed state — narrow icon strip like Claude */}
      {!isSidebarOpen && (
        <div className="flex flex-col items-center py-3 gap-2 h-full">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors cursor-pointer"
            title="Open sidebar"
          >
            <PanelLeft size={18} />
          </button>
          <button
            onClick={() => { onToggleSidebar(); }}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors cursor-pointer"
            title="File Explorer"
          >
            <FolderOpen size={18} />
          </button>
          <div className="flex-1" />
          <button
            onClick={onDownloadZip}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors cursor-pointer"
            title="Download ZIP"
          >
            <Download size={18} />
          </button>
          <button
            onClick={onToggleTerminal}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors cursor-pointer"
            title="Toggle Terminal"
          >
            <TerminalSquare size={18} />
          </button>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold cursor-pointer hover:ring-2 hover:ring-white/10 transition-all"
            style={{ background: 'var(--accent)', color: 'white' }}
            title={userName}
            onClick={onToggleSidebar}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* Expanded state */}
      {isSidebarOpen && (
        <>
          {/* Top: Title & Toggle */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Sandbox IDE</span>
            <button onClick={onToggleSidebar} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors cursor-pointer">
              <PanelLeftClose size={16} />
            </button>
          </div>

          {/* File Explorer */}
          <div className="flex-1 overflow-y-auto px-1 scrollbar-thin">
            <FileExplorer
              agentBase={agentBase}
              activeFile={activeFile}
              onFileSelect={onFileSelect}
              refreshKey={fileRefreshKey}
            />
          </div>

          {/* Bottom Actions */}
          <div className="px-3 py-3 flex flex-col gap-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <button onClick={onToggleTerminal} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-[13px] text-gray-400 hover:text-gray-200 cursor-pointer">
              <TerminalSquare size={15} style={{ color: 'var(--accent)' }} />
              <span>Toggle Terminal</span>
            </button>

            <button onClick={onDownloadZip} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-[13px] text-gray-400 hover:text-gray-200 cursor-pointer">
              <Download size={15} />
              <span>Download ZIP</span>
            </button>

            {/* Account Toggle */}
            <div className="mt-1 rounded-xl flex flex-col overflow-hidden">
              <button 
                onClick={() => setAccountOpen(!accountOpen)}
                className="flex items-center justify-between p-2.5 cursor-pointer w-full text-left outline-none hover:bg-white/5 transition-colors rounded-lg"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                    style={{ background: 'var(--accent)', color: 'white' }}
                  >
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{userName}</span>
                    <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      <Zap size={9} style={{ color: 'var(--accent)' }} /> Free Tier
                    </span>
                  </div>
                </div>
                {accountOpen ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
              </button>
              
              <AnimatePresence>
                {accountOpen && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="px-1 pb-1 flex flex-col gap-0.5">
                      <button onClick={onCloseProject} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-[12px] text-gray-400 hover:text-gray-200 cursor-pointer text-left w-full">
                        <X size={14} />
                        Close Project
                      </button>
                      <button onClick={onLogout} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-[12px] text-red-400 hover:text-red-300 cursor-pointer text-left w-full">
                        <LogOut size={14} />
                        Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </>
      )}
    </motion.aside>
  )
}
