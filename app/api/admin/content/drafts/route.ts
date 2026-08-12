import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { createContentDraftSchema, validateContentDraftPayload } from "@/shared/schemas/content-draft.schema";
import { logger } from "@/shared/lib/logger";

/**
 * POST /api/admin/content/drafts
 * Body: { targetTable, targetId, action: 'upsert', payload } | { targetTable, targetId, action: 'delete' }
 *
 * Same shape as /api/admin/roles: this route does NOT check
 * content.manage itself — 062's RLS INSERT policy on content_drafts
 * already requires it, so a rejected write surfaces as Postgres 42501.
 * This route's own job is shape validation only.
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

  const parsedEnvelope = createContentDraftSchema.safeParse(body);
  if (!parsedEnvelope.success) {
    return NextResponse.json({ error: parsedEnvelope.error.issues[0]?.message || "Invalid request" }, { status: 400 });
  }

  const draft = parsedEnvelope.data;

  const insertRow: Record<string, unknown> = {
    target_table: draft.targetTable,
    target_id: draft.targetId,
    action: draft.action,
    created_by: user.id,
  };

  if (draft.action === "upsert") {
    const parsedPayload = validateContentDraftPayload(draft.targetTable, draft.payload);
    if (!parsedPayload.success) {
      return NextResponse.json({ error: parsedPayload.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }
    insertRow.payload = parsedPayload.data;
  } else {
    insertRow.payload = {};
  }

  const { data, error } = await supabase.from("content_drafts").insert(insertRow).select("id").single();

  if (error) {
    if (error.code === "42501") {
      logger.warn("admin_content_draft_denied", { userId: user.id, targetTable: draft.targetTable });
      return NextResponse.json({ error: "ليست لديك صلاحية إدارة المحتوى" }, { status: 403 });
    }
    logger.error("admin_content_draft_create_failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "Failed to create draft" }, { status: 500 });
  }

  logger.info("admin_content_draft_created", { userId: user.id, targetTable: draft.targetTable, draftId: data.id });

  return NextResponse.json({ ok: true, draftId: data.id });
}
