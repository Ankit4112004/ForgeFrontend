import { motion } from 'framer-motion'
import { PanelLeft, Save, RefreshCw, MoreHorizontal, ExternalLink } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export default function Header({
  activeTab,
  onTabChange,
  isSidebarOpen,
  onToggleSidebar,
  status,
  onRefreshPreview,
  previewUrl
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="flex items-center justify-between px-4 py-2 shrink-0"
      style={{ zIndex: 10, background: 'transparent' }}>
      
      {/* Left: Sidebar Toggle */}
      <div className="flex items-center gap-3">
        {!isSidebarOpen && (
          <button onClick={onToggleSidebar} className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-white/5">
            <PanelLeft size={18} />
          </button>
        )}
      </div>

      {/* Center: Liquid Glass Pill Toggle for Preview/Code */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 pill-toggle">
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

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Refresh */}
        <button
          onClick={onRefreshPreview}
          className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-white/5"
          title="Refresh preview"
        >
          <RefreshCw size={16} />
        </button>

        {/* Three-dot menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-white/5"
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="absolute right-0 mt-2 w-48 rounded-xl border py-1 z-50"
              style={{
                background: '#2C2C2A',
                borderColor: 'rgba(255,255,255,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
              }}
            >
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => setMenuOpen(false)}
                >
                  <ExternalLink size={14} />
                  Open in new tab
                </a>
              )}
            </motion.div>
          )}
        </div>

        {/* Save Button */}
        <button className="flex items-center gap-2 btn-claude text-sm">
          <Save size={15} />
          Save
        </button>
      </div>
    </header>
  )
}
