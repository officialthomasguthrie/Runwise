import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyze incoming email and generate appropriate reply
 */
export async function analyzeEmailAndGenerateReply(emailData: any) {
  try {
    const prompt = `
You are an AI assistant for Runwise, an automation platform. You need to analyze an incoming email and generate an appropriate auto-reply.

Email Details:
- From: ${emailData.sender}
- Subject: ${emailData.subject}
- Body: ${emailData.body}

Instructions:
1. Analyze the email content and intent
2. Determine if it requires a response
3. Generate a professional, helpful reply that:
   - Acknowledges the sender
   - Addresses their inquiry appropriately
   - Mentions Runwise if relevant
   - Is concise but complete
   - Maintains a professional tone

Rules:
- If it's spam or promotional, politely decline
- If it's a support request, provide helpful guidance
- If it's a business inquiry, respond professionally
- Keep replies under 200 words
- Always be polite and professional

Generate a reply that would be appropriate for this email:
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a professional AI assistant for Runwise, an automation platform. Generate helpful, professional email replies."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || "Thank you for your email. We'll get back to you soon.";
    
    console.log('Generated reply:', reply);
    return reply;
  } catch (error) {
    console.error('Error generating reply:', error);
    // Fallback reply
    return "Thank you for your email. We'll get back to you soon.";
  }
}

/**
 * Check if email should trigger auto-reply
 */
export async function shouldAutoReply(emailData: any) {
  try {
    const prompt = `
Analyze this email and determine if it should trigger an auto-reply:

From: ${emailData.sender}
Subject: ${emailData.subject}
Body: ${emailData.body}

Rules for auto-reply:
- YES: Business inquiries, support requests, general questions
- NO: Spam, promotional emails, automated messages, out-of-office replies
- NO: Emails from the same domain (runwisedev@gmail.com)

Respond with only "YES" or "NO":
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an email filter. Respond with only YES or NO."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 10,
      temperature: 0.1,
    });

    const response = completion.choices[0]?.message?.content?.trim().toUpperCase();
    return response === "YES";
  } catch (error) {
    console.error('Error checking auto-reply eligibility:', error);
    // Default to false for safety
    return false;
  }
}
