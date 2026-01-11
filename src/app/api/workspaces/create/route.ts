import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const CreateWorkspaceSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  lab_type: z.enum(["econ", "derivatives", "housing", "portfolio", "valuation"]),
  state: z.record(z.string(), z.unknown()),
  is_public: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional().default([]),
});

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = CreateWorkspaceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "bad_request", details: parsed.error }, { status: 400 });
    }

    const { title, description, lab_type, state, is_public, tags } = parsed.data;

    // Create workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .insert({
        user_id: user.id,
        title,
        description,
        lab_type,
        state,
        is_public,
        published_at: is_public ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (workspaceError) {
      return NextResponse.json({ error: "workspace_creation_failed", detail: workspaceError.message }, { status: 500 });
    }

    // Add tags if provided
    if (tags.length > 0) {
      const tagInserts = tags.map(tag => ({
        workspace_id: workspace.id,
        tag: tag.toLowerCase(),
      }));

      const { error: tagsError } = await supabase
        .from("workspace_tags")
        .insert(tagInserts);

      if (tagsError) {
        console.error("Failed to add tags:", tagsError);
      }
    }

    // Create initial version
    const { error: versionError } = await supabase
      .from("workspace_versions")
      .insert({
        workspace_id: workspace.id,
        version_number: 1,
        state,
        change_summary: "Initial version",
        created_by: user.id,
      });

    if (versionError) {
      console.error("Failed to create initial version:", versionError);
    }

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        title: workspace.title,
        slug: workspace.slug,
        is_public: workspace.is_public,
        created_at: workspace.created_at,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: "internal_error", detail: String(e?.message || e) }, { status: 500 });
  }
}
