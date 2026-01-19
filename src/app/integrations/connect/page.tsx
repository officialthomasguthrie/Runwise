"use client";

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { ConnectIntegrationModal } from '@/components/ui/connect-integration-modal';
import { getConnectionConfig } from '@/lib/integrations/connection-schemas';
import { useTheme } from 'next-themes';

function ConnectIntegrationPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const serviceName = searchParams.get('service');
  const [config, setConfig] = React.useState<any>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!serviceName || !mounted) return;

    const connectionConfig = getConnectionConfig(
      serviceName,
      async (values) => {
        try {
          // Handle connection based on service
          if (serviceName === 'twilio') {
            // Save Account SID
            const response1 = await fetch('/api/integrations/store-credential', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                serviceName: 'twilio',
                credentialType: 'account_sid',
                credentialValue: values.accountSid.trim()
              })
            });

            if (!response1.ok) {
              const error = await response1.json().catch(() => ({ error: 'Failed to save Account SID' }));
              throw new Error(error.error || error.message || 'Failed to save Account SID');
            }

            // Save Auth Token
            const response2 = await fetch('/api/integrations/store-credential', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                serviceName: 'twilio',
                credentialType: 'auth_token',
                credentialValue: values.authToken.trim()
              })
            });

            if (!response2.ok) {
              const error = await response2.json().catch(() => ({ error: 'Failed to save Auth Token' }));
              throw new Error(error.error || error.message || 'Failed to save Auth Token');
            }
          } else {
            // Single credential services
            let credentialType = 'api_key';
            let credentialValue = '';
            
            if (serviceName === 'openai') {
              credentialType = 'api_key';
              credentialValue = values.apiKey;
            } else if (serviceName === 'sendgrid') {
              credentialType = 'api_key';
              credentialValue = values.apiKey;
            } else if (serviceName === 'discord') {
              credentialType = 'bot_token';
              credentialValue = values.botToken;
            } else if (serviceName === 'stripe') {
              credentialType = 'secret_key';
              credentialValue = values.secretKey;
            } else if (serviceName === 'twitter') {
              credentialType = 'bearer_token';
              credentialValue = values.bearerToken;
            }

            if (!credentialValue?.trim()) {
              throw new Error('Credential value is required');
            }

            const response = await fetch('/api/integrations/store-credential', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                serviceName,
                credentialType,
                credentialValue: credentialValue.trim()
              })
            });

            if (!response.ok) {
              const error = await response.json().catch(() => ({ error: 'Failed to save credential' }));
              throw new Error(error.error || error.message || 'Failed to save credential');
            }
          }

          // Notify parent window of success
          if (window.opener) {
            window.opener.postMessage({ type: 'integration-connected', service: serviceName }, window.location.origin);
          }
          
          // Close the popup window
          window.close();
        } catch (error: any) {
          throw error; // Re-throw to be handled by modal
        }
      },
      () => {
        // On cancel, close the window
        if (window.opener) {
          window.opener.postMessage({ type: 'integration-connection-cancelled', service: serviceName }, window.location.origin);
        }
        window.close();
      },
      mounted && theme === 'dark'
    );

    if (connectionConfig) {
      setConfig(connectionConfig);
    }
  }, [serviceName, mounted, theme]);

  if (!serviceName || !config) {
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ConnectIntegrationModal
      open={true}
      onOpenChange={(open) => {
        if (!open) {
          if (window.opener) {
            window.opener.postMessage({ type: 'integration-connection-cancelled', service: serviceName }, window.location.origin);
          }
          window.close();
        }
      }}
      config={config}
      popupMode={true}
    />
  );
}

export default function ConnectIntegrationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground">Loading...</p>
        </div>
      </div>
    }>
      <ConnectIntegrationPageContent />
    </Suspense>
  );
}

