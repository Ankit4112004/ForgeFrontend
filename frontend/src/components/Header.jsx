import { motion } from 'framer-motion'
import { PanelLeft, Save, RefreshCw, ExternalLink, Sparkles, Box } from 'lucide-react'

export default function Header({
  activeTab,
  onTabChange,
  isSidebarOpen,
  onToggleSidebar,
  onRefreshPreview,
  previewUrl,
  isAiChatOpen,
  onToggleAiChat,
  projectTitle
}) {
  return (
    <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 pointer-events-none"
      style={{ zIndex: 20, background: 'transparent' }}>
      
      {/* Left: Project Name */}
      <div className="flex items-center gap-3 pointer-events-auto">
        {projectTitle && (
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-md text-sm font-semibold shadow-sm"
            style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
            <Box size={16} style={{ color: 'var(--accent)' }} />
            {projectTitle}
          </div>
        )}
      </div>

      {/* Center: Liquid Glass Pill Toggle for Preview/Code */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 pill-toggle pointer-events-auto p-1 rounded-full backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <button
          onClick={() => onTabChange('preview')}
          className="relative px-5 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer z-10"
          style={{ color: activeTab === 'preview' ? 'var(--text-primary)' : 'var(--text-muted)' }}
        >
          PREVIEW
          {activeTab === 'preview' && (
            <motion.div
              layoutId="pill-active"
              className="absolute inset-0 rounded-full -z-10"
              style={{ background: 'rgba(255,255,255,0.1)', boxShadow: '0 0 12px rgba(255,255,255,0.05)' }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
        </button>
        <button
          onClick={() => onTabChange('files')}
          className="relative px-5 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer z-10"
          style={{ color: activeTab === 'files' ? 'var(--text-primary)' : 'var(--text-muted)' }}
        >
          CODE
          {activeTab === 'files' && (
            <motion.div
              layoutId="pill-active"
              className="absolute inset-0 rounded-full -z-10"
              style={{ background: 'rgba(255,255,255,0.1)', boxShadow: '0 0 12px rgba(255,255,255,0.05)' }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
        </button>
      </div>

      {/* Right: Refresh, Open External, AI Chat Toggle */}
      <div className="flex items-center gap-1.5 pointer-events-auto backdrop-blur-md p-1 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <button
          onClick={onRefreshPreview}
          className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-white/5"
          title="Refresh preview"
        >
          <RefreshCw size={15} />
        </button>

        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-white/5"
            title="Open in new window"
          >
            <ExternalLink size={15} />
          </a>
        )}

        {!isAiChatOpen && (
          <button
            onClick={onToggleAiChat}
            className="text-gray-400 hover:text-[var(--accent)] transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-white/5"
            title="Open AI Assistant"
          >
            <Sparkles size={16} />
          </button>
        )}
      </div>
    </header>
  )
}
