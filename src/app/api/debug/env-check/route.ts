/**
 * Debug route to check environment variables (development only)
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  const googleIntegrationVars = {
    GOOGLE_INTEGRATION_CLIENT_ID: {
      exists: !!process.env.GOOGLE_INTEGRATION_CLIENT_ID,
      length: process.env.GOOGLE_INTEGRATION_CLIENT_ID?.length || 0,
      value: process.env.GOOGLE_INTEGRATION_CLIENT_ID ? 
        `${process.env.GOOGLE_INTEGRATION_CLIENT_ID.substring(0, 20)}...` : 
        'NOT SET'
    },
    GOOGLE_INTEGRATION_CLIENT_SECRET: {
      exists: !!process.env.GOOGLE_INTEGRATION_CLIENT_SECRET,
      length: process.env.GOOGLE_INTEGRATION_CLIENT_SECRET?.length || 0,
      value: process.env.GOOGLE_INTEGRATION_CLIENT_SECRET ? 
        `${process.env.GOOGLE_INTEGRATION_CLIENT_SECRET.substring(0, 10)}...` : 
        'NOT SET'
    }
  };

  const allGoogleVars = Object.keys(process.env)
    .filter(key => key.includes('GOOGLE'))
    .reduce((acc, key) => {
      acc[key] = {
        exists: true,
        length: process.env[key]?.length || 0
      };
      return acc;
    }, {} as Record<string, any>);

  return NextResponse.json({
    googleIntegrationVars,
    allGoogleVars,
    nodeEnv: process.env.NODE_ENV,
    cwd: process.cwd()
  });
}

