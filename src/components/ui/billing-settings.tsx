"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  DollarSign, 
  Calendar, 
  Download, 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle,
  AlertCircle,
  Loader2,
  CreditCardIcon,
  Receipt,
  Settings,
  Zap,
  Crown,
  Star,
  Building,
  User
} from "lucide-react";

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank';
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

interface Subscription {
  id: string;
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'past_due';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
}

interface BillingHistory {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  description: string;
  invoiceUrl?: string;
}

export function BillingSettings() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription>({
    id: 'sub_123',
    plan: 'pro',
    status: 'active',
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    amount: 29,
    currency: 'USD',
    interval: 'month'
  });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: 'pm_1',
      type: 'card',
      last4: '4242',
      brand: 'visa',
      expiryMonth: 12,
      expiryYear: 2025,
      isDefault: true
    }
  ]);
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([
    {
      id: 'inv_1',
      date: new Date().toISOString(),
      amount: 29,
      currency: 'USD',
      status: 'paid',
      description: 'Pro Plan - Monthly',
      invoiceUrl: '#'
    },
    {
      id: 'inv_2',
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 29,
      currency: 'USD',
      status: 'paid',
      description: 'Pro Plan - Monthly',
      invoiceUrl: '#'
    }
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load billing data
  useEffect(() => {
    const loadBillingData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        // In a real app, this would load from billing API
        // For now, we'll use mock data
      } catch (error) {
        console.error('Error loading billing data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBillingData();
  }, [user]);

  // Handle plan change
  const handlePlanChange = async (newPlan: 'free' | 'pro' | 'enterprise') => {
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      // In a real app, this would update the subscription
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      setSubscription(prev => ({ ...prev, plan: newPlan }));
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error changing plan:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle payment method operations
  const handleAddPaymentMethod = async () => {
    setIsSaving(true);
    try {
      // In a real app, this would open payment method form
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error adding payment method:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePaymentMethod = async (methodId: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) {
      return;
    }

    setIsSaving(true);
    try {
      setPaymentMethods(prev => prev.filter(method => method.id !== methodId));
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error deleting payment method:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefaultPaymentMethod = async (methodId: string) => {
    setIsSaving(true);
    try {
      setPaymentMethods(prev => 
        prev.map(method => ({
          ...method,
          isDefault: method.id === methodId
        }))
      );
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error setting default payment method:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle invoice download
  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      // In a real app, this would download the invoice
      console.log('Downloading invoice:', invoiceId);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2 text-muted-foreground">Loading billing information...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Billing Header */}
      <div>
        <div className="mb-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Billing & Subscription
            </h2>
            <p className="text-muted-foreground mt-1">
              Manage your subscription, payment methods, and billing information
            </p>
          </div>
        </div>
      </div>

      {/* Current Subscription */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Crown className="h-4 w-4" />
          Current Subscription
        </h3>
        <p className="text-muted-foreground mb-6">
          Your current plan and billing information
        </p>
        
        <div className="p-6 bg-muted/50 border border-border rounded-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-md">
                <Crown className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="text-xl font-semibold">
                  {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan
                </h4>
                <p className="text-muted-foreground">
                  ${subscription.amount}/{subscription.interval}
                </p>
              </div>
            </div>
            <Badge 
              variant={subscription.status === 'active' ? 'default' : 'secondary'}
              className={subscription.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : ''}
            >
              {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Current Period</Label>
              <div className="p-3 bg-background border border-border rounded-md">
                <p className="text-sm">
                  {new Date(subscription.currentPeriodStart).toLocaleDateString()} - {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Next Billing Date</Label>
              <div className="p-3 bg-background border border-border rounded-md">
                <p className="text-sm">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => handlePlanChange('free')}
              disabled={isSaving || subscription.plan === 'free'}
              variant="outline"
              size="sm"
            >
              Downgrade to Free
            </Button>
            <Button
              onClick={() => handlePlanChange('enterprise')}
              disabled={isSaving || subscription.plan === 'enterprise'}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              size="sm"
            >
              Upgrade to Enterprise
            </Button>
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Payment Methods */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <CreditCardIcon className="h-4 w-4" />
          Payment Methods
        </h3>
        <p className="text-muted-foreground mb-6">
          Manage your payment methods and billing information
        </p>
        
        <div className="space-y-4">
          {paymentMethods.map((method) => (
            <div key={method.id} className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-md">
                  <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">
                      {method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} •••• {method.last4}
                    </h4>
                    {method.isDefault && (
                      <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Expires {method.expiryMonth}/{method.expiryYear}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!method.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetDefaultPaymentMethod(method.id)}
                    disabled={isSaving}
                  >
                    Set Default
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeletePaymentMethod(method.id)}
                  disabled={isSaving}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          
          <Button
            onClick={handleAddPaymentMethod}
            disabled={isSaving}
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Payment Method
          </Button>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Billing History */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Receipt className="h-4 w-4" />
          Billing History
        </h3>
        <p className="text-muted-foreground mb-6">
          View and download your past invoices
        </p>
        
        <div className="space-y-3">
          {billingHistory.map((invoice) => (
            <div key={invoice.id} className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-md">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-md">
                  <Receipt className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-medium">{invoice.description}</h4>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{new Date(invoice.date).toLocaleDateString()}</span>
                    <span>${invoice.amount} {invoice.currency}</span>
                    <Badge 
                      variant={invoice.status === 'paid' ? 'default' : 'secondary'}
                      className={invoice.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : ''}
                    >
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadInvoice(invoice.id)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Separator className="my-8" />

      {/* Billing Information */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Settings className="h-4 w-4" />
          Billing Information
        </h3>
        <p className="text-muted-foreground mb-6">
          Update your billing address and tax information
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="billingEmail">Billing Email</Label>
            <div className="p-3 bg-muted/50 border border-border rounded-md">
              <p className="text-sm">{user?.email || 'user@example.com'}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="billingAddress">Billing Address</Label>
            <div className="p-3 bg-muted/50 border border-border rounded-md">
              <p className="text-sm">123 Main Street, City, State 12345</p>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <Button
            variant="outline"
            disabled={isSaving}
          >
            <Edit className="h-4 w-4 mr-2" />
            Update Billing Information
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6">
        <div className="flex items-center gap-2">
          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Billing settings updated successfully!</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Failed to update billing settings. Please try again.</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CreditCard className="h-4 w-4" />
          <span>Last updated: {new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
