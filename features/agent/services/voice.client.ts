import { supabaseBrowser } from "@/shared/lib/supabase/client";
import { OPENAI_REALTIME_CALLS_URL } from "@/shared/constants/agent";

/**
 * BROWSER-ONLY. Drives one live voice call end to end.
 *
 * The media path is browser <-> OpenAI directly over WebRTC — our server
 * is only on the credential path (036). Everything here therefore runs
 * with a short-lived client secret that our route minted; OPENAI_API_KEY
 * is never present in this bundle.
 *
 * No dependency was added for any of this: RTCPeerConnection,
 * getUserMedia and the data channel are all native browser APIs, which
 * is a large part of why WebRTC won over a relayed WebSocket.
 */

export interface VoiceCallStart {
  sessionId: string;
  clientSecret: string;
  model: string;
  capMinutes: number;
  ratePerMinute: number;
  coinsCharged: number;
  balanceAfter: number;
  agentName: string;
}

export interface VoiceCallEnd {
  status: string;
  durationSeconds: number;
  usedMinutes: number;
  coinsCharged: number;
  coinsRefunded: number;
}

/** Thrown with a stable `code` so the UI can pick the right message. */
export class VoiceCallError extends Error {
  code: string;
  balance?: number;
  required?: number;
  constructor(code: string, extra?: { balance?: number; required?: number }) {
    super(code);
    this.code = code;
    this.balance = extra?.balance;
    this.required = extra?.required;
  }
}

export interface VoiceCallHandlers {
  /** A finished exchange, already persisted server-side. For live display. */
  onTurn?: (turn: { user: string; assistant: string }) => void;
  /** The connection dropped on its own (network, remote hang-up). */
  onDropped?: () => void;
}

export interface VoiceCallController {
  sessionId: string;
  capMinutes: number;
  ratePerMinute: number;
  coinsCharged: number;
  balanceAfter: number;
  /** Remote audio, for the caller to attach to an <audio> element. */
  remoteStream: MediaStream;
  setMuted: (muted: boolean) => void;
  /** Idempotent — safe to call from a timer, a button and an unmount. */
  end: () => Promise<VoiceCallEnd | null>;
}

/**
 * The per-minute price, read straight from `pricing_units` under RLS
 * (reads are open to any signed-in user; only writes are locked to
 * finance.edit_rates). Used to state the cost BEFORE the disclosure is
 * accepted — nothing is charged until `startVoiceCall`.
 *
 * Returns null rather than a fallback number when the row is unreadable,
 * matching getPricingUnit's rule server-side: showing a price nobody
 * configured is worse than showing none.
 */
export async function getVoiceCallRate(): Promise<number | null> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from("pricing_units")
    .select("coin_cost")
    .eq("key", "voice_call_minute")
    .maybeSingle();

  if (error || typeof data?.coin_cost !== "number") return null;
  return data.coin_cost;
}

async function endSession(sessionId: string): Promise<VoiceCallEnd | null> {
  try {
    const res = await fetch(`/api/agent/voice/session?sessionId=${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
    });
    if (!res.ok) return null;
    return (await res.json()) as VoiceCallEnd;
  } catch {
    return null;
  }
}

/**
 * Opens a call. Charges happen server-side the moment this is called, so
 * every failure path below MUST close the session again — otherwise the
 * user pays for a call they never got. `end_agent_call` refunds in full
 * when no call id was ever recorded, which is exactly these cases.
 */
export async function startVoiceCall(handlers: VoiceCallHandlers = {}): Promise<VoiceCallController> {
  const res = await fetch("/api/agent/voice/session", { method: "POST" });
  const data = await res.json();

  if (!res.ok) {
    throw new VoiceCallError(data?.error || "voice_unavailable", {
      balance: data?.balance,
      required: data?.required,
    });
  }

  const start = data as VoiceCallStart;

  let micStream: MediaStream;
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    await endSession(start.sessionId);
    throw new VoiceCallError("mic_denied");
  }

  const pc = new RTCPeerConnection();
  const remoteStream = new MediaStream();
  let ended = false;

  const cleanup = () => {
    micStream.getTracks().forEach((t) => t.stop());
    try {
      pc.close();
    } catch {
      /* already closed */
    }
  };

  const end = async () => {
    if (ended) return null;
    ended = true;
    cleanup();
    return endSession(start.sessionId);
  };

  try {
    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((t) => remoteStream.addTrack(t));
    };

    pc.onconnectionstatechange = () => {
      if (ended) return;
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        handlers.onDropped?.();
      }
    };

    micStream.getTracks().forEach((track) => pc.addTrack(track, micStream));

    // Transcripts arrive here. The server is not on this path, which is
    // why persisting them means posting them back ourselves — see
    // /api/agent/voice/turn for why that is acceptable and bounded.
    const channel = pc.createDataChannel("oai-events");
    let pendingUser: string | null = null;

    channel.onmessage = (event) => {
      let payload: any;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      if (payload?.type === "conversation.item.input_audio_transcription.completed") {
        pendingUser = (payload.transcript || "").trim() || null;
        return;
      }

      if (payload?.type === "response.audio_transcript.done") {
        const assistant = (payload.transcript || "").trim();
        if (!assistant) return;

        // Only a complete pair is worth storing: a lone assistant line
        // with no prompt reads as nonsense when replayed as memory later.
        if (pendingUser) {
          const turn = { user: pendingUser, assistant };
          pendingUser = null;
          handlers.onTurn?.(turn);
          void fetch("/api/agent/voice/turn", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userMessage: turn.user, assistantReply: turn.assistant }),
          }).catch(() => {
            /* a lost transcript must never interrupt a live call */
          });
        }
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdpRes = await fetch(`${OPENAI_REALTIME_CALLS_URL}?model=${encodeURIComponent(start.model)}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${start.clientSecret}`,
        "Content-Type": "application/sdp",
      },
    });

    if (!sdpRes.ok) {
      throw new VoiceCallError("handshake_failed");
    }

    // The call id lives in the Location header. Recording it is what
    // lets end_agent_call tell "never connected" (full refund) from
    // "connected and hung up fast" (one minute billed).
    const location = sdpRes.headers.get("Location");
    const callId = location ? location.split("/").filter(Boolean).pop() : null;
    if (callId) {
      void fetch("/api/agent/voice/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: start.sessionId, callId }),
      }).catch(() => {
        /* audit fidelity only — never worth failing a live call */
      });
    }

    await pc.setRemoteDescription({ type: "answer", sdp: await sdpRes.text() });
  } catch (err) {
    await end();
    throw err instanceof VoiceCallError ? err : new VoiceCallError("handshake_failed");
  }

  return {
    sessionId: start.sessionId,
    capMinutes: start.capMinutes,
    ratePerMinute: start.ratePerMinute,
    coinsCharged: start.coinsCharged,
    balanceAfter: start.balanceAfter,
    remoteStream,
    setMuted: (muted: boolean) => {
      micStream.getAudioTracks().forEach((t) => {
        t.enabled = !muted;
      });
    },
    end,
  };
}
