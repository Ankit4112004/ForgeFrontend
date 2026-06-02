import { useRef, useState, useEffect } from 'react'

export default function PreviewFrame({ previewUrl }) {
  const iframeRef = useRef(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)

  // Poll the preview URL until it responds with a 200 OK
  useEffect(() => {
    let isCancelled = false
    setIsReady(false)
    setLoading(true)
    
    const checkReady = async () => {
      try {
        const res = await fetch(previewUrl)
        if (res.ok) {
          if (!isCancelled) {
            setIsReady(true)
            setLoading(false)
          }
          return
        }
      } catch (err) {}
      
      if (!isCancelled) setTimeout(checkReady, 1500)
    }
    
    checkReady()
    return () => { isCancelled = true }
  }, [previewUrl, refreshKey])

  const handleRefresh = () => {
    setRefreshKey(k => k + 1)
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 shrink-0"
        style={{ height: '36px', background: '#070b14', borderBottom: '1px solid #1e2d45' }}>
        
        {/* Traffic light dots */}
        <div className="flex items-center gap-1.5 mr-1">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ef4444', opacity: 0.7 }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#f59e0b', opacity: 0.7 }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#10b981', opacity: 0.7 }} />
        </div>

        {/* URL bar */}
        <div className="flex-1 flex items-center px-3 rounded"
          style={{
            background: '#0d1424',
            border: '1px solid #1e2d45',
            height: '24px'
          }}>
          {loading && (
            <div className="w-3 h-3 rounded-full border border-t-transparent mr-2 shrink-0"
              style={{ borderColor: '#22d3ee', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          )}
          <span className="text-xs truncate" style={{ color: '#475569', fontFamily: 'monospace' }}>
            {previewUrl}
          </span>
        </div>

        {/* Refresh */}
        <button onClick={handleRefresh}
          className="p-1 rounded transition-colors cursor-pointer"
          style={{ color: '#475569' }}
          onMouseEnter={e => e.currentTarget.style.color = '#22d3ee'}
          onMouseLeave={e => e.currentTarget.style.color = '#475569'}
          title="Refresh preview">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>

        {/* Open in new tab */}
        <a href={previewUrl} target="_blank" rel="noreferrer"
          className="p-1 rounded transition-colors cursor-pointer"
          style={{ color: '#475569' }}
          onMouseEnter={e => e.currentTarget.style.color = '#22d3ee'}
          onMouseLeave={e => e.currentTarget.style.color = '#475569'}
          title="Open in new tab">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
      </div>

      {/* iFrame or Loading */}
      <div className="flex-1 relative" style={{ background: '#070b14' }}>
        {!isReady ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-cyan-400 animate-spin" />
              <div className="absolute inset-2 rounded-full border-[3px] border-transparent border-b-emerald-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-medium tracking-widest text-cyan-400 uppercase animate-pulse">
                Booting Dev Server
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Establishing tunnel to {previewUrl.split('//')[1]}...
              </span>
            </div>
          </div>
        ) : (
          <iframe
            key={refreshKey}
            ref={iframeRef}
            src={previewUrl}
            className="w-full h-full border-0"
            style={{ background: '#fff' }}
            title="Sandbox Preview"
            onLoad={() => setLoading(false)}
          />
        )}
      </div>
    </div>
  )
}
