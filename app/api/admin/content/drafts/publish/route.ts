import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { publishContentDraftSchema } from "@/shared/schemas/content-draft.schema";
import { logger } from "@/shared/lib/logger";

/**
 * POST /api/admin/content/drafts/publish
 * Body: { draftId }
 *
 * publish_content_draft() (062) checks content.manage itself and does
 * the real target-table upsert/delete — this route validates shape and
 * maps 42501 to 403, same pattern as every other admin write route.
 */
export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = publishContentDraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("publish_content_draft", { p_draft_id: parsed.data.draftId });

  if (error) {
    if (error.code === "42501") {
      logger.warn("admin_content_publish_denied", { userId: user.id, draftId: parsed.data.draftId });
      return NextResponse.json({ error: "ليست لديك صلاحية إدارة المحتوى" }, { status: 403 });
    }
    logger.error("admin_content_publish_failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "Failed to publish draft" }, { status: 500 });
  }

  if (data?.published !== true) {
    return NextResponse.json({ error: data?.reason || "Publish rejected" }, { status: 409 });
  }

  logger.info("admin_content_draft_published", { userId: user.id, draftId: parsed.data.draftId });

  return NextResponse.json({ ok: true, result: data });
}
