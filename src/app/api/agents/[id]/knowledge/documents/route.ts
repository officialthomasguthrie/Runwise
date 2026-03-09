/**
 * POST /api/agents/[id]/knowledge/documents — upload a document for agent knowledge
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { requireAgentBuilderAccess } from "@/lib/agents/plan-gate";

const BUCKET = "agent-knowledge";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "application/json",
];

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gate = await requireAgentBuilderAccess(user.id);
    if (gate) return gate;

    const { id: agentId } = await context.params;
    const admin = createAdminClient();

    // Verify agent exists and user owns it
    const { data: agent, error: agentError } = await (admin as any)
      .from("agents")
      .select("id")
      .eq("id", agentId)
      .eq("user_id", user.id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith("text/")) {
      return NextResponse.json(
        { error: "Unsupported file type. Allowed: PDF, TXT, MD, DOC, DOCX, CSV, JSON" },
        { status: 400 }
      );
    }

    // Ensure bucket exists
    const { data: buckets } = await admin.storage.listBuckets();
    if (!buckets?.some((b) => b.name === BUCKET)) {
      await admin.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
      });
    }

    const ext = file.name.split(".").pop() || "bin";
    const fileName = `${agentId}/${user.id}-${Date.now()}.${ext}`;
    const fileBuffer = await file.arrayBuffer();

    const { data: uploadData, error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading document:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload document" },
        { status: 500 }
      );
    }

    const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      path: fileName,
      url: urlData.publicUrl,
    });
  } catch (error) {
    console.error("Error in document upload:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
