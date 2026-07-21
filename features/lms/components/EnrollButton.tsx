"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/shared/hooks/useLang";
import { Button } from "@/shared/components/Button";
import { ErrorState } from "@/shared/components/Feedback";
import { supabaseBrowser } from "@/shared/lib/supabase/client";
import { translateAuthError } from "@/shared/i18n/supabase-errors";

export function EnrollButton({ courseId, userId }: { courseId: string; userId: string }) {
  const router = useRouter();
  const { lang, t } = useLang("ar");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnroll() {
    setLoading(true);
    setError(null);
    try {
      const supabase = supabaseBrowser();
      const { error: enrollError } = await supabase
        .from("enrollments")
        .upsert(
          { user_id: userId, course_id: courseId },
          { onConflict: "user_id,course_id", ignoreDuplicates: true }
        );
      if (enrollError) {
        setError(translateAuthError(enrollError, lang));
        return;
      }
      router.refresh();
    } catch (err) {
      setError(translateAuthError(err, lang));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-3">
          <ErrorState message={error} />
        </div>
      )}
      <Button onClick={handleEnroll} disabled={loading}>
        {loading ? t("lms.enrolling") : t("lms.enroll")}
      </Button>
    </div>
  );
}
