import { NextResponse } from "next/server";
import { inngest } from "../../../inngest/client";

// Opt out of caching; every request should send a new event
export const dynamic = "force-dynamic";

// Create a simple async Next.js API route handler
export async function GET() {
  try {
    // Send your event payload to Inngest
    await inngest.send({
      name: "email/received",
      data: {
        id: "test-email-" + Date.now(),
        sender: "test@example.com",
        subject: "Test Email for Auto-Reply",
        body: "Hello, I'm testing the email auto-responder functionality. Can you help me with my inquiry?",
        timestamp: new Date().toISOString()
      },
    });

    return NextResponse.json({ 
      message: "Email auto-responder event sent!",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error sending email event:', error);
    return NextResponse.json(
      { error: "Failed to send email event" },
      { status: 500 }
    );
  }
}

// POST endpoint for manual email testing
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sender, subject, body: emailBody } = body;

    // Send your event payload to Inngest
    await inngest.send({
      name: "email/received",
      data: {
        id: "manual-email-" + Date.now(),
        sender: sender || "test@example.com",
        subject: subject || "Manual Test Email",
        body: emailBody || "This is a manual test of the email auto-responder.",
        timestamp: new Date().toISOString()
      },
    });

    return NextResponse.json({ 
      message: "Manual email auto-responder event sent!",
      emailData: {
        sender: sender || "test@example.com",
        subject: subject || "Manual Test Email",
        body: emailBody || "This is a manual test of the email auto-responder."
      }
    });
  } catch (error) {
    console.error('Error sending manual email event:', error);
    return NextResponse.json(
      { error: "Failed to send manual email event" },
      { status: 500 }
    );
  }
}
