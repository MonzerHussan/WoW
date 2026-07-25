"use client";

import { useState, useEffect, useCallback } from "react";

interface SpeakButtonProps {
  text: string;
  lang: "en-US" | "ar-SA";
  label?: string;
}

/**
 * Browser SpeechSynthesis only — no external TTS API, no coin cost, no
 * audio storage/upload. `lang` is always passed explicitly by the
 * caller (never a user-configurable setting here): English content
 * always speaks as en-US regardless of the page's AR/EN toggle, since
 * the point is English pronunciation practice, not reading Arabic UI
 * labels aloud.
 */
export function SpeakButton({ text, lang, label }: SpeakButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleClick = useCallback(() => {
    if (!supported || !text) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }, [supported, text, speaking, lang]);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-sm font-semibold text-navy hover:underline inline-flex items-center gap-1"
      aria-label={label}
    >
      {speaking ? "⏹" : "🔊"} {label}
    </button>
  );
}
