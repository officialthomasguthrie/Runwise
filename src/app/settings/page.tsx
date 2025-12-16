"use client";

import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Key } from "react-aria-components";
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar";
import { BlankHeader } from "@/components/ui/blank-header";
import { Tabs } from "@/components/application/tabs/tabs";
import { NativeSelect } from "@/components/base/select/select-native";
import { ProfileSettings } from "@/components/ui/profile-settings";
import { UsageSettings } from "@/components/ui/usage-settings";
import { BillingPricing } from "@/components/ui/billing-pricing";
import { IntegrationsSettings } from "@/components/ui/integrations-settings";
import { AuthenticationSettings } from "@/components/ui/authentication-settings";
import { NotificationsSettings } from "@/components/ui/notifications-settings";
import { ExportSettings } from "@/components/ui/export-settings";

const tabs = [
  { id: "profile", label: "Profile" },
  { id: "usage", label: "Usage" },
  { id: "authentication", label: "Authentication" },
  { id: "billing", label: "Billing" },
  { id: "integrations", label: "Integrations" },
  { id: "notifications", label: "Notifications" },
  { id: "export", label: "Export" },
];

function SettingsPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  
  // Initialize tab from URL or default to profile
  const [selectedTabIndex, setSelectedTabIndex] = useState<Key>(
    (tabFromUrl && tabs.some(t => t.id === tabFromUrl)) ? tabFromUrl : "profile"
  );

  // Update tab when URL changes
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabs.some(t => t.id === tabFromUrl)) {
      setSelectedTabIndex(tabFromUrl);
    }
  }, [searchParams]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen w-screen bg-background">
      <CollapsibleSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <BlankHeader />
        <main className="flex h-full grow flex-col overflow-auto relative scrollbar-hide">
          <div className="relative pb-12">
            <div className="relative z-10 px-4 sm:px-6 lg:px-8 pb-4">
              <h1 className="text-4xl sm:text-3xl md:text-3xl lg:text-4xl xl:text-5xl tracking-tighter font-geist text-foreground leading-tight mt-7 mb-8">
                Settings
              </h1>
              
              <>
                <NativeSelect
                  aria-label="Tabs"
                  value={selectedTabIndex as string}
                  onChange={(event) => setSelectedTabIndex(event.target.value)}
                  options={tabs.map((tab) => ({ label: tab.label, value: tab.id }))}
                  className="w-80 md:hidden"
                />

                <Tabs 
                  orientation="vertical" 
                  selectedKey={selectedTabIndex} 
                  onSelectionChange={setSelectedTabIndex}
                  className="flex flex-col md:flex-row gap-6 w-full"
                >
                  <div className="hidden md:block w-max flex-shrink-0">
                    <Tabs.List type="button-gray" items={tabs}>
                      {(tab) => <Tabs.Item {...tab} />}
                    </Tabs.List>
                  </div>

                  <div className="flex-1 min-w-0">
                    <Tabs.Panel id="profile">
                      <ProfileSettings />
                    </Tabs.Panel>
                    <Tabs.Panel id="usage">
                      <UsageSettings />
                    </Tabs.Panel>
                    <Tabs.Panel id="authentication">
                      <AuthenticationSettings />
                    </Tabs.Panel>
                    <Tabs.Panel id="billing">
                      <BillingPricing />
                    </Tabs.Panel>
                    <Tabs.Panel id="integrations">
                      <IntegrationsSettings />
                    </Tabs.Panel>
                    <Tabs.Panel id="notifications">
                      <NotificationsSettings />
                    </Tabs.Panel>
                    <Tabs.Panel id="export">
                      <ExportSettings />
                    </Tabs.Panel>
                  </div>
                </Tabs>
              </>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen bg-background">
        <CollapsibleSidebar />
        <div className="flex-1 flex-col overflow-hidden">
          <BlankHeader />
          <main className="flex h-full grow flex-col overflow-auto relative scrollbar-hide">
            <div className="relative pb-12">
              <div className="relative z-10 px-4 sm:px-6 lg:px-8 pb-4">
                <h1 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl xl:text-5xl tracking-tighter font-geist text-foreground leading-tight mt-7 mb-8">
                  Settings
                </h1>
              </div>
            </div>
          </main>
        </div>
      </div>
    }>
      <SettingsPageContent />
    </Suspense>
  );
}
