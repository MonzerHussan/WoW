"use client";

import { InputHTMLAttributes, useState } from "react";
import { cn } from "@/shared/utils/cn";
import { Lang } from "@/shared/types";
import { t } from "@/shared/i18n/translations";

/**
 * A password field with a show/hide toggle. One component for all four
 * password fields in the product (login, signup, and both fields on the
 * recovery page) rather than the same eye markup pasted four times.
 *
 * Lives in shared/ rather than features/auth/ because two of its hosts
 * are auth screens and the rule (CLAUDE.md #1) is that a feature never
 * imports from a sibling feature — the same reason WeakPasswordNotice
 * was moved here during the #38 round. It has no auth-specific logic:
 * it is an <input> that can toggle its own `type`.
 *
 * Why this exists at all: the password policy is now 10 characters with
 * an uppercase, a lowercase, a digit AND a symbol. Typing that blind —
 * on a phone, on an Arabic keyboard where the symbol row is a layout
 * switch away — is a genuine source of typos. The rules panel says
 * WHICH condition is unmet; it cannot show WHERE the typo is. Only
 * seeing the text does that.
 *
 * DESIGN NOTES, each one a real failure mode rather than decoration:
 *
 * - `type="button"`. A <button> inside a <form> defaults to
 *   type="submit", so an unqualified toggle would submit the form on
 *   every click — the single most common way this feature ships broken.
 *
 * - Only `type` changes between "password" and "text". The same DOM node
 *   stays mounted, so the value survives, the caret does not jump to the
 *   start, and React does not remount the field. (Swapping between two
 *   different <input> elements would lose all three.)
 *
 * - `onMouseDown` preventDefault keeps focus in the field: without it,
 *   clicking the eye blurs the input, which on mobile dismisses the
 *   keyboard mid-typing.
 *
 * - State is per-instance and never persisted. The two fields on the
 *   recovery page toggle independently, and "shown" never survives a
 *   reload — revealing a password is an explicit act each time, not a
 *   preference that could leave a password on screen unexpectedly.
 *
 * - Position uses `end-*`, not `right-*`, so it follows the writing
 *   direction: right in LTR, left in RTL. `pe-11` (padding-inline-end)
 *   reserves room so the text never runs under the icon in either
 *   direction.
 */
export function PasswordInput({
  lang,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { lang: Lang }) {
  const [visible, setVisible] = useState(false);
  const label = visible ? t("auth.hidePassword", lang) : t("auth.showPassword", lang);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("field-input pe-11", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        onMouseDown={(e) => e.preventDefault()}
        aria-label={label}
        title={label}
        aria-pressed={visible}
        /* w-10/h-10 (40px) rather than sizing to the 18px glyph: this is
           primarily a phone control, and a 26px target — what padding
           alone produced — is well under the ~44px touch guidance. The
           icon stays 18px; only the hit area grows, centred with flex.
           40px (not 44px) so it sits comfortably inside the 44px-tall
           field instead of straining it. */
        className="absolute end-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center
          text-ink-soft hover:text-navy focus:outline-none focus:ring-2 focus:ring-navy/40
          rounded-lg transition"
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

/* Inline SVGs — no icon library is used anywhere in this codebase (the
   Google mark in GoogleButton is inline too), and adding one for two
   glyphs would be a dependency for nothing. aria-hidden because the
   button already carries the accessible name. */

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.2 6.2A17.7 17.7 0 0 0 2 12s3.5 7 10 7a10.7 10.7 0 0 0 5.8-1.7" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m2 2 20 20" />
    </svg>
  );
}
