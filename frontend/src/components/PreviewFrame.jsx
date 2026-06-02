import { useRef, useState, useEffect } from 'react'

export default function PreviewFrame({ previewUrl, onRefresh }) {
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

  // Expose refresh via prop
  useEffect(() => {
    if (onRefresh) {
      // Store the refresh handler so parent can call it
      onRefresh.current = () => setRefreshKey(k => k + 1)
    }
  }, [onRefresh])

  const handleRefresh = () => {
    setRefreshKey(k => k + 1)
  }

  return (
    <div className="flex flex-col h-full w-full" style={{ background: '#1F1F1D' }}>
      {/* iFrame or Loading */}
      <div className="flex-1 relative">
        {!isReady ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-[3px] border-transparent animate-spin" style={{ borderTopColor: 'var(--accent)' }} />
              <div className="absolute inset-2 rounded-full border-[3px] border-transparent animate-spin" style={{ borderBottomColor: 'var(--accent-dim)', animationDirection: 'reverse', animationDuration: '1.5s' }} />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-medium tracking-widest uppercase animate-pulse" style={{ color: 'var(--accent)' }}>
                Booting Dev Server
              </span>
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
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
