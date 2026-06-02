import { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'

const LANGUAGE_MAP = {
  js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  css: 'css', html: 'html', json: 'json', md: 'markdown',
  py: 'python', sh: 'bash', yml: 'yaml', yaml: 'yaml',
}

function getLanguage(filename) {
  const ext = filename.split('.').pop()?.toLowerCase()
  return LANGUAGE_MAP[ext] || 'plaintext'
}

export default function FileViewer({ agentBase, filePath }) {
  const [content, setContent] = useState(null)
  const [editedContent, setEditedContent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!agentBase || !filePath) return
    const fetchFile = async () => {
      setLoading(true)
      setError(null)
      setContent(null)
      setEditedContent(null)
      try {
        const res = await fetch(`${agentBase}/read-files?files=${encodeURIComponent(filePath)}`)
        const data = await res.json()
        const fileData = data.files?.[0]
        if (fileData) {
          const fileContent = Object.values(fileData)[0]
          setContent(fileContent)
          setEditedContent(fileContent)
        } else {
          setError('File not found or empty')
        }
      } catch (err) {
        setError('Failed to load file')
      } finally {
        setLoading(false)
      }
    }
    fetchFile()
  }, [agentBase, filePath])

  const handleSave = async () => {
    if (!agentBase || !filePath || content === editedContent) return
    setSaving(true)
    try {
      const res = await fetch(`${agentBase}/update-files`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [{ file: filePath, content: editedContent }]
        })
      })
      if (res.ok) {
        setContent(editedContent)
      }
    } catch (err) {
      console.error('Save failed', err)
    } finally {
      setSaving(false)
    }
  }

  if (!filePath) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3"
        style={{ color: 'var(--text-muted)' }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <p className="text-sm">Select a file from the explorer</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full pt-[52px]" style={{ background: '#1A1A1A' }}>
      {/* File tab bar */}
      <div className="flex items-center justify-between px-4 shrink-0"
        style={{ height: '38px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            {filePath.split('/').pop()}
          </span>
          {editedContent !== null && content !== editedContent && (
             <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} title="Unsaved changes"></span>
          )}
          <span className="text-[11px] px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
            {getLanguage(filePath)}
          </span>
        </div>
        {editedContent !== null && content !== editedContent && (
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer btn-claude"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto relative" style={{ background: '#1A1A1A' }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}
        {error && (
          <div className="p-6 text-sm" style={{ color: 'var(--error)' }}>{error}</div>
        )}
        {content !== null && !loading && (
          <Editor
            height="100%"
            theme="vs-dark"
            path={filePath}
            defaultLanguage={getLanguage(filePath)}
            value={editedContent}
            onChange={(val) => setEditedContent(val || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              wordWrap: 'on',
              padding: { top: 16 },
              lineNumbers: 'on',
              renderLineHighlight: 'line',
              scrollBeyondLastLine: false,
            }}
          />
        )}
      </div>
    </div>
  )
}
