"use client";

import { useState } from "react";
import { useLang } from "@/shared/hooks/useLang";
import { Card } from "@/shared/components/Feedback";
import { Button } from "@/shared/components/Button";

export function InviteLinkCard({ inviteCode }: { inviteCode: string | null }) {
  const { t } = useLang("ar");
  const [copied, setCopied] = useState(false);

  if (!inviteCode) return null;

  const link = typeof window !== "undefined" ? `${window.location.origin}/join/${inviteCode}` : `/join/${inviteCode}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — the link is still visible to select manually.
    }
  }

  return (
    <Card className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
      <div className="min-w-0">
        <p className="text-xs font-bold text-ink-soft mb-1">{t("instructor.inviteLinkLabel")}</p>
        <p className="text-sm text-navy font-mono truncate">{link}</p>
      </div>
      <Button variant="ghost" onClick={handleCopy}>
        {copied ? t("instructor.linkCopied") : t("instructor.copyLink")}
      </Button>
    </Card>
  );
}
