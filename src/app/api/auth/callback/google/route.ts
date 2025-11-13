import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/gmail-api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth2 error:', error);
      return NextResponse.redirect(new URL('/dashboard?error=oauth_error', request.url));
    }

    if (!code) {
      console.error('No authorization code received');
      return NextResponse.redirect(new URL('/dashboard?error=no_code', request.url));
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    
    console.log('Gmail OAuth2 tokens received:', {
      access_token: tokens.access_token ? '***' : 'none',
      refresh_token: tokens.refresh_token ? '***' : 'none',
      expiry_date: tokens.expiry_date
    });

    // In a real app, you'd store these tokens securely in a database
    // For now, we'll just log them and redirect
    console.log('Tokens:', tokens);

    return NextResponse.redirect(new URL('/dashboard?success=gmail_connected', request.url));
  } catch (error) {
    console.error('Error in OAuth2 callback:', error);
    return NextResponse.redirect(new URL('/dashboard?error=callback_error', request.url));
  }
}
