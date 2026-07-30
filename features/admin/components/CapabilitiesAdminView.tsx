"use client";

import { useState } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { getCapabilityLabel } from "@/shared/constants/capabilities";
import { STAFF_GRANTED_CAPABILITY_VALUES } from "@/shared/schemas/capabilities.schema";
import { RoleAssignmentRow } from "@/shared/services/roles.service";

type RowState = { grantingValue: string | null; message: string | null; ok: boolean };

/**
 * Grant-only, same shape as ActivateCapabilityButton's own self-service
 * scope ("only ever adds — never removes"). Every grant posts to
 * /api/admin/capabilities, which calls grant_capability (034) — this
 * component has no privileged access of its own; a user without
 * users.manage who reached it somehow would simply get 403s, and the
 * page itself refuses to render this section for them.
 *
 * Only instructor/mentor/assessor appear here at all — the other four
 * capabilities stay self-service (034's RLS) and have no admin-grant
 * reason to exist, so they are never listed as grantable through this
 * screen.
 */
export function CapabilitiesAdminView({
  users,
  capabilitiesByUser,
  lang,
}: {
  users: RoleAssignmentRow[];
  capabilitiesByUser: Record<string, string[]>;
  lang: Lang;
}) {
  const [rows, setRows] = useState<Record<string, RowState>>(
    Object.fromEntries(users.map((u) => [u.id, { grantingValue: null, message: null, ok: false }]))
  );
  const [grantedByUser, setGrantedByUser] = useState<Record<string, string[]>>(capabilitiesByUser);

  async function grant(userId: string, capability: string) {
    setRows((prev) => ({ ...prev, [userId]: { grantingValue: capability, message: null, ok: false } }));
    try {
      const res = await fetch("/api/admin/capabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, capability }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRows((prev) => ({
          ...prev,
          [userId]: { grantingValue: null, ok: false, message: data?.error || t("admin.capabilitiesGrantFailed", lang) },
        }));
        return;
      }
      setGrantedByUser((prev) => ({ ...prev, [userId]: [...(prev[userId] || []), capability] }));
      setRows((prev) => ({
        ...prev,
        [userId]: { grantingValue: null, ok: true, message: t("admin.capabilitiesGranted", lang) },
      }));
    } catch {
      setRows((prev) => ({
        ...prev,
        [userId]: { grantingValue: null, ok: false, message: t("admin.capabilitiesGrantFailed", lang) },
      }));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {users.map((u) => {
        const row = rows[u.id];
        const granted = grantedByUser[u.id] || [];
        const missing = STAFF_GRANTED_CAPABILITY_VALUES.filter((c) => !granted.includes(c));
        return (
          <div key={u.id} className="border border-line rounded-wow p-4 flex flex-wrap items-center gap-3 text-sm">
            <div className="flex-1 min-w-[200px]">
              <p className="font-bold text-ink">{u.full_name || u.email}</p>
              <p className="text-xs text-ink-soft">{u.email}</p>
            </div>

            {granted.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {granted.map((c) => {
                  const { label, icon } = getCapabilityLabel(c, lang);
                  return (
                    <span
                      key={c}
                      className="flex items-center gap-1 rounded-full bg-navy/10 text-navy px-2.5 py-1 text-xs font-semibold"
                    >
                      {icon} {label}
                    </span>
                  );
                })}
              </div>
            )}

            {missing.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {missing.map((c) => {
                  const { label, icon } = getCapabilityLabel(c, lang);
                  return (
                    <button
                      key={c}
                      type="button"
                      disabled={row.grantingValue !== null}
                      onClick={() => grant(u.id, c)}
                      className="flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-semibold hover:border-navy/40 disabled:opacity-60"
                    >
                      {icon} {row.grantingValue === c ? t("admin.capabilitiesGranting", lang) : label}
                    </button>
                  );
                })}
              </div>
            )}

            {row.message && (
              <span className={`text-xs ${row.ok ? "text-navy" : "text-orange-dark"}`}>{row.message}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
