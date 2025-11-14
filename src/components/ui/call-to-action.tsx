'use client';

import { MoveRight, PhoneCall } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProCheckoutButton } from "@/components/billing/pro-checkout-button";

function CTA() {
  return (
    <div className="w-full py-8 lg:py-12 bg-background" suppressHydrationWarning={true}>
      <div className="container mx-auto px-4" suppressHydrationWarning={true}>
        <div className="flex flex-col text-center bg-background rounded-md p-4 lg:p-14 gap-8 items-center" suppressHydrationWarning={true}>
          <div>
            <Badge className="bg-purple-600 text-white hover:bg-purple-700">Get started</Badge>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tighter leading-tight max-w-xl font-geist text-foreground">
              Ready to transform your workflows?
            </h3>
            <p className="text-lg 2xl:text-base leading-relaxed tracking-tight text-muted-foreground max-w-xl font-geist">
              Join thousands of teams already using Runwise AI to automate their workflows. 
              Turn natural language into fully functional integrations in minutes, not hours.
            </p>
          </div>
          <div className="flex flex-row gap-4">
            <Button className="gap-4 border-border text-foreground bg-transparent hover:bg-accent hover:text-accent-foreground" variant="outline">
              Contact Sales <PhoneCall className="w-4 h-4" />
            </Button>
            <ProCheckoutButton
              variant="outline"
              className="gap-4 border-border text-foreground bg-transparent hover:bg-accent hover:text-accent-foreground"
            >
              Buy Runwise Pro <MoveRight className="w-4 h-4" />
            </ProCheckoutButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export { CTA };
