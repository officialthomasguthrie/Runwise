import { NextResponse } from "next/server";
import { getGmailAuthUrl } from "@/lib/gmail-api";

export async function GET() {
  try {
    const authUrl = getGmailAuthUrl();
    
    return NextResponse.json({ 
      authUrl,
      message: "Gmail authentication URL generated"
    });
  } catch (error) {
    console.error('Error generating Gmail auth URL:', error);
    return NextResponse.json(
      { error: "Failed to generate Gmail auth URL" },
      { status: 500 }
    );
  }
}
