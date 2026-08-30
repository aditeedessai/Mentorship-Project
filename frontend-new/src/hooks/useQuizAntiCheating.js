import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Anti-cheating hook for quiz pages.
 *
 * Enforces fullscreen mode, focus/visibility monitoring, DevTools detection,
 * and clipboard restrictions.
 *
 * Focus/session-loss violations (fullscreen exit, tab switch, focus loss, DevTools):
 * - 1st violation: Warning 1 of 2 displayed, quiz blocked until violation clears.
 * - 2nd violation: Warning 2 of 2 (final warning), quiz blocked until violation clears.
 * - 3rd violation: Quiz terminated immediately and user redirected.
 *
 * DevTools violations are "blocking" — the quiz stays blocked until DevTools is closed.
 * Non-DevTools violations are "transient" — the warning can be dismissed after acknowledgment.
 *
 * Clipboard restrictions (copy/cut/paste):
 * - Always non-fatal warning (does not increment warning count).
 *
 * @param {{ enabled: boolean, onTerminate: (reason: string) => void }} options
 */
export default function useQuizAntiCheating({ enabled = true, onTerminate } = {}) {
  // ── Constants ───────────────────────────────────────────────────
  const MAX_WARNINGS = 2

  // ── State ────────────────────────────────────────────────────────
  const [warnings, setWarnings] = useState([])
  const [isFullscreenReady, setIsFullscreenReady] = useState(false)
  const [quizTerminated, setQuizTerminated] = useState(false)

  // Warning system state
  const [warningCount, setWarningCount] = useState(0)
  const [activeViolation, setActiveViolation] = useState(null) // { reason, message, isBlocking }
  const [isViolationActive, setIsViolationActive] = useState(false)

  // ── Refs ─────────────────────────────────────────────────────────
  const cleanedUpRef = useRef(false)
  const quizTerminatedRef = useRef(false)
  const isTerminatingRef = useRef(false)
  const lastViolationTimeRef = useRef(0)
  const warningCountRef = useRef(0)
  const violationActiveRef = useRef(false)
  const wasFullscreenEstablishedRef = useRef(false)
  const devToolsIntervalRef = useRef(null)
  const clipboardDismissTimerRef = useRef(null)
  const historyPushedRef = useRef(false)
  const fullscreenAttemptCountRef = useRef(0)
  const onTerminateRef = useRef(onTerminate)

  // DevTools-specific refs
  const devToolsDetectedRef = useRef(false)
  const devToolsViolationActiveRef = useRef(false) // violation-session guard

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
    if (quizTerminatedRef.current || cleanedUpRef.current || isTerminatingRef.current) return

    isTerminatingRef.current = true
    quizTerminatedRef.current = true
    cleanedUpRef.current = true
    setQuizTerminated(true)
    setWarnings([])
    setActiveViolation(null)
    setIsViolationActive(false)

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

  // ── Clear active violation (auto-resume) ──────────────────────────
  const clearViolation = useCallback(() => {
    violationActiveRef.current = false
    devToolsViolationActiveRef.current = false
    setActiveViolation(null)
    setIsViolationActive(false)
  }, [])

  // ── Dismiss non-blocking (transient) violations ───────────────────
  const dismissViolation = useCallback(() => {
    // Only dismiss transient (non-blocking) violations
    // DevTools violations cannot be dismissed — they auto-clear when DevTools closes
    if (violationActiveRef.current && devToolsViolationActiveRef.current) {
      // DevTools still detected — do not allow dismissal
      return
    }
    clearViolation()
  }, [clearViolation])

  // ── Centralized violation handler ─────────────────────────────────
  const handleViolation = useCallback((reason, message, isBlocking = false) => {
    if (cleanedUpRef.current || quizTerminatedRef.current || isTerminatingRef.current) return

    // For DevTools: check violation-session guard
    // If DevTools violation is already active (same continuous session), don't increment
    if (reason === 'devtools' && devToolsViolationActiveRef.current) return

    // 300ms deduplication across all violation types
    const now = Date.now()
    if (now - lastViolationTimeRef.current < 300) return
    lastViolationTimeRef.current = now

    // Mark DevTools violation session as active
    if (reason === 'devtools') {
      devToolsViolationActiveRef.current = true
    }

    // Increment warning count
    const newCount = warningCountRef.current + 1
    warningCountRef.current = newCount
    setWarningCount(newCount)

    // Check if we've exceeded the warning limit
    if (newCount > MAX_WARNINGS) {
      terminateQuiz()
      return
    }

    // Show warning and block quiz
    violationActiveRef.current = true
    setIsViolationActive(true)
    setActiveViolation({
      reason,
      message,
      isBlocking,
      warningNumber: newCount,
    })
  }, [terminateQuiz])

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
    setActiveViolation(null)
    setIsViolationActive(false)

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
    isTerminatingRef.current = false
    warningCountRef.current = 0
    violationActiveRef.current = false
    devToolsDetectedRef.current = false
    devToolsViolationActiveRef.current = false
    wasFullscreenEstablishedRef.current = false
    fullscreenAttemptCountRef.current = 0
    lastViolationTimeRef.current = 0

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
          handleViolation(
            'fullscreen',
            'You exited the fullscreen exam environment.',
            false // transient — student is already back or can re-enter
          )
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
        handleViolation(
          'tab_switch',
          'You left the controlled quiz environment.',
          false // transient
        )
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // ────────────────────────────────────────────────────────────────
    // 3. WINDOW FOCUS — blur
    // ────────────────────────────────────────────────────────────────
    const handleWindowBlur = () => {
      if (cleanedUpRef.current || quizTerminatedRef.current) return
      handleViolation(
        'focus_loss',
        'The quiz window lost focus.',
        false // transient
      )
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
      if (cleanedUpRef.current || quizTerminatedRef.current || isTerminatingRef.current) return

      const widthDiff = window.outerWidth - window.innerWidth
      const heightDiff = window.outerHeight - window.innerHeight

      const isDetected = widthDiff > DEVTOOLS_THRESHOLD || heightDiff > DEVTOOLS_THRESHOLD

      if (isDetected) {
        devToolsDetectedRef.current = true
        // handleViolation will check devToolsViolationActiveRef and skip if already active
        handleViolation(
          'devtools',
          'Developer Tools activity has been detected.',
          true // blocking — quiz stays blocked until DevTools is closed
        )
      } else if (devToolsDetectedRef.current) {
        // DevTools was previously detected but is now closed — clear the violation
        devToolsDetectedRef.current = false
        if (devToolsViolationActiveRef.current) {
          clearViolation()
        }
      }
    }

    // Run initial check immediately (not delayed) to catch pre-opened DevTools
    checkDevTools()

    // Continue monitoring every 1.5 seconds
    devToolsIntervalRef.current = setInterval(checkDevTools, 1500)

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

      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('beforeunload', handleBeforeUnload)

      if (clipboardDismissTimerRef.current) {
        clearTimeout(clipboardDismissTimerRef.current)
        clipboardDismissTimerRef.current = null
      }

      historyPushedRef.current = false
    }
  }, [enabled, addWarning, removeWarning, handleViolation, clearViolation, terminateQuiz])

  return {
    isFullscreenReady,
    quizTerminated,
    warnings,
    warningCount,
    maxWarnings: MAX_WARNINGS,
    activeViolation,
    isViolationActive,
    dismissViolation,
    cleanup,
  }
}
