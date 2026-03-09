import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

const ACCEPTED_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/json",
  "text/html",
];

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|txt|md|csv|doc|docx|xls|xlsx|json|html)$/i)) {
      return NextResponse.json(
        { error: "File type not supported. Use PDF, TXT, MD, CSV, DOC, DOCX, XLS, XLSX, JSON, or HTML." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop() || "bin";
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${agentId}/${Date.now()}-${safeName}`;

    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await adminClient.storage
      .from("agent-documents")
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      if (uploadError.message?.includes("Bucket not found") || uploadError.message?.includes("not found")) {
        const { error: createError } = await adminClient.storage.createBucket("agent-documents", {
          public: false,
          fileSizeLimit: "10MB",
        });
        if (createError) {
          console.error("Error creating bucket:", createError);
          return NextResponse.json({ error: "Failed to create storage" }, { status: 500 });
        }
        const { error: retryError } = await adminClient.storage
          .from("agent-documents")
          .upload(fileName, fileBuffer, { contentType: file.type, upsert: false });
        if (retryError) {
          console.error("Retry upload error:", retryError);
          return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
        }
      } else {
        console.error("Upload error:", uploadError);
        return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      filename: file.name,
      path: fileName,
    });
  } catch (error) {
    console.error("Knowledge upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
