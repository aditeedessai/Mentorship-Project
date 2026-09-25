import { useEffect, useRef, useState, useCallback } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import jojoLogo from "../../assets/jojo-logo.png";
import jojoCelebration from "../../assets/jojo-celebration.png";
import {
  TOUR_STEP_SESSION_KEY,
  TOUR_STEPS,
  markFirstTourHandled,
  waitForElement,
} from "./tourConstants";


const tourStyleSheet = `
  /* Overlay */
  .driver-overlay {
    backdrop-filter: blur(2px) !important;
    transition: opacity 0.3s ease !important;
  }

  /* Popover container */
  .jot-tour-popover {
    background: #ffffff !important;
    color: #231B33 !important;
    border: 1px solid rgba(128, 100, 199, 0.22) !important;
    border-radius: 24px !important;
    padding: 18px 20px !important;
    box-shadow: 0 20px 45px -12px rgba(128, 100, 199, 0.25), 0 4px 18px rgba(0, 0, 0, 0.06) !important;
    width: min(390px, calc(100vw - 32px)) !important;
    max-width: 390px !important;
    font-family: inherit !important;
    z-index: 1000000000 !important;
    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease !important;
  }

  .dark .jot-tour-popover {
    background: #151022 !important;
    color: #F3F0F8 !important;
    border: 1px solid rgba(167, 139, 250, 0.28) !important;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 25px rgba(128, 100, 199, 0.18) !important;
  }

  /* Popover Arrow */
  .jot-tour-popover .driver-popover-arrow {
    border-color: #ffffff !important;
  }
  .dark .jot-tour-popover .driver-popover-arrow {
    border-color: #151022 !important;
  }
  .jot-tour-popover .driver-popover-arrow-side-left {
    border-color: transparent transparent transparent #ffffff !important;
  }
  .dark .jot-tour-popover .driver-popover-arrow-side-left {
    border-color: transparent transparent transparent #151022 !important;
  }
  .jot-tour-popover .driver-popover-arrow-side-right {
    border-color: transparent #ffffff transparent transparent !important;
  }
  .dark .jot-tour-popover .driver-popover-arrow-side-right {
    border-color: transparent #151022 transparent transparent !important;
  }
  .jot-tour-popover .driver-popover-arrow-side-top {
    border-color: #ffffff transparent transparent transparent !important;
  }
  .dark .jot-tour-popover .driver-popover-arrow-side-top {
    border-color: #151022 transparent transparent transparent !important;
  }
  .jot-tour-popover .driver-popover-arrow-side-bottom {
    border-color: transparent transparent #ffffff transparent !important;
  }
  .dark .jot-tour-popover .driver-popover-arrow-side-bottom {
    border-color: transparent transparent #151022 transparent !important;
  }

  /* Header structure */
  .jot-tour-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    padding-right: 28px;
  }

  .jot-tour-badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: rgba(128, 100, 199, 0.12);
    border: 1px solid rgba(128, 100, 199, 0.25);
    border-radius: 9999px;
    padding: 3px 10px;
  }
  .dark .jot-tour-badge {
    background: rgba(128, 100, 199, 0.22);
    border-color: rgba(167, 139, 250, 0.3);
  }

  .jot-tour-badge img {
    height: 18px;
    width: auto;
    object-fit: contain;
  }

  .jot-tour-badge span {
    font-size: 10.5px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #8064C7;
  }
  .dark .jot-tour-badge span {
    color: #A78BFA;
  }

  .jot-tour-step-pill {
    font-size: 11px;
    font-weight: 700;
    color: #8064C7;
    background: rgba(128, 100, 199, 0.1);
    padding: 2.5px 8.5px;
    border-radius: 9999px;
    letter-spacing: 0.02em;
  }
  .dark .jot-tour-step-pill {
    color: #C4B5FD;
    background: rgba(128, 100, 199, 0.25);
  }

  /* Title & Description */
  .jot-tour-popover .driver-popover-title {
    font-size: 16px !important;
    font-weight: 900 !important;
    letter-spacing: -0.02em !important;
    line-height: 1.35 !important;
    margin: 4px 0 6px 0 !important;
    color: inherit !important;
  }

  .jot-tour-popover .driver-popover-description {
    font-size: 12.5px !important;
    line-height: 1.55 !important;
    color: #5D5668 !important;
    margin: 0 !important;
    font-weight: 500 !important;
  }
  .dark .jot-tour-popover .driver-popover-description {
    color: #B2A9BF !important;
  }

  /* Close Button */
  .jot-tour-popover .driver-popover-close-btn {
    top: 14px !important;
    right: 14px !important;
    color: #9CA3AF !important;
    font-size: 20px !important;
    width: 26px !important;
    height: 26px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 8px !important;
    transition: all 0.2s ease !important;
  }
  .jot-tour-popover .driver-popover-close-btn:hover {
    color: #EF4444 !important;
    background: rgba(239, 68, 68, 0.1) !important;
  }

  /* Footer Layout */
  .jot-tour-popover .driver-popover-footer {
    margin-top: 16px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 8px !important;
    padding-top: 4px !important;
  }

  .jot-tour-popover .driver-popover-progress-text {
    display: none !important; /* replaced by custom step pill */
  }

  /* Skip Tour button */
  .jot-tour-skip-btn {
    all: unset;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    color: #8B8595;
    transition: color 0.2s ease;
    text-decoration: none;
    padding: 6px 4px;
  }
  .jot-tour-skip-btn:hover {
    color: #231B33;
    text-decoration: underline;
  }
  .dark .jot-tour-skip-btn {
    color: #9088A0;
  }
  .dark .jot-tour-skip-btn:hover {
    color: #FFFFFF;
  }

  .jot-tour-popover .driver-popover-navigation-btns {
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
  }

  .jot-tour-popover .driver-popover-prev-btn {
    all: unset !important;
    box-sizing: border-box !important;
    cursor: pointer !important;
    border-radius: 12px !important;
    padding: 6.5px 14px !important;
    font-size: 12px !important;
    font-weight: 700 !important;
    border: 1px solid rgba(0, 0, 0, 0.1) !important;
    background: #F8F8FC !important;
    color: #4B4655 !important;
    transition: all 0.2s ease !important;
  }
  .jot-tour-popover .driver-popover-prev-btn:hover {
    background: #EEEEF4 !important;
    color: #231B33 !important;
  }
  .dark .jot-tour-popover .driver-popover-prev-btn {
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
    background: rgba(255, 255, 255, 0.06) !important;
    color: #D1C9DE !important;
  }
  .dark .jot-tour-popover .driver-popover-prev-btn:hover {
    background: rgba(255, 255, 255, 0.12) !important;
    color: #FFFFFF !important;
  }

  .jot-tour-popover .driver-popover-next-btn {
    all: unset !important;
    box-sizing: border-box !important;
    cursor: pointer !important;
    border-radius: 12px !important;
    padding: 6.5px 16px !important;
    font-size: 12px !important;
    font-weight: 700 !important;
    background: #8064C7 !important;
    color: #FFFFFF !important;
    box-shadow: 0 4px 14px rgba(128, 100, 199, 0.35) !important;
    transition: all 0.2s ease !important;
  }
  .jot-tour-popover .driver-popover-next-btn:hover {
    background: #7357B9 !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 6px 18px rgba(128, 100, 199, 0.45) !important;
  }
  .jot-tour-popover .driver-popover-next-btn:active {
    transform: translateY(0) !important;
  }

  /* Responsive tuning for small mobile screens */
  @media (max-width: 480px) {
    .jot-tour-popover {
      width: calc(100vw - 24px) !important;
      max-width: calc(100vw - 24px) !important;
      padding: 15px !important;
      border-radius: 20px !important;
    }
    .jot-tour-popover .driver-popover-title {
      font-size: 15px !important;
    }
    .jot-tour-popover .driver-popover-description {
      font-size: 12px !important;
    }
  }
`;

export default function ProductTour({
  isActive = false,
  currentPage = "dashboard",
  user,
  userId,
  onNavigate,
  onTourEnd,
}) {
  const resolvedUserId = userId || user?.id;
  const driverRef = useRef(null);
  const isTransitioningRef = useRef(false);
  const [stepIndex, setStepIndex] = useState(() => {
    const saved = sessionStorage.getItem(TOUR_STEP_SESSION_KEY);
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  const cleanupDriver = useCallback(() => {
    if (driverRef.current) {
      try {
        isTransitioningRef.current = true;
        driverRef.current.destroy();
      } catch (err) {
        console.warn("[TOUR DEBUG] Tour cleanup warning:", err);
      } finally {
        driverRef.current = null;
        isTransitioningRef.current = false;
      }
    }
  }, []);

  const handleFinishOrSkip = useCallback(
    () => {
      console.log("[TOUR DEBUG] handleFinishOrSkip called for user:", resolvedUserId);
      isTransitioningRef.current = false;
      if (resolvedUserId) {
        markFirstTourHandled(resolvedUserId, user?.email);
      }
      sessionStorage.removeItem(TOUR_STEP_SESSION_KEY);
      cleanupDriver();
      if (currentPage !== "dashboard" && onNavigate) {
        onNavigate("dashboard");
      }
      if (onTourEnd) {
        onTourEnd();
      }
    },
    [cleanupDriver, currentPage, onNavigate, onTourEnd, resolvedUserId, user?.email]
  );

  const transitionToStep = useCallback(
    (nextIdx) => {
      if (nextIdx >= TOUR_STEPS.length) {
        handleFinishOrSkip(true);
        return;
      }
      if (nextIdx < 0) {
        return;
      }

      isTransitioningRef.current = true;
      cleanupDriver();

      sessionStorage.setItem(TOUR_STEP_SESSION_KEY, String(nextIdx));
      setStepIndex(nextIdx);

      const nextStep = TOUR_STEPS[nextIdx];
      if (nextStep.page !== currentPage && onNavigate) {
        onNavigate(nextStep.page);
      }
    },
    [cleanupDriver, currentPage, handleFinishOrSkip, onNavigate]
  );

  // Sync stepIndex with sessionStorage when isActive transitions to true
  const [prevIsActive, setPrevIsActive] = useState(isActive);
  if (isActive !== prevIsActive) {
    setPrevIsActive(isActive);
    if (isActive) {
      const saved = sessionStorage.getItem(TOUR_STEP_SESSION_KEY);
      const idx = saved !== null ? parseInt(saved, 10) : 0;
      setStepIndex(idx);
    }
  }

  // Main step-runner effect: runs whenever isActive, currentPage, or stepIndex changes
  useEffect(() => {
    if (!isActive) {
      cleanupDriver();
      return;
    }

    const currentStep = TOUR_STEPS[stepIndex] || TOUR_STEPS[0];

    // If we're not yet on the step's designated page, trigger navigation and wait
    if (currentStep.page !== currentPage) {
      if (onNavigate) {
        onNavigate(currentStep.page);
      }
      return;
    }

    let isCancelled = false;

    const renderTourStep = async () => {
      // Clean up previous instance before creating a new one
      cleanupDriver();

      console.log(`[TOUR DEBUG] Step ${stepIndex + 1}/${TOUR_STEPS.length} (${currentStep.title}) starting for page: ${currentStep.page}`);

      // Wait for target element to mount if step specifies one
      if (currentStep.selector) {
        console.log(`[TOUR DEBUG] Step ${stepIndex + 1} waiting for selector:`, currentStep.selector);
        const el = await waitForElement(currentStep.selector, 5000);
        console.log(`[TOUR DEBUG] Step ${stepIndex + 1} target found:`, !!el);
      } else {
        await new Promise((r) => setTimeout(r, 80));
      }

      if (isCancelled) return;

      const isLast = stepIndex === TOUR_STEPS.length - 1;
      const isFirst = stepIndex === 0;
      const mascotImg = isLast ? jojoCelebration : jojoLogo;

      const nextButtonText = isLast ? "Finish 🚀" : "Next";
      const prevButtonText = isFirst ? "" : "Back";

      const stepConfig = {
        element: currentStep.selector,
        popover: {
          side: currentStep.side,
          align: currentStep.align,
          popoverClass: "jot-tour-popover",
          title: `
            <div class="jot-tour-header">
              <div class="jot-tour-badge">
                <img src="${mascotImg}" alt="Jojo Mascot" />
                <span>Jojo Guide</span>
              </div>
              <span class="jot-tour-step-pill">${stepIndex + 1} of ${TOUR_STEPS.length}</span>
            </div>
            <div class="jot-tour-title">${currentStep.title}</div>
          `,
          description: `
            <p class="jot-tour-desc">${currentStep.description}</p>
          `,
          nextBtnText: nextButtonText,
          doneBtnText: nextButtonText,
          prevBtnText: prevButtonText,
          showButtons: isFirst
            ? ["next", "close"]
            : ["previous", "next", "close"],
          onNextClick: () => {
            transitionToStep(stepIndex + 1);
          },
          onPrevClick: () => {
            transitionToStep(stepIndex - 1);
          },
          onCloseClick: () => {
            handleFinishOrSkip(true);
          },
          onPopoverRender: (popover) => {
            // Guarantee next button click handler is attached
            if (popover?.nextButton) {
              popover.nextButton.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                transitionToStep(stepIndex + 1);
              };
            }

            // Guarantee prev button click handler is attached
            if (popover?.previousButton) {
              popover.previousButton.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                transitionToStep(stepIndex - 1);
              };
            }

            // Guarantee close button click handler is attached
            if (popover?.closeButton) {
              popover.closeButton.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleFinishOrSkip(true);
              };
            }

            // Prepend custom Skip Tour button on the left of footer
            if (popover?.footer && !popover.footer.querySelector(".jot-tour-skip-btn")) {
              const skipBtn = document.createElement("button");
              skipBtn.type = "button";
              skipBtn.className = "jot-tour-skip-btn";
              skipBtn.setAttribute("aria-label", "Skip product tour");
              skipBtn.innerText = "Skip Tour";
              skipBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleFinishOrSkip(true);
              };
              popover.footer.prepend(skipBtn);
            }
          },
        },
      };

      const driverInstance = driver({
        animate: true,
        smoothScroll: true,
        allowClose: true,
        stagePadding: 8,
        stageRadius: 16,
        popoverOffset: 12,
        overlayColor: "rgba(10, 8, 16, 0.65)",
        overlayClickBehavior: () => {
          if (!isTransitioningRef.current) {
            handleFinishOrSkip(true);
          }
        },
        onDestroyStarted: () => {
          if (!isTransitioningRef.current) {
            handleFinishOrSkip(true);
          }
        },
        steps: [stepConfig],
      });

      driverRef.current = driverInstance;
      isTransitioningRef.current = false;

      try {
        console.log(`[TOUR DEBUG] driver.drive(0) executing for step ${stepIndex + 1}`);
        driverInstance.drive(0);
      } catch (err) {
        console.warn("[TOUR DEBUG] Driver drive failed:", err);
      }
    };

    renderTourStep();

    return () => {
      isCancelled = true;
    };
  }, [isActive, currentPage, stepIndex, cleanupDriver, handleFinishOrSkip, onNavigate, transitionToStep]);

  if (!isActive) return null;

  return <style>{tourStyleSheet}</style>;
}
