"use client";

import { useRef, useState } from "react";
import { t } from "@/shared/i18n/translations";
import { Lang } from "@/shared/types";
import { ErrorState } from "@/shared/components/Feedback";
import { supabaseBrowser } from "@/shared/lib/supabase/client";

const MAX_BYTES = 3 * 1024 * 1024; // 3MB — generous for a profile picture, small enough to not need a resize step yet.

export function AvatarUpload({
  userId,
  initialAvatarUrl,
  lang,
}: {
  userId: string;
  initialAvatarUrl: string | null;
  lang: Lang;
}) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // allow re-selecting the same file later

    if (!file.type.startsWith("image/")) {
      setError(t("profile.avatarErrType", lang));
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(t("profile.avatarErrSize", lang));
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const supabase = supabaseBrowser();
      const ext = file.name.split(".").pop() || "jpg";
      // Fixed filename per user (not a random one) so re-uploading
      // overwrites in place — no orphaned old files accumulating in the
      // bucket, and no need to null out a stale path anywhere else.
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) {
        setError(t("common.somethingWentWrong", lang));
        return;
      }

      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-bust: same path, new content — without a query param the
      // browser (and any CDN in front of the bucket) would keep showing
      // the previous image after an update.
      const freshUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: freshUrl })
        .eq("id", userId)
        .select("id")
        .maybeSingle();
      if (updateError) {
        setError(t("common.somethingWentWrong", lang));
        return;
      }

      setAvatarUrl(freshUrl);
    } catch {
      setError(t("common.somethingWentWrong", lang));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative w-16 h-16 rounded-full overflow-hidden border border-line shrink-0 bg-bg flex items-center justify-center hover:opacity-80 transition"
        disabled={uploading}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-uploaded content from a dynamic Storage URL, not a static local asset next/image would optimize meaningfully.
          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl">🧑</span>
        )}
      </button>
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-sm font-bold text-navy hover:underline disabled:opacity-50"
        >
          {uploading ? t("profile.avatarUploading", lang) : t("profile.avatarChange", lang)}
        </button>
        {error && (
          <div className="mt-1">
            <ErrorState message={error} />
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
    </div>
  );
}
