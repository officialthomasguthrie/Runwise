import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import React, { useState } from 'react';
import { ForgotPasswordModal } from './forgot-password-modal';

// --- HELPER COMPONENTS (ICONS) ---


interface SignInPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroImageSrc?: string;
  onSignIn?: (event: React.FormEvent<HTMLFormElement>) => void;
  onGoogleSignIn?: () => void;
  onMicrosoftSignIn?: () => void;
  onResetPassword?: () => void;
  onCreateAccount?: () => void;
  onGoBack?: () => void;
}

// --- SUB-COMPONENTS ---

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-[#e9e4dd] bg-white/80 backdrop-blur-sm transition-colors focus-within:border-[#e0cfd8]/90 focus-within:bg-pink-50/90" suppressHydrationWarning={true}>
    <style jsx>{`
      input:-webkit-autofill,
      input:-webkit-autofill:hover,
      input:-webkit-autofill:focus,
      input:-webkit-autofill:active {
        -webkit-box-shadow: 0 0 0 30px transparent inset !important;
        -webkit-text-fill-color: inherit !important;
        background-color: transparent !important;
        background-clip: content-box !important;
        transition: background-color 5000s ease-in-out 0s;
      }
    `}</style>
    {children}
  </div>
);

// --- MAIN COMPONENT ---

export const SignInPage: React.FC<SignInPageProps> = ({
  title = <span className="font-light text-stone-900 tracking-tighter">Welcome</span>,
  description = "Access your account and continue your journey with us",
  heroImageSrc,
  onSignIn,
  onGoogleSignIn,
  onMicrosoftSignIn,
  onResetPassword,
  onCreateAccount,
  onGoBack,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row font-geist w-[100dvw] relative bg-[#f5f3ef] text-stone-900" suppressHydrationWarning={true}>
      {/* Go Back Button */}
      {onGoBack && (
        <button
          onClick={onGoBack}
          className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-2 text-xs text-stone-600 hover:text-stone-900 rounded-lg backdrop-blur-sm"
        >
          <ArrowLeft className="w-3 h-3" />
          Go Back
        </button>
      )}
      
      {/* Left column: sign-in form */}
      <section className="flex-1 flex items-center justify-center p-3" suppressHydrationWarning={true}>
        <div className="w-full max-w-xs" suppressHydrationWarning={true}>
          <div className="flex flex-col gap-2" suppressHydrationWarning={true}>
            <h1 className="animate-element animate-delay-100 text-xl md:text-2xl font-semibold leading-tight">{title}</h1>
            <p className="animate-element animate-delay-200 text-xs text-stone-600">{description}</p>

            <form className="space-y-2" onSubmit={onSignIn} suppressHydrationWarning={true}>
              <div className="animate-element animate-delay-300" suppressHydrationWarning={true}>
                <label className="text-xs font-medium text-stone-700">Email Address</label>
                <GlassInputWrapper>
                  <input name="email" type="email" placeholder="Enter your email address" autoComplete="off" className="w-full bg-transparent text-xs p-1.5 rounded-lg focus:outline-none text-stone-900 placeholder:text-stone-500" />
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-400" suppressHydrationWarning={true}>
                <label className="text-xs font-medium text-stone-700">Password</label>
                <GlassInputWrapper>
                  <div className="relative" suppressHydrationWarning={true}>
                    <input name="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" autoComplete="new-password" className="w-full bg-transparent text-xs p-1.5 pr-7 rounded-lg focus:outline-none text-stone-900 placeholder:text-stone-500" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-1.5 flex items-center">
                      {showPassword ? <EyeOff className="w-3 h-3 text-stone-500 hover:text-stone-800 transition-colors" /> : <Eye className="w-3 h-3 text-stone-500 hover:text-stone-800 transition-colors" />}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-500 flex items-center justify-between text-xs" suppressHydrationWarning={true}>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" name="rememberMe" className="custom-checkbox border-[#dcd6cc]" />
                  <span className="text-stone-800">Keep me signed in</span>
                </label>
                <a href="#" onClick={(e) => { e.preventDefault(); setIsForgotPasswordModalOpen(true); }} className="hover:underline text-pink-600 transition-colors">Reset password</a>
              </div>

              <button type="submit" className="animate-element animate-delay-600 w-full rounded-lg border border-white/35 bg-[#bd28b3ba] py-1.5 cursor-pointer flex items-center justify-center">
                <div className="flex items-center justify-center gap-[5px]">
                  <span className="text-xs text-white">Sign In</span>
                  <img src="/assets/icons/arrow-top.svg" className="w-4 h-4" alt="arrow-top" />
                </div>
              </button>
            </form>

            <div className="animate-element animate-delay-700 relative flex items-center justify-center py-2" suppressHydrationWarning={true}>
              <span className="w-full border-t border-[#e9e4dd]"></span>
              <span className="px-2 text-xs text-stone-600 bg-[#f5f3ef] absolute">Or continue with</span>
            </div>

            <div className="animate-element animate-delay-1000 space-y-1" suppressHydrationWarning={true}>
              <button onClick={onGoogleSignIn} className="w-full flex items-center justify-center gap-2 border border-[#e9e4dd] rounded-lg py-1.5 hover:bg-stone-100 transition-colors text-stone-900 bg-white">
                <img src="https://cdn.brandfetch.io/id6O2oGzv-/theme/dark/symbol.svg?c=1dxbfHSJFAPEGdCLU4o5B" alt="Google" className="h-5 w-5" />
                <span className="text-xs">Continue with Google</span>
              </button>
              
              <button onClick={onMicrosoftSignIn} className="w-full flex items-center justify-center gap-2 border border-[#e9e4dd] rounded-lg py-1.5 hover:bg-stone-100 transition-colors text-stone-900 bg-white">
                <img src="https://cdn.brandfetch.io/idchmboHEZ/theme/dark/symbol.svg?c=1dxbfHSJFAPEGdCLU4o5B" alt="Microsoft" className="h-5 w-5" />
                <span className="text-xs">Continue with Microsoft</span>
              </button>
            </div>

            <p className="animate-element animate-delay-1100 text-center text-xs text-stone-600">
              Don&apos;t have an account?{" "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onCreateAccount?.();
                }}
                className="text-pink-600 hover:underline transition-colors"
              >
                Sign up
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Right column: hero image */}
      {heroImageSrc && (
        <section className="hidden md:block flex-1 relative p-4" suppressHydrationWarning={true}>
          <div className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center" style={{ backgroundImage: `url(${heroImageSrc})` }} suppressHydrationWarning={true}></div>
        </section>
      )}

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordModalOpen}
        onClose={() => setIsForgotPasswordModalOpen(false)}
        onSuccess={() => {
          // Optional: Call the original onResetPassword callback if provided
          onResetPassword?.();
        }}
      />
    </div>
  );
};
