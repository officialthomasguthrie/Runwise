"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

export default function TestPage() {
  const [testResult, setTestResult] = useState<string>('Testing...');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const testDatabase = async () => {
      try {
        const supabase = createClient();
        
        // Test 1: Check if we can get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log('User test:', { user, userError });
        setUser(user);
        
        if (userError) {
          setTestResult(`User error: ${userError.message}`);
          return;
        }

        if (!user) {
          setTestResult('No user found - please log in first');
          return;
        }

        // Test 2: Check if we can access the teams table
        const { data: teams, error: teamsError } = await supabase
          .from('teams')
          .select('*')
          .limit(5);
        
        console.log('Teams test:', { teams, teamsError });
        
        if (teamsError) {
          setTestResult(`Teams table error: ${teamsError.message}`);
          return;
        }

        // Test 3: Check if we can access team_members table
        const { data: members, error: membersError } = await supabase
          .from('team_members')
          .select('*')
          .eq('user_id', user.id);
        
        console.log('Team members test:', { members, membersError });
        
        if (membersError) {
          setTestResult(`Team members error: ${membersError.message}`);
          return;
        }

        setTestResult(`Success! Found ${teams?.length || 0} teams and ${members?.length || 0} members for user ${user.email}`);
        
      } catch (error) {
        console.error('Test error:', error);
        setTestResult(`Test error: ${error}`);
      }
    };

    testDatabase();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Database Test</h1>
      <div className="bg-gray-100 p-4 rounded">
        <p><strong>Result:</strong> {testResult}</p>
        {user && (
          <div className="mt-4">
            <p><strong>User:</strong> {user.email}</p>
            <p><strong>User ID:</strong> {user.id}</p>
            <p><strong>First Name:</strong> {user.user_metadata?.first_name || 'Not set'}</p>
            <p><strong>Last Name:</strong> {user.user_metadata?.last_name || 'Not set'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
