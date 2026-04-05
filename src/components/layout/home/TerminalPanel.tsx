import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import {
  createTerminalSession,
  writeToTerminal,
  resizeTerminal,
  closeTerminalSession,
  onTerminalData,
  onTerminalClose,
  removeTerminalListeners,
} from '@/lib/ipc'
import '@xterm/xterm/css/xterm.css'
import './TerminalPanel.css'

interface TerminalPanelProps {
  workspacePath: string
}

export default function TerminalPanel({ workspacePath }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        selectionBackground: '#264f78',
      },
      scrollback: 10000,
      convertEol: false,
      allowTransparency: false,
      allowProposedApi: true,
    })

    const fitAddon = new FitAddon()
    const unicode11Addon = new Unicode11Addon()

    terminal.loadAddon(fitAddon)
    terminal.loadAddon(unicode11Addon)
    terminal.unicode.activeVersion = '11'

    terminal.open(containerRef.current)
    fitAddon.fit()

    let sessionId: string | null = null

    // Propagate PTY resize whenever xterm cols/rows change (triggered by fitAddon.fit)
    terminal.onResize(({ cols, rows }) => {
      if (sessionId) {
        resizeTerminal(sessionId, cols, rows)
      }
    })

    createTerminalSession(workspacePath).then((id) => {
      sessionId = id

      onTerminalData(id, (data: string) => {
        // Detect whether terminal currently holds focus before writing
        const hadFocus = document.activeElement === terminal.textarea
        terminal.write(data)
        terminal.scrollToBottom()
        // Restore focus so commands like `clear` don't steal it away
        if (hadFocus) {
          terminal.focus()
        }
      })

      onTerminalClose(id, () => {
        terminal.write('\r\n[Process exited]\r\n')
        terminal.scrollToBottom()
      })

      terminal.onData((input) => {
        writeToTerminal(id, input)
      })

      terminal.focus()
    })

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      if (sessionId) {
        removeTerminalListeners(sessionId)
        closeTerminalSession(sessionId)
      }
      terminal.dispose()
    }
  }, [workspacePath])

  return (
    <div className="terminal-panel">
      <div ref={containerRef} className="terminal-container" />
    </div>
  )
}
