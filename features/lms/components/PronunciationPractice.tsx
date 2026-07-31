"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { sendAgentMessage } from "@/features/agent/services/agent.client";

type Phase = "idle" | "recording" | "recorded";
type SpeechIssue = "unsupported" | "failed" | "empty" | null;

function getSpeechRecognition(): any {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

/**
 * "Shadowing" practice: hear the machine pronunciation (SpeakButton),
 * repeat it, compare. Recording and self-playback are FREE and
 * unlimited; only sending the transcript to the agent costs coins
 * (pricing_units['pronunciation_practice'], 024 — passed in as a prop,
 * never imported here), and that is repeatable without limit by design
 * (021 has no unique constraint).
 *
 * WHY BOTH CAPTURES START TOGETHER: SpeechRecognition cannot transcribe
 * an already-recorded Blob — it only does live capture, and its
 * interface has no way to accept a MediaStream (verified against the
 * live API surface, not assumed). So a single press must drive
 * MediaRecorder *and* SpeechRecognition simultaneously; they are two
 * independent captures of the same microphone, not a shared stream.
 * That is exactly why the failure modes below are handled explicitly.
 *
 * FAILURE IS ALWAYS VISIBLE, NEVER SILENT, AND NEVER CHARGED:
 * - no SpeechRecognition (e.g. Firefox) -> record + playback still work,
 *   the evaluate button is hidden, and the reason is shown.
 * - recognition starts but errors, or returns nothing -> the recording
 *   stays playable, the reason is shown, no request is sent.
 * Coins are only ever spent once a non-empty transcript exists.
 *
 * The audio never leaves the browser: it is a Blob + object URL, revoked
 * on unmount. Only text is ever sent anywhere.
 */
export function PronunciationPractice({
  lessonId,
  referenceText,
  lang,
  coinCost,
}: {
  lessonId: string;
  referenceText: string;
  lang: Lang;
  /**
   * From pricing_units (024), resolved server-side and passed down —
   * this component no longer imports the price. Null means the price
   * couldn't be read, in which case the evaluate button is hidden
   * rather than offering to spend an unknown amount.
   */
  coinCost: number | null;
}) {
  const [canRecord, setCanRecord] = useState(false);
  const [canTranscribe, setCanTranscribe] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [speechIssue, setSpeechIssue] = useState<SpeechIssue>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcriptRef = useRef<string>("");
  const audioUrlRef = useRef<string | null>(null);

  // Capability detection in an effect, not during render — same
  // hydration reasoning as useLang: the server can't know any of this.
  useEffect(() => {
    setCanRecord(
      typeof window !== "undefined" &&
        typeof window.MediaRecorder !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia
    );
    setCanTranscribe(!!getSpeechRecognition());
  }, []);

  const cleanupCapture = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* already stopped */
    }
    recognitionRef.current = null;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        /* already stopped */
      }
    }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cleanupCapture();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, [cleanupCapture]);

  async function startRecording() {
    setMicError(null);
    setSpeechIssue(null);
    setEvalError(null);
    setFeedback(null);
    setTranscript(null);
    transcriptRef.current = "";
    chunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicError(t("lms.micDenied", lang));
      return;
    }
    streamRef.current = stream;

    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      setAudioUrl(url);
      setPhase("recorded");
    };
    recorder.start();

    // Independent second capture. If it fails, recording still stands.
    const SR = getSpeechRecognition();
    if (SR) {
      const recognition = new SR();
      recognition.lang = "en-US";
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcriptRef.current += event.results[i][0].transcript;
          }
        }
      };
      recognition.onerror = (event: any) => {
        // "no-speech"/"aborted" are reported as empty rather than broken.
        setSpeechIssue(event?.error === "no-speech" || event?.error === "aborted" ? "empty" : "failed");
      };
      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch {
        recognitionRef.current = null;
        setSpeechIssue("failed");
      }
    }

    setPhase("recording");
  }

  function stopRecording() {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* already stopped */
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    const heard = transcriptRef.current.trim();
    if (heard) {
      setTranscript(heard);
    } else if (canTranscribe) {
      // Recognition ran but produced nothing usable — say so rather than
      // leaving a dead evaluate button.
      setSpeechIssue((prev) => prev ?? "empty");
    }
  }

  async function handleEvaluate() {
    if (!transcript) return;
    setEvaluating(true);
    setEvalError(null);
    setFeedback(null);
    try {
      const res = await fetch("/api/lms/pronunciation/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, referenceText, transcript }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEvalError(res.status === 402 ? t("lms.insufficientCoinsPronunciation", lang) : data?.error || t("common.somethingWentWrong", lang));
        return;
      }

      try {
        // Trailing instruction (item #11 of the UI review, same product
        // decision and condition as LanguageTaskCard's request above):
        // if the transcript isn't real, recognizable English, the agent
        // must not fabricate a word-by-word comparison — it should
        // decline gently and ask for a genuine reading attempt instead.
        const reply = await sendAgentMessage(
          `تدريب نطق: كان المفترض أن أقرأ هذه العبارة الإنجليزية:\n"${referenceText}"\n\nوهذا ما التقطه تحويل الكلام إلى نص من نطقي:\n"${transcript}"\n\nقارن بينهما وأخبرني بالكلمات التي أخطأت فيها أو أسقطتها، بأسلوب مشجّع. ملاحظة مهمة: أنت تقرأ نصًا محوّلًا ولا تسمع صوتي، فلا تعلّق على اللكنة أو نبرة الصوت. لكن إن كان النص الملتقط أعلاه غير مفهوم أو لا يحتوي كلمات إنجليزية حقيقية (نتيجة تحويل كلام فاشلة أو عشوائية)، فلا تكتب لي مقارنة كاملة جاهزة — بدلًا من ذلك ارفضي بلطف واطلبي مني إعادة القراءة بوضوح أكبر.`
        );
        setFeedback(reply);
      } catch {
        // The charge already succeeded and is recorded; a feedback
        // hiccup shouldn't look like the evaluation failed outright.
        setEvalError(t("agent.unavailable", lang));
      }
    } catch {
      setEvalError(t("common.somethingWentWrong", lang));
    } finally {
      setEvaluating(false);
    }
  }

  if (!canRecord) return null;

  return (
    <span className="inline-flex flex-col gap-1 align-top">
      <span className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={phase === "recording" ? stopRecording : startRecording}
          className="text-sm font-semibold text-navy hover:underline inline-flex items-center gap-1"
        >
          {phase === "recording" ? "⏹" : "🎤"}{" "}
          {phase === "recording"
            ? t("lms.recording", lang)
            : phase === "recorded"
            ? t("lms.recordAgain", lang)
            : t("lms.record", lang)}
        </button>

        {audioUrl && phase !== "recording" && (
          <audio src={audioUrl} controls className="h-8 max-w-[180px] align-middle" />
        )}

        {/* coinCost === null: the price is unreadable, so don't offer a
            paid action at all — the route would refuse it anyway. */}
        {transcript && phase !== "recording" && coinCost !== null && (
          <button
            type="button"
            onClick={handleEvaluate}
            disabled={evaluating}
            className="text-sm font-semibold text-orange-dark hover:underline disabled:opacity-60"
          >
            {evaluating
              ? t("lms.evaluating", lang)
              : `${t("lms.evaluateMine", lang)} (${coinCost} ${t("lms.coinsUnit", lang)})`}
          </button>
        )}
      </span>

      {micError && <span className="text-xs text-orange-dark">{micError}</span>}

      {phase === "recorded" && !canTranscribe && (
        <span className="text-xs text-ink-soft">{t("lms.speechUnsupported", lang)}</span>
      )}
      {phase === "recorded" && canTranscribe && speechIssue === "failed" && (
        <span className="text-xs text-orange-dark">{t("lms.speechFailed", lang)}</span>
      )}
      {phase === "recorded" && canTranscribe && speechIssue === "empty" && !transcript && (
        <span className="text-xs text-orange-dark">{t("lms.speechEmpty", lang)}</span>
      )}

      {transcript && (
        <span className="text-xs text-ink-soft">
          {t("lms.heardYouSay", lang)} <span className="font-semibold text-ink">{transcript}</span>
        </span>
      )}

      {evalError && <span className="text-xs text-orange-dark">{evalError}</span>}
      {feedback && <span className="text-xs text-ink bg-bg rounded-lg p-3 leading-relaxed">{feedback}</span>}
    </span>
  );
}
