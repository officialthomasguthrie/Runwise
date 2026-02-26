"use client";

import { X } from "lucide-react";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-[#ffffff1a] bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-pink-400/70 focus-within:bg-pink-500/10" suppressHydrationWarning={true}>
    {children}
  </div>
);

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setEmail('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  useEffect(() => {
    // Handle ESC key to close modal
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email.trim()) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    try {
      const { error } = await resetPassword(email.trim());

      if (error) {
        setError(error.message || 'Failed to send reset email. Please try again.');
      } else {
        setSuccess(true);
        if (onSuccess) {
          onSuccess();
        }
        // Auto-close after 3 seconds
        setTimeout(() => {
          onClose();
        }, 3000);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      suppressHydrationWarning={true}
    >
      <div
        className="relative w-full max-w-xs bg-background border border-[#ffffff1a] rounded-2xl p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        suppressHydrationWarning={true}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold leading-tight mb-1">Reset Password</h2>
            <p className="text-xs text-muted-foreground">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {success ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                <p className="text-xs text-green-400">
                  Password reset email sent! Please check your inbox and follow the instructions.
                </p>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                This window will close automatically...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Email Address</label>
                <GlassInputWrapper>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full bg-transparent text-xs p-1.5 rounded-lg focus:outline-none text-foreground placeholder:text-muted-foreground"
                    disabled={loading}
                    autoFocus
                  />
                </GlassInputWrapper>
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2">
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-[#ffffff1a] bg-transparent py-1.5 text-xs text-foreground hover:bg-foreground/5 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg border border-[#ffffff1a] bg-[#bd28b3ba] py-1.5 text-xs text-white cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      <span>Sending...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-[5px]">
                      <span>Send Reset Link</span>
                      <img src="/assets/icons/arrow-top.svg" className="w-4 h-4" alt="arrow-top" />
                    </div>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

