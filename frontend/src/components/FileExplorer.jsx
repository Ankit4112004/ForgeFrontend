import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, Folder, FolderOpen, FileCode, FileJson, FileText, Image, File as FileIcon, Shield, Code, Settings } from 'lucide-react'

const getIcon = (filename, isOpen = false) => {
  const ext = filename.split('.').pop().toLowerCase()
  if (filename.includes('.')) {
    switch (ext) {
      case 'jsx': case 'js': case 'ts': case 'tsx': return <Code size={14} className="text-yellow-400" />
      case 'json': return <FileJson size={14} className="text-green-400" />
      case 'css': return <FileCode size={14} className="text-blue-400" />
      case 'html': return <FileCode size={14} className="text-orange-400" />
      case 'md': return <FileText size={14} className="text-gray-300" />
      case 'png': case 'jpg': case 'jpeg': case 'svg': return <Image size={14} className="text-purple-400" />
      case 'env': return <Shield size={14} className="text-red-400" />
      case 'gitignore': return <Settings size={14} className="text-gray-400" />
      default: return <FileIcon size={14} className="text-gray-400" />
    }
  }
  return isOpen ? <FolderOpen size={14} className="text-blue-400" /> : <Folder size={14} className="text-blue-400" />
}

function buildTree(files) {
  const root = {}
  files.forEach(path => {
    const parts = path.split('/')
    let node = root
    parts.forEach((part, i) => {
      if (!node[part]) node[part] = i === parts.length - 1 ? null : {}
      if (i < parts.length - 1) node = node[part]
    })
  })
  return root
}

function TreeNode({ name, node, depth, agentBase, activeFile, onFileSelect, path }) {
  const [open, setOpen] = useState(depth < 2)
  const isDir = node !== null && typeof node === 'object'
  const fullPath = path ? `${path}/${name}` : name
  const isActive = activeFile === fullPath

  if (isDir) {
    return (
      <div className="select-none">
        <motion.button 
          whileHover={{ x: 2, backgroundColor: 'rgba(255,255,255,0.05)' }}
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 w-full text-left py-1 rounded-md transition-colors duration-200 cursor-pointer text-gray-400 hover:text-gray-200"
          style={{ paddingLeft: `${8 + depth * 12}px`, fontSize: '13px' }}>
          <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.15 }}>
            <ChevronRight size={14} />
          </motion.div>
          {getIcon(name, open)}
          <span className="truncate">{name}</span>
        </motion.button>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.2 }}>
            {Object.entries(node).sort(([, a], [, b]) => {
              const aDir = a !== null && typeof a === 'object'
              const bDir = b !== null && typeof b === 'object'
              return bDir - aDir
            }).map(([childName, childNode]) => (
              <TreeNode key={childName} name={childName} node={childNode}
                depth={depth + 1} agentBase={agentBase} activeFile={activeFile}
                onFileSelect={onFileSelect} path={fullPath} />
            ))}
          </motion.div>
        )}
      </div>
    )
  }

  return (
    <motion.button 
      whileHover={{ x: 2, backgroundColor: isActive ? 'var(--accent-glow)' : 'rgba(255,255,255,0.04)' }}
      onClick={() => onFileSelect(fullPath)}
      className="flex items-center gap-1.5 w-full text-left py-1 rounded-md transition-colors duration-200 cursor-pointer select-none"
      style={{
        paddingLeft: `${8 + depth * 12}px`,
        fontSize: '13px',
        color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
        background: isActive ? 'var(--accent-glow)' : 'transparent',
      }}>
      {getIcon(name)}
      <span className="truncate">{name}</span>
    </motion.button>
  )
}

export default function FileExplorer({ agentBase, activeFile, onFileSelect, refreshKey }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tree, setTree] = useState({})

  const fetchFiles = useCallback(() => {
    if (!agentBase) return
    let isCancelled = false
    setLoading(true)
    setError(null)
    
    const poll = async () => {
      try {
        const res = await fetch(`${agentBase}/list-files`)
        if (!res.ok) throw new Error('Not ready')
        const data = await res.json()
        if (isCancelled) return
        setFiles(data.files || [])
        setTree(buildTree(data.files || []))
        setLoading(false)
      } catch (err) {
        if (!isCancelled) setTimeout(poll, 1500)
      }
    }
    
    poll()
    return () => { isCancelled = true }
  }, [agentBase])

  useEffect(() => { 
    const cancel = fetchFiles()
    return () => { if (cancel) cancel() }
  }, [fetchFiles, refreshKey])

  return (
    <aside className="flex flex-col h-full w-full">
      
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0 border-b"
        style={{ borderColor: 'var(--border)' }}>
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Explorer
        </span>
        <button onClick={fetchFiles} className="p-1 rounded transition-colors cursor-pointer text-gray-500 hover:text-gray-300"
          title="Refresh">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto py-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center pt-20 gap-4 opacity-80">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 rounded-md border animate-ping opacity-20" style={{ borderColor: 'var(--accent)' }} />
              <div className="absolute inset-1 rounded border animate-pulse opacity-50" style={{ borderColor: 'var(--accent)' }} />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" className="animate-bounce">
                <path d="M2 12h4l2-3 4 6 2-3h4" />
              </svg>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest animate-pulse" style={{ color: 'var(--accent)' }}>
              Mounting Vol...
            </span>
          </div>
        ) : error ? (
          <div className="px-3 py-4 text-xs" style={{ color: '#ef4444' }}>{error}</div>
        ) : (
          Object.entries(tree).sort(([, a], [, b]) => {
            const aDir = a !== null && typeof a === 'object'
            const bDir = b !== null && typeof b === 'object'
            return bDir - aDir
          }).map(([name, node]) => (
            <TreeNode key={name} name={name} node={node}
              depth={0} agentBase={agentBase} activeFile={activeFile}
              onFileSelect={onFileSelect} path="" />
          ))
        )}
      </div>

      {/* Footer — file count */}
      {!loading && files.length > 0 && (
        <div className="px-3 py-1.5 shrink-0 border-t" style={{ borderColor: 'var(--border)' }}>
          <span className="text-xs text-gray-500">{files.length} files</span>
        </div>
      )}
    </aside>
  )
}
