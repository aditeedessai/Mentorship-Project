import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Anti-cheating hook for quiz pages.
 *
 * Enforces fullscreen mode, focus/visibility monitoring, DevTools detection,
 * and clipboard restrictions.
 *
 * Focus/session-loss violations (fullscreen exit, tab switch, focus loss, DevTools):
 * - 1st violation: non-fatal warning banner displayed.
 * - 2nd violation: quiz terminated and user redirected.
 *
 * Clipboard restrictions (copy/cut/paste):
 * - Always non-fatal warning.
 *
 * @param {{ enabled: boolean, onTerminate: (reason: string) => void }} options
 */
export default function useQuizAntiCheating({ enabled = true, onTerminate } = {}) {
  // ── State ────────────────────────────────────────────────────────
  const [warnings, setWarnings] = useState([])
  const [isFullscreenReady, setIsFullscreenReady] = useState(false)
  const [quizTerminated, setQuizTerminated] = useState(false)

  // ── Refs ─────────────────────────────────────────────────────────
  const cleanedUpRef = useRef(false)
  const quizTerminatedRef = useRef(false)
  const lastFocusWarningRef = useRef(0)
  const focusViolationCountRef = useRef(0)
  const wasFullscreenEstablishedRef = useRef(false)
  const devToolsIntervalRef = useRef(null)
  const clipboardDismissTimerRef = useRef(null)
  const historyPushedRef = useRef(false)
  const fullscreenAttemptCountRef = useRef(0)
  const onTerminateRef = useRef(onTerminate)

  // Keep onTerminate ref current to avoid stale closures
  useEffect(() => {
    onTerminateRef.current = onTerminate
  }, [onTerminate])

  // ── Warning helpers ──────────────────────────────────────────────
  const addWarning = useCallback((type, title, message) => {
    setWarnings(prev => {
      if (prev.some(w => w.type === type)) return prev
      return [...prev, { type, title, message }]
    })
  }, [])

  const removeWarning = useCallback((type) => {
    setWarnings(prev => prev.filter(w => w.type !== type))
  }, [])

  // ── Centralized quiz termination ─────────────────────────────────
  const terminateQuiz = useCallback(() => {
    // Guard: only terminate once
    if (quizTerminatedRef.current || cleanedUpRef.current) return

    quizTerminatedRef.current = true
    cleanedUpRef.current = true
    setQuizTerminated(true)
    setWarnings([])

    // Clear timers
    if (devToolsIntervalRef.current) {
      clearInterval(devToolsIntervalRef.current)
      devToolsIntervalRef.current = null
    }
    if (clipboardDismissTimerRef.current) {
      clearTimeout(clipboardDismissTimerRef.current)
      clipboardDismissTimerRef.current = null
    }

    // Exit fullscreen
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    } catch {
      // ignore
    }

    // Navigate away
    if (onTerminateRef.current) {
      onTerminateRef.current()
    }
  }, [])

  // ── Handler for focus / visibility / fullscreen / DevTools violations
  const handleFocusLossViolation = useCallback(() => {
    if (cleanedUpRef.current || quizTerminatedRef.current) return

    // 300ms deduplication between visibilitychange and window blur
    const now = Date.now()
    if (now - lastFocusWarningRef.current < 300) return
    lastFocusWarningRef.current = now

    if (focusViolationCountRef.current === 0) {
      // 1st violation: Warning only
      focusViolationCountRef.current = 1
      addWarning(
        'focus_warning',
        'Warning',
        'Leaving the quiz window or exiting fullscreen may terminate your quiz.'
      )
    } else {
      // 2nd violation: Terminate quiz
      terminateQuiz()
    }
  }, [addWarning, terminateQuiz])

  // ── Cleanup for legitimate exits (Abort / Finish) ────────────────
  const cleanup = useCallback(() => {
    // Idempotent: safe to call multiple times
    cleanedUpRef.current = true

    if (devToolsIntervalRef.current) {
      clearInterval(devToolsIntervalRef.current)
      devToolsIntervalRef.current = null
    }
    if (clipboardDismissTimerRef.current) {
      clearTimeout(clipboardDismissTimerRef.current)
      clipboardDismissTimerRef.current = null
    }

    setWarnings([])

    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    } catch {
      // ignore
    }
  }, [])

  // ── Main effect: register all listeners ──────────────────────────
  useEffect(() => {
    if (!enabled) return

    // Reset state for this activation
    cleanedUpRef.current = false
    quizTerminatedRef.current = false
    focusViolationCountRef.current = 0
    wasFullscreenEstablishedRef.current = false
    fullscreenAttemptCountRef.current = 0

    // ────────────────────────────────────────────────────────────────
    // 1. FULLSCREEN ENFORCEMENT
    // ────────────────────────────────────────────────────────────────
    const handleFullscreenChange = () => {
      if (cleanedUpRef.current || quizTerminatedRef.current) return

      if (document.fullscreenElement) {
        setIsFullscreenReady(true)
        wasFullscreenEstablishedRef.current = true
      } else {
        setIsFullscreenReady(false)
        // Only trigger violation if fullscreen was actually established previously
        if (wasFullscreenEstablishedRef.current) {
          handleFocusLossViolation()
        }
      }
    }

    // Attempt fullscreen immediately on mount
    const attemptFullscreen = async () => {
      if (cleanedUpRef.current || quizTerminatedRef.current) return
      fullscreenAttemptCountRef.current += 1
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen()
        }
        setIsFullscreenReady(true)
        wasFullscreenEstablishedRef.current = true
      } catch {
        // Browser rejected — will retry on first user interaction
        setIsFullscreenReady(false)
      }
    }

    // Retry fullscreen on the first user gesture (click, pointer, or key)
    const handleFirstInteraction = async () => {
      if (cleanedUpRef.current || quizTerminatedRef.current) return
      if (document.fullscreenElement) {
        setIsFullscreenReady(true)
        wasFullscreenEstablishedRef.current = true
        removeInteractionListeners()
        return
      }

      fullscreenAttemptCountRef.current += 1
      try {
        await document.documentElement.requestFullscreen()
        setIsFullscreenReady(true)
        wasFullscreenEstablishedRef.current = true
        removeInteractionListeners()
      } catch {
        // If exhausted attempts, terminate
        if (fullscreenAttemptCountRef.current >= 3) {
          terminateQuiz()
        }
      }
    }

    const handleFirstInteractionKey = (e) => {
      // Ignore pure modifier presses
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return
      handleFirstInteraction()
    }

    const removeInteractionListeners = () => {
      document.removeEventListener('pointerdown', handleFirstInteraction)
      document.removeEventListener('keydown', handleFirstInteractionKey)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('pointerdown', handleFirstInteraction)
    document.addEventListener('keydown', handleFirstInteractionKey)
    attemptFullscreen()

    // ────────────────────────────────────────────────────────────────
    // 2. VISIBILITY MONITORING — tab switch
    // ────────────────────────────────────────────────────────────────
    const handleVisibilityChange = () => {
      if (cleanedUpRef.current || quizTerminatedRef.current) return
      if (document.visibilityState === 'hidden') {
        handleFocusLossViolation()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // ────────────────────────────────────────────────────────────────
    // 3. WINDOW FOCUS — blur
    // ────────────────────────────────────────────────────────────────
    const handleWindowBlur = () => {
      if (cleanedUpRef.current || quizTerminatedRef.current) return
      handleFocusLossViolation()
    }

    window.addEventListener('blur', handleWindowBlur)

    // ────────────────────────────────────────────────────────────────
    // 4. CLIPBOARD BLOCKING (non-fatal — block + brief warning)
    // ────────────────────────────────────────────────────────────────
    const handleClipboard = (e) => {
      if (cleanedUpRef.current) return
      e.preventDefault()

      addWarning(
        'clipboard',
        'Action Blocked',
        'Copy/cut/paste operations are not allowed during the quiz.'
      )

      if (clipboardDismissTimerRef.current) {
        clearTimeout(clipboardDismissTimerRef.current)
      }
      clipboardDismissTimerRef.current = setTimeout(() => {
        removeWarning('clipboard')
        clipboardDismissTimerRef.current = null
      }, 3000)
    }

    document.addEventListener('copy', handleClipboard)
    document.addEventListener('cut', handleClipboard)
    document.addEventListener('paste', handleClipboard)

    // ────────────────────────────────────────────────────────────────
    // 5. CONTEXT MENU BLOCKING
    // ────────────────────────────────────────────────────────────────
    const handleContextMenu = (e) => {
      if (cleanedUpRef.current) return
      e.preventDefault()
    }

    document.addEventListener('contextmenu', handleContextMenu)

    // ────────────────────────────────────────────────────────────────
    // 6. TEXT SELECTION BLOCKING (textareas/inputs exempted)
    // ────────────────────────────────────────────────────────────────
    const handleSelectStart = (e) => {
      if (cleanedUpRef.current) return
      const target = e.target
      if (
        target.closest('[data-ac-editable="true"]') ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'INPUT'
      ) {
        return
      }
      e.preventDefault()
    }

    document.addEventListener('selectstart', handleSelectStart)

    // ────────────────────────────────────────────────────────────────
    // 7. KEYBOARD SHORTCUT BLOCKING (Ctrl/Cmd + C/V/X)
    // ────────────────────────────────────────────────────────────────
    const handleKeyDown = (e) => {
      if (cleanedUpRef.current) return

      const isModifier = e.ctrlKey || e.metaKey
      if (!isModifier) return

      const key = e.key.toLowerCase()
      if (key === 'c' || key === 'v' || key === 'x') {
        e.preventDefault()

        addWarning(
          'clipboard',
          'Action Blocked',
          'Copy/cut/paste operations are not allowed during the quiz.'
        )

        if (clipboardDismissTimerRef.current) {
          clearTimeout(clipboardDismissTimerRef.current)
        }
        clipboardDismissTimerRef.current = setTimeout(() => {
          removeWarning('clipboard')
          clipboardDismissTimerRef.current = null
        }, 3000)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    // ────────────────────────────────────────────────────────────────
    // 8. DEVTOOLS DETECTION
    // ────────────────────────────────────────────────────────────────
    const DEVTOOLS_THRESHOLD = 160

    const checkDevTools = () => {
      if (cleanedUpRef.current || quizTerminatedRef.current) return

      const widthDiff = window.outerWidth - window.innerWidth
      const heightDiff = window.outerHeight - window.innerHeight

      if (widthDiff > DEVTOOLS_THRESHOLD || heightDiff > DEVTOOLS_THRESHOLD) {
        handleFocusLossViolation()
      }
    }

    devToolsIntervalRef.current = setInterval(checkDevTools, 3000)
    const initialDevToolsTimeout = setTimeout(checkDevTools, 1000)

    // ────────────────────────────────────────────────────────────────
    // 9. BACK NAVIGATION PROTECTION
    // ────────────────────────────────────────────────────────────────
    if (!historyPushedRef.current) {
      window.history.pushState({ quizActive: true }, '')
      historyPushedRef.current = true
    }

    const handlePopState = () => {
      if (cleanedUpRef.current) return
      window.history.pushState({ quizActive: true }, '')
    }

    window.addEventListener('popstate', handlePopState)

    // ────────────────────────────────────────────────────────────────
    // 10. BROWSER REFRESH / CLOSE WARNING
    // ────────────────────────────────────────────────────────────────
    const handleBeforeUnload = (e) => {
      if (cleanedUpRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    // ────────────────────────────────────────────────────────────────
    // EFFECT CLEANUP (runs on unmount or when enabled changes)
    // ────────────────────────────────────────────────────────────────
    return () => {
      cleanedUpRef.current = true

      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      removeInteractionListeners()

      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleWindowBlur)

      document.removeEventListener('copy', handleClipboard)
      document.removeEventListener('cut', handleClipboard)
      document.removeEventListener('paste', handleClipboard)

      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('selectstart', handleSelectStart)
      document.removeEventListener('keydown', handleKeyDown)

      if (devToolsIntervalRef.current) {
        clearInterval(devToolsIntervalRef.current)
        devToolsIntervalRef.current = null
      }
      clearTimeout(initialDevToolsTimeout)

      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('beforeunload', handleBeforeUnload)

      if (clipboardDismissTimerRef.current) {
        clearTimeout(clipboardDismissTimerRef.current)
        clipboardDismissTimerRef.current = null
      }

      historyPushedRef.current = false
    }
  }, [enabled, addWarning, removeWarning, handleFocusLossViolation, terminateQuiz])

  return {
    isFullscreenReady,
    quizTerminated,
    warnings,
    cleanup,
  }
}
