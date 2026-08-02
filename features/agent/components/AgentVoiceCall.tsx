"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { Button } from "@/shared/components/Button";
import { ErrorState } from "@/shared/components/Feedback";
import {
  startVoiceCall,
  getVoiceCallRate,
  VoiceCallError,
  VoiceCallController,
  VoiceCallEnd,
} from "@/features/agent/services/voice.client";

type Phase = "disclosure" | "connecting" | "active" | "ending" | "summary" | "error";

/**
 * A live voice call, rendered inside the floating agent's panel.
 *
 * A separate component rather than another branch of FloatingAgent on
 * purpose: a call has its own state machine, its own timer, its own
 * teardown obligations and its own failure surface, none of which
 * overlap with the chat's. Folding them together would give one
 * component two unrelated lifecycles.
 *
 * `lang` is a prop, not this component's own useLang() — it follows the
 * host panel, the same rule LanguageTaskCard and PronunciationPractice
 * already follow.
 */
export function AgentVoiceCall({
  agentName,
  lang,
  onClose,
}: {
  agentName: string;
  lang: Lang;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("disclosure");
  const [ratePerMinute, setRatePerMinute] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const [summary, setSummary] = useState<VoiceCallEnd | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [liveTurns, setLiveTurns] = useState<{ user: string; assistant: string }[]>([]);

  const controllerRef = useRef<VoiceCallController | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    getVoiceCallRate().then(setRatePerMinute);
  }, []);

  // The call keeps costing money until it is closed, so unmount MUST end
  // it — a user closing the panel or navigating away is the commonest
  // way out of a call, not the rare one.
  useEffect(() => {
    return () => {
      void controllerRef.current?.end();
      controllerRef.current = null;
    };
  }, []);

  const finish = useCallback(async () => {
    const controller = controllerRef.current;
    if (!controller) return;
    controllerRef.current = null;
    setPhase("ending");
    const result = await controller.end();
    setSummary(result);
    setPhase("summary");
  }, []);

  // Local countdown to the server's cap. This is a courtesy, not the
  // enforcement — the server is not on the media path and cannot stop a
  // call (036 / DOMAIN_CONTRACTS §12). It ends the call the honest way
  // for an honest client, and the block was paid up front either way.
  useEffect(() => {
    if (phase !== "active" || secondsLeft === null) return;
    if (secondsLeft <= 0) {
      void finish();
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(id);
  }, [phase, secondsLeft, finish]);

  async function begin() {
    setPhase("connecting");
    setErrorCode(null);
    try {
      const controller = await startVoiceCall({
        onTurn: (turn) => setLiveTurns((prev) => [...prev, turn]),
        onDropped: () => {
          setErrorCode("voice_dropped");
          void finish();
        },
      });
      controllerRef.current = controller;
      if (audioRef.current) {
        audioRef.current.srcObject = controller.remoteStream;
        void audioRef.current.play().catch(() => {
          /* autoplay policy — the user gesture that started the call covers this in practice */
        });
      }
      setSecondsLeft(controller.capMinutes * 60);
      setPhase("active");
    } catch (err) {
      setErrorCode(err instanceof VoiceCallError ? err.code : "voice_unavailable");
      setPhase("error");
    }
  }

  function errorMessage(code: string) {
    switch (code) {
      case "insufficient_balance":
        return t("agent.voiceCallErrInsufficient", lang);
      case "call_already_active":
        return t("agent.voiceCallErrActive", lang);
      case "mic_denied":
        return t("agent.voiceCallErrMic", lang);
      case "voice_rate_limited":
        return t("agent.voiceCallErrRate", lang);
      case "voice_dropped":
        return t("agent.voiceCallDropped", lang);
      default:
        return t("agent.voiceCallErrGeneric", lang);
    }
  }

  const mmss = (total: number) =>
    `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;

  return (
    <div className="flex-1 flex flex-col gap-3 overflow-y-auto pe-1">
      {/* Remote audio. Hidden, but a real element — WebRTC needs somewhere
          to play into. */}
      <audio ref={audioRef} autoPlay className="hidden" />

      {phase === "disclosure" && (
        <div className="flex flex-col gap-3">
          <h3 className="font-display font-bold text-navy text-sm">{t("agent.voiceCallTitle", lang)}</h3>
          {/* §12: shown BEFORE the first call, never in a settings page. */}
          <p className="text-xs text-ink-soft leading-relaxed bg-bg rounded-lg p-3">
            {t("agent.voiceCallDisclosure", lang)}
          </p>
          {ratePerMinute !== null && (
            <p className="text-xs font-bold text-ink">
              {t("agent.voiceCallCostPrefix", lang)} {ratePerMinute} {t("agent.voiceCallCoinsPerMinute", lang)}
            </p>
          )}
          <p className="text-xs text-ink-soft leading-relaxed">{t("agent.voiceCallCapNotice", lang)}</p>
          <div className="flex gap-2">
            <Button onClick={begin}>{t("agent.voiceCallConfirm", lang)}</Button>
            <Button variant="ghost" onClick={onClose}>
              {t("agent.voiceCallCancel", lang)}
            </Button>
          </div>
        </div>
      )}

      {phase === "connecting" && (
        <p className="text-sm text-ink-soft m-auto">{t("agent.voiceCallConnecting", lang)}</p>
      )}

      {(phase === "active" || phase === "ending") && (
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-navy">{agentName}</span>
            {secondsLeft !== null && (
              <span className="text-xs text-ink-soft tabular-nums">
                {t("agent.voiceCallRemaining", lang)} {mmss(Math.max(0, secondsLeft))}
              </span>
            )}
          </div>

          <p className="text-xs text-ink-soft">{t("agent.voiceCallListening", lang)}</p>

          {/* Live transcript — the same text that is being written to the
              agent's memory, so the user can see exactly what is kept. */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-2">
            {liveTurns.map((turn, i) => (
              <div key={i} className="flex flex-col gap-1">
                <span className="self-end bg-navy text-white text-xs rounded-xl rounded-ee-sm px-3 py-1.5 max-w-[90%]">
                  {turn.user}
                </span>
                <span className="self-start bg-bg text-ink text-xs rounded-xl rounded-ss-sm px-3 py-1.5 max-w-[90%]">
                  {turn.assistant}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                const next = !muted;
                setMuted(next);
                controllerRef.current?.setMuted(next);
              }}
              disabled={phase === "ending"}
            >
              {muted ? t("agent.voiceCallUnmute", lang) : t("agent.voiceCallMute", lang)}
            </Button>
            <Button onClick={finish} disabled={phase === "ending"}>
              {phase === "ending" ? t("agent.voiceCallEnding", lang) : t("agent.voiceCallEnd", lang)}
            </Button>
          </div>
        </div>
      )}

      {phase === "summary" && (
        <div className="flex flex-col gap-3 m-auto text-center">
          <h3 className="font-display font-bold text-navy text-sm">{t("agent.voiceCallSummaryTitle", lang)}</h3>
          {errorCode && <ErrorState message={errorMessage(errorCode)} />}
          {summary && (
            <div className="text-xs text-ink-soft flex flex-col gap-1">
              <span>
                {t("agent.voiceCallSummaryUsed", lang)} <strong className="text-ink">{summary.usedMinutes}</strong>
              </span>
              <span>
                {t("agent.voiceCallSummaryRefunded", lang)}{" "}
                <strong className="text-ink">{summary.coinsRefunded}</strong>
              </span>
            </div>
          )}
          <Button variant="ghost" onClick={onClose}>
            {t("agent.voiceCallCancel", lang)}
          </Button>
        </div>
      )}

      {phase === "error" && (
        <div className="flex flex-col gap-3 m-auto">
          <ErrorState message={errorMessage(errorCode || "voice_unavailable")} />
          <Button variant="ghost" onClick={onClose}>
            {t("agent.voiceCallCancel", lang)}
          </Button>
        </div>
      )}
    </div>
  );
}
