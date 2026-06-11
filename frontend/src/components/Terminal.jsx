import { useEffect, useRef, useState, useCallback } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { io } from 'socket.io-client'

export default function Terminal({ sandboxId }) {
  const containerRef = useRef(null)
  const termRef = useRef(null)
  const fitAddonRef = useRef(null)
  const socketRef = useRef(null)
  const animationInterval = useRef(null)
  const [connected, setConnected] = useState(false)

  const initTerminal = useCallback(() => {
    if (!containerRef.current || termRef.current) return

    const term = new XTerm({
      theme: {
        background: '#1A1A1A',
        foreground: '#E0E0E0',
        cursor: '#DA7756',
        cursorAccent: '#1A1A1A',
        selectionBackground: 'rgba(218,119,86,0.25)',
        black: '#3B3B3B',
        red: '#E06C75',
        green: '#98C379',
        yellow: '#E5C07B',
        blue: '#61AFEF',
        magenta: '#C678DD',
        cyan: '#56B6C2',
        white: '#ABB2BF',
        brightBlack: '#5C6370',
        brightRed: '#E06C75',
        brightGreen: '#98C379',
        brightYellow: '#E5C07B',
        brightBlue: '#61AFEF',
        brightMagenta: '#C678DD',
        brightCyan: '#56B6C2',
        brightWhite: '#FFFFFF',
      },
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
      fontSize: 13,
      lineHeight: 1.6,
      letterSpacing: 0.5,
      cursorBlink: true,
      cursorStyle: 'bar',
      cursorWidth: 2,
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
        term.write(`\r\x1b[K\x1b[38;2;218;119;86m⟳ Connecting${dotStr}\x1b[0m`);
        dots++;
      };

      if (animationInterval.current) clearInterval(animationInterval.current);
      animationInterval.current = setInterval(animateConnecting, 400);

      socket.on('connect', () => {
        if (animationInterval.current) clearInterval(animationInterval.current);
        setConnected(true)
        term.write('\r\x1b[K\x1b[38;2;152;195;121m● Connected\x1b[0m\r\n\n')
        socket.emit('terminal-input', '\r')
      })

      socket.on('disconnect', () => {
        setConnected(false)
        term.writeln('\r\n\x1b[38;2;218;119;86m⚠ Disconnected. Reconnecting...\x1b[0m')
        if (animationInterval.current) clearInterval(animationInterval.current);
        animationInterval.current = setInterval(animateConnecting, 400);
      })

      socket.on('connect_error', () => {
        setConnected(false)
      })

      socket.on('terminal-output', (data) => {
        term.write(data)
      })

      term.onData((data) => {
        socket.emit('terminal-input', data)
      })

    } catch (err) {
      console.error('Terminal connection error:', err)
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
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#1A1A1A' }}>
      <div ref={containerRef} className="flex-1 overflow-hidden" style={{ padding: '8px 12px' }} />
    </div>
  )
}
