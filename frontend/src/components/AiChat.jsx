import { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, Send, FileCode, CheckCircle2, ArrowUp, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map(i => (
        <div key={i} className="w-1.5 h-1.5 rounded-full"
          style={{
            background: 'var(--accent)',
            animation: 'typing-dot 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`
          }} />
      ))}
    </div>
  )
}

function ActivityLog({ lines }) {
  if (!lines.length) return null
  return (
    <div className="mt-2 rounded-xl overflow-hidden border" style={{ background: 'rgba(0,0,0,0.15)', borderColor: 'rgba(255,255,255,0.04)' }}>
      {lines.map((line, i) => (
        <div key={i} className="flex items-start gap-2 px-3 py-1.5"
          style={{ borderBottom: i < lines.length - 1 ? '1px solid rgba(255,255,255,0.02)' : 'none' }}>
          <span className="text-xs shrink-0 mt-0.5 text-gray-500">
            {line.type === 'reading' ? <FileCode size={12} /> : line.type === 'updating' ? <FileCode size={12} className="text-blue-400" /> : line.type === 'success' ? <CheckCircle2 size={12} className="text-green-500" /> : '💬'}
          </span>
          <span className="text-xs font-mono break-all text-gray-400">{line.text}</span>
        </div>
      ))}
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-4 animate-fadeIn w-full ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center shadow-sm" style={{ background: 'var(--accent)', color: 'white' }}>
          <Sparkles size={16} />
        </div>
      )}
      <div className={`max-w-[85%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-3 rounded-2xl text-[14px] leading-relaxed ${isUser ? 'text-white' : 'text-gray-200 w-full'}`}
          style={{
            background: isUser ? '#2C2C2A' : 'transparent',
            border: isUser ? '1px solid rgba(255,255,255,0.06)' : 'none'
          }}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap">{msg.content}</div>
          ) : (
            <div className="markdown-body prose prose-invert max-w-none text-gray-200">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  code({node, inline, className, children, ...props}) {
                    return !inline ? (
                      <pre className="bg-black/30 p-3 rounded-lg my-2 overflow-x-auto text-xs font-mono border border-white/5">
                        <code {...props} className={className}>
                          {children}
                        </code>
                      </pre>
                    ) : (
                      <code className="bg-black/30 px-1.5 py-0.5 rounded text-[13px] text-gray-300 font-mono" {...props}>
                        {children}
                      </code>
                    )
                  },
                  p: ({children}) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                  ul: ({children}) => <ul className="list-disc pl-4 mb-3 space-y-1">{children}</ul>,
                  ol: ({children}) => <ol className="list-decimal pl-4 mb-3 space-y-1">{children}</ol>,
                  li: ({children}) => <li className="leading-relaxed">{children}</li>,
                  h3: ({children}) => <h3 className="text-white font-semibold mt-4 mb-2">{children}</h3>,
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        {msg.activity && msg.activity.length > 0 && (
          <ActivityLog lines={msg.activity} />
        )}
      </div>
    </div>
  )
}

function parseActivityLine(line) {
  if (!line.trim()) return null
  if (line.startsWith('Reading files')) return { type: 'reading', text: line }
  if (line.startsWith('Updating files')) return { type: 'updating', text: line }
  if (line.toLowerCase().includes('success')) return { type: 'success', text: line }
  return { type: 'info', text: line }
}

export default function AiChat({ sandboxId, onFilesChanged, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I can modify your sandbox project. Describe what you want to build or change, and I\'ll update the code for you.',
      activity: [],
      time: Date.now()
    }
  ])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming || !sandboxId) return

    setInput('')
    setStreaming(true)

    const userMsg = { role: 'user', content: text, activity: [], time: Date.now() }
    setMessages(prev => [...prev, userMsg])

    const aiMsgId = Date.now() + 1
    setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', content: '', activity: [], time: Date.now(), pending: true }])

    let aiContent = ''
    let activityLines = []

    const history = messages
      .filter(m => m.role !== 'system' && !m.pending && m.content)
      .map(m => ({ role: m.role, content: m.content }))
    history.push({ role: 'user', content: text })

    try {
      const response = await fetch('/api/ai/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: text, messages: history, projectId: sandboxId })
      })

      if (!response.ok) throw new Error(`Server error: ${response.status}`)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const updateMsg = () => {
        setMessages(prev => prev.map(m =>
          m.id === aiMsgId
            ? { ...m, content: aiContent || '…', activity: [...activityLines], pending: !aiContent }
            : m
        ))
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.trim()) continue
          const parsed = parseActivityLine(line)
          if (parsed) {
            activityLines = [...activityLines, parsed]
            if (parsed.type === 'info' && line.length > 30) {
              aiContent = line
            }
          }
          updateMsg()
        }
      }

      if (!aiContent) {
        const updates = activityLines.filter(l => l.type === 'success')
        aiContent = updates.length
          ? 'Done! Files have been updated successfully.'
          : 'Changes applied to your project.'
      }

      setMessages(prev => prev.map(m =>
        m.id === aiMsgId
          ? { ...m, content: aiContent, activity: activityLines, pending: false }
          : m
      ))
      onFilesChanged?.()
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === aiMsgId
          ? { ...m, content: `Error: ${err.message}`, activity: activityLines, pending: false }
          : m
      ))
    } finally {
      setStreaming(false)
    }
  }, [input, streaming, sandboxId, onFilesChanged])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#1F1F1D' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2">
          <Sparkles size={16} style={{ color: 'var(--accent)' }} />
          <h2 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>AI Assistant</h2>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-6 scrollbar-thin">
        {messages.map((msg, i) => (
          <div key={msg.id || i}>
            {msg.pending && !msg.content ? (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center" style={{ background: 'var(--accent)', color: 'white' }}>
                  <Sparkles size={14} />
                </div>
                <div className="rounded-xl overflow-hidden bg-transparent">
                  <TypingIndicator />
                  {msg.activity && msg.activity.length > 0 && <ActivityLog lines={msg.activity} />}
                </div>
              </div>
            ) : (
              <Message msg={msg} />
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 p-4">
        <div className="flex flex-col rounded-2xl p-2 transition-colors focus-within:border-white/15"
          style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={sandboxId ? 'How can I help you?' : 'Create a sandbox first...'}
            disabled={!sandboxId || streaming}
            rows={1}
            className="w-full resize-none text-[14px] outline-none bg-transparent px-3 py-2 placeholder-gray-500"
            style={{
              maxHeight: '160px',
              lineHeight: '1.5',
              color: 'var(--text-primary)'
            }}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
            }}
          />
          <div className="flex justify-end items-center px-2 pt-1 pb-1">
            <button
              onClick={sendMessage}
              disabled={!input.trim() || !sandboxId || streaming}
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-30"
              style={{
                background: input.trim() ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                color: input.trim() ? 'white' : 'var(--text-muted)'
              }}
            >
              <ArrowUp size={16} strokeWidth={3} className={streaming ? 'animate-pulse' : ''} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
