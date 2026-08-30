import React, { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function BackToTop() {
  const { isDarkMode } = useTheme();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const windowScroll = window.scrollY || document.documentElement.scrollTop;
      const mainElement = document.querySelector("main");
      const mainScroll = mainElement ? mainElement.scrollTop : 0;

      if (windowScroll > 250 || mainScroll > 250) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    
    // Also attach listener to <main> if it has vertical overflow
    const mainElement = document.querySelector("main");
    if (mainElement) {
      mainElement.addEventListener("scroll", handleScroll, { passive: true });
    }

    // Initial check
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (mainElement) {
        mainElement.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    const mainElement = document.querySelector("main");
    if (mainElement) {
      mainElement.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      title="Back to top"
      className={`fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-2xl border shadow-xl backdrop-blur-2xl transition-all duration-300 cursor-pointer ${
        isVisible
          ? "opacity-100 translate-y-0 pointer-events-auto scale-100"
          : "opacity-0 translate-y-6 pointer-events-none scale-90"
      } ${
        isDarkMode
          ? "border-white/15 bg-[#17131F]/90 text-white hover:bg-[#8064C7] hover:border-[#8064C7] shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
          : "border-black/10 bg-white/90 text-[#231B33] hover:bg-[#8064C7] hover:text-white hover:border-[#8064C7] shadow-[0_10px_30px_rgba(128,100,199,0.2)]"
      }`}
    >
      <ArrowUp size={20} strokeWidth={2.5} />
    </button>
  );
}
