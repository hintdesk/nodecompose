import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { createTerminalSession, writeToTerminal, onTerminalData, onTerminalClose } from '@/lib/ipc'
import '@xterm/xterm/css/xterm.css'
import './TerminalPanel.css'

interface TerminalPanelProps {
  workspacePath: string
}

export default function TerminalPanel({ workspacePath }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [sessionActive, setSessionActive] = useState(false)

  useEffect(() => {
    initializeTerminal()
    return () => {
      cleanupTerminal()
    }
  }, [workspacePath])

  const initializeTerminal = async () => {
    if (!containerRef.current || initialized) return

    try {
      // Initialize xterm.js terminal
      const term = new Terminal({
        rows: 30,
        cols: 120,
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
        },
        fontFamily: '"Fira Code", "Source Code Pro", "Consolas", monospace',
        fontSize: 12,
        lineHeight: 1.5,
      })

      term.open(containerRef.current)
      terminalRef.current = term

      // Create terminal session
      const sessionId = await createTerminalSession(workspacePath)
      sessionIdRef.current = sessionId
      setSessionActive(true)

      // Write initial message
      term.writeln(`Terminal ready in: ${workspacePath}`)
      term.writeln('')

      // Handle terminal input
      term.onData((data) => {
        if (sessionIdRef.current) {
          writeToTerminal(sessionIdRef.current, data)
        }
      })

      // Handle terminal data from process
      onTerminalData(sessionId, (data: string) => {
        term.write(data)
      })

      // Handle terminal close
      onTerminalClose(sessionId, (code: number) => {
        term.writeln(`\n\nProcess exited with code ${code}`)
        setSessionActive(false)
      })

      setInitialized(true)
    } catch (error) {
      console.error('Error initializing terminal:', error)
      if (containerRef.current) {
        containerRef.current.innerHTML = `<div style="color: red; padding: 10px;">Failed to initialize terminal: ${(error as Error).message}</div>`
      }
    }
  }

  const cleanupTerminal = () => {
    if (terminalRef.current) {
      terminalRef.current.dispose()
      terminalRef.current = null
    }
    setInitialized(false)
  }

  return (
    <div className="terminal-panel flex flex-col">
      <div className="border-b px-4 py-2 text-sm font-semibold flex items-center justify-between">
        <span>Terminal</span>
        {sessionActive && (
          <span className="text-xs text-green-500 flex items-center gap-1">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
            Connected
          </span>
        )}
      </div>
      <div className="flex-1 overflow-hidden" ref={containerRef}></div>
    </div>
  )
}
