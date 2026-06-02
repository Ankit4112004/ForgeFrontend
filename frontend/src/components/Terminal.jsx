import { useEffect, useRef, useState, useCallback } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { io } from 'socket.io-client'
import { TerminalSquare, RefreshCw } from 'lucide-react'

export default function Terminal({ sandboxId }) {
  const containerRef = useRef(null)
  const termRef = useRef(null)
  const fitAddonRef = useRef(null)
  const socketRef = useRef(null)
  const animationInterval = useRef(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)

  const initTerminal = useCallback(() => {
    if (!containerRef.current || termRef.current) return

    const term = new XTerm({
      theme: {
        background: '#0d1117', // Warp dark background
        foreground: '#e6edf3',
        cursor: '#f97316', // Orange cursor
        cursorAccent: '#0d1117',
        selectionBackground: 'rgba(249,115,22,0.3)',
        black: '#484f58',
        red: '#ff7b72',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#b1bac4',
        brightBlack: '#6e7681',
        brightRed: '#ffa198',
        brightGreen: '#56d364',
        brightYellow: '#e3b341',
        brightBlue: '#79c0ff',
        brightMagenta: '#d2a8ff',
        brightCyan: '#56d4dd',
        brightWhite: '#ffffff',
      },
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
      fontSize: 13,
      lineHeight: 1.5,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 5000,
      allowProposedApi: true,
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)
    term.open(containerRef.current)
    fitAddon.fit()

    termRef.current = term
    fitAddonRef.current = fitAddon

    // Warp-style welcome block
    term.writeln('\x1b[38;2;249;115;22m╭──────────────────────────────────────────╮\x1b[0m')
    term.writeln('\x1b[38;2;249;115;22m│\x1b[0m \x1b[1m\x1b[38;2;255;255;255mSandbox IDE Terminal\x1b[0m                     \x1b[38;2;249;115;22m│\x1b[0m')
    term.writeln('\x1b[38;2;249;115;22m│\x1b[0m \x1b[90mPowered by AI • Isolated Runtime\x1b[0m         \x1b[38;2;249;115;22m│\x1b[0m')
    term.writeln('\x1b[38;2;249;115;22m╰──────────────────────────────────────────╯\x1b[0m')
    term.writeln('')

    return term
  }, [])

  const connectSocket = useCallback((term) => {
    if (!sandboxId || !term) return

    const agentHost = `http://${sandboxId}.agent.localhost:8080`

    try {
      const socket = io(agentHost, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })

      socketRef.current = socket

      let dots = 0;
      const animateConnecting = () => {
        const dotStr = '.'.repeat(dots % 4);
        term.write(`\r\x1b[K\x1b[33mConnecting to sandbox${dotStr}\x1b[0m`);
        dots++;
      };

      if (animationInterval.current) clearInterval(animationInterval.current);
      animationInterval.current = setInterval(animateConnecting, 400);

      socket.on('connect', () => {
        if (animationInterval.current) clearInterval(animationInterval.current);
        setConnected(true)
        setError(null)
        term.write('\r\x1b[K\x1b[32m✓ Connected to sandbox shell\x1b[0m\r\n\n')
        socket.emit('terminal-input', '\r')
      })

      socket.on('disconnect', () => {
        setConnected(false)
        term.writeln('\r\n\x1b[33m⚠ Disconnected. Reconnecting...\x1b[0m')
        if (animationInterval.current) clearInterval(animationInterval.current);
        animationInterval.current = setInterval(animateConnecting, 400);
      })

      socket.on('connect_error', (err) => {
        setConnected(false)
        setError('Connection failed')
      })

      socket.on('terminal-output', (data) => {
        term.write(data)
      })

      term.onData((data) => {
        socket.emit('terminal-input', data)
      })

    } catch (err) {
      setError(err.message)
    }
  }, [sandboxId])

  useEffect(() => {
    const term = initTerminal()
    if (term) connectSocket(term)

    return () => {
      if (animationInterval.current) clearInterval(animationInterval.current)
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null }
      if (termRef.current) { termRef.current.dispose(); termRef.current = null }
    }
  }, [initTerminal, connectSocket])

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (fitAddonRef.current) {
        try { fitAddonRef.current.fit() } catch (_) {}
      }
    })
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="flex flex-col h-full rounded-b-xl overflow-hidden bg-[#0d1117]">
      {/* Warp-style tab bar */}
      <div className="flex items-center justify-between px-3 py-1.5 shrink-0 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <TerminalSquare size={14} className="text-gray-400" />
          <span className="text-xs font-medium text-gray-300">Terminal</span>
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <span className="text-xs text-red-400">{error}</span>
          )}
          <div className="flex items-center gap-1.5 bg-black/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider" style={{ color: connected ? '#10b981' : '#f59e0b' }}>
            {connected ? 'Connected' : 'Connecting'}
            {!connected && <RefreshCw size={10} className="animate-spin" />}
          </div>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-hidden p-1" />
    </div>
  )
}
