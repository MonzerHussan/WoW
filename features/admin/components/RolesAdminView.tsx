"use client";

import { useState } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang, AppRole } from "@/shared/types";
import { APP_ROLES } from "@/shared/constants/roles";
import { RoleAssignmentRow } from "@/shared/services/roles.service";

type RowState = { selected: AppRole; saving: boolean; message: string | null; ok: boolean };

/**
 * The editable half of /admin/roles. Every row posts to
 * /api/admin/roles, which calls assign_role (031) — this component has
 * no privileged access of its own; a user without roles.assign who
 * reached it somehow would simply get 403s on save, and the page itself
 * refuses to render for them (same shape as PricingAdminView).
 *
 * Per-row save, not one bulk submit: a role change is a security
 * decision, so each one is its own deliberate action with its own
 * visible outcome — same reasoning PricingAdminView already documents
 * for price changes.
 */
export function RolesAdminView({
  users,
  currentUserId,
  canAssignSuper,
  lang,
}: {
  users: RoleAssignmentRow[];
  currentUserId: string;
  canAssignSuper: boolean;
  lang: Lang;
}) {
  const [rows, setRows] = useState<Record<string, RowState>>(
    Object.fromEntries(users.map((u) => [u.id, { selected: u.role, saving: false, message: null, ok: false }]))
  );
  const [roleByUser, setRoleByUser] = useState<Record<string, AppRole>>(
    Object.fromEntries(users.map((u) => [u.id, u.role]))
  );

  // Options a non-super-admin caller may not even attempt: assign_role
  // (031) refuses this server-side regardless, but hiding it here avoids
  // a guaranteed-to-fail click. Presentation only — the real gate is the
  // database's roles.assign_super check.
  const assignableRoles = canAssignSuper ? APP_ROLES : APP_ROLES.filter((r) => r.value !== "super_admin");

  async function save(userId: string) {
    const role = rows[userId].selected;
    setRows((prev) => ({ ...prev, [userId]: { ...prev[userId], saving: true, message: null } }));
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRows((prev) => ({
          ...prev,
          [userId]: { ...prev[userId], saving: false, ok: false, message: data?.error || t("admin.rolesSaveFailed", lang) },
        }));
        return;
      }
      setRoleByUser((prev) => ({ ...prev, [userId]: role }));
      setRows((prev) => ({
        ...prev,
        [userId]: { ...prev[userId], saving: false, ok: true, message: t("admin.rolesSaved", lang) },
      }));
    } catch {
      setRows((prev) => ({
        ...prev,
        [userId]: { ...prev[userId], saving: false, ok: false, message: t("admin.rolesSaveFailed", lang) },
      }));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {users.map((u) => {
        const row = rows[u.id];
        const currentRole = roleByUser[u.id];
        const dirty = row.selected !== currentRole;
        return (
          <div
            key={u.id}
            className="border border-line rounded-wow p-4 flex flex-wrap items-center gap-3 text-sm"
          >
            <div className="flex-1 min-w-[200px]">
              <p className="font-bold text-ink">
                {u.full_name || u.email}
                {u.id === currentUserId && (
                  <span className="ms-2 text-xs font-normal text-ink-soft">({t("admin.rolesYou", lang)})</span>
                )}
              </p>
              <p className="text-xs text-ink-soft">{u.email}</p>
            </div>
            <select
              className="field-input w-auto"
              aria-label={`${t("admin.rolesRoleCol", lang)} — ${u.email}`}
              value={row.selected}
              onChange={(e) =>
                setRows((prev) => ({ ...prev, [u.id]: { ...prev[u.id], selected: e.target.value as AppRole } }))
              }
            >
              {assignableRoles.map((r) => (
                <option key={r.value} value={r.value}>
                  {lang === "ar" ? r.ar : r.en}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={row.saving || !dirty}
              onClick={() => save(u.id)}
              className="rounded-xl bg-navy text-white px-4 py-2 text-sm font-bold disabled:opacity-60"
            >
              {row.saving ? t("admin.rolesSaving", lang) : t("admin.rolesSave", lang)}
            </button>
            {row.message && (
              <span className={`text-xs ${row.ok ? "text-navy" : "text-orange-dark"}`}>{row.message}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
