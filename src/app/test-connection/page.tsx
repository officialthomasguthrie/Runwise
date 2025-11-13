"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

export default function TestPage() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Testing...');
  const [envVars, setEnvVars] = useState<any>({});

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Check environment variables
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        setEnvVars({
          hasUrl: !!url,
          hasKey: !!key,
          urlLength: url?.length || 0,
          keyLength: key?.length || 0
        });

        if (!url || !key) {
          setConnectionStatus('Missing environment variables');
          return;
        }

        // Test Supabase connection
        const supabase = createClient();
        
        // Test auth
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('Session test:', { session, sessionError });
        
        // Test database connection
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('count')
          .limit(1);
        
        console.log('Teams test:', { teamsData, teamsError });
        
        if (teamsError) {
          setConnectionStatus(`Database error: ${teamsError.message}`);
        } else {
          setConnectionStatus('Connection successful');
        }
        
      } catch (error) {
        console.error('Test error:', error);
        setConnectionStatus(`Error: ${error}`);
      }
    };

    testConnection();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Environment Variables:</h2>
        <pre className="bg-gray-100 p-4 rounded">
          {JSON.stringify(envVars, null, 2)}
        </pre>
      </div>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Connection Status:</h2>
        <p className="text-lg">{connectionStatus}</p>
      </div>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Console Logs:</h2>
        <p className="text-sm text-gray-600">Check browser console for detailed logs</p>
      </div>
    </div>
  );
}
