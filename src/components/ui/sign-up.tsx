import React, { useState } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

// --- HELPER COMPONENTS (ICONS) ---

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
    </svg>
);

const MicrosoftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24">
        <path fill="#F25022" d="M1 1h10v10H1z"/>
        <path fill="#7FBA00" d="M13 1h10v10H13z"/>
        <path fill="#00A4EF" d="M1 13h10v10H1z"/>
        <path fill="#FFB900" d="M13 13h10v10H13z"/>
    </svg>
);

// --- TYPE DEFINITIONS ---

export interface Testimonial {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
}

interface SignUpPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroImageSrc?: string;
  testimonials?: Testimonial[];
  onSignUp?: (event: React.FormEvent<HTMLFormElement>) => void;
  onGoogleSignUp?: () => void;
  onMicrosoftSignUp?: () => void;
  onSignIn?: () => void;
  onGoBack?: () => void;
}

// --- SUB-COMPONENTS ---

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-pink-400/70 focus-within:bg-pink-500/10" suppressHydrationWarning={true}>
    {children}
  </div>
);

const TestimonialCard = ({ testimonial, delay }: { testimonial: Testimonial, delay: string }) => (
  <div className={`animate-testimonial ${delay} flex items-start gap-3 rounded-3xl bg-card/40 dark:bg-zinc-800/40 backdrop-blur-xl border border-white/10 p-5 w-64`} suppressHydrationWarning={true}>
    <img src={testimonial.avatarSrc} className="h-10 w-10 object-cover rounded-2xl" alt="avatar" />
    <div className="text-sm leading-snug" suppressHydrationWarning={true}>
      <p className="flex items-center gap-1 font-medium">{testimonial.name}</p>
      <p className="text-muted-foreground">{testimonial.handle}</p>
      <p className="mt-1 text-foreground/80">{testimonial.text}</p>
    </div>
  </div>
);

// --- MAIN COMPONENT ---

export const SignUpPage: React.FC<SignUpPageProps> = ({
  title = <span className="font-light text-foreground tracking-tighter">Get Started</span>,
  description = "Create your account and start building AI workflows",
  heroImageSrc,
  testimonials = [],
  onSignUp,
  onGoogleSignUp,
  onMicrosoftSignUp,
  onSignIn,
  onGoBack,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row font-geist w-[100dvw] relative bg-background text-foreground" suppressHydrationWarning={true}>
      {/* Go Back Button */}
      {onGoBack && (
        <button
          onClick={onGoBack}
          className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50 backdrop-blur-sm"
        >
          <ArrowLeft className="w-3 h-3" />
          Go Back
        </button>
      )}
      
      {/* Left column: sign-up form */}
      <section className="flex-1 flex items-center justify-center p-3" suppressHydrationWarning={true}>
        <div className="w-full max-w-xs" suppressHydrationWarning={true}>
          <div className="flex flex-col gap-2" suppressHydrationWarning={true}>
            <h1 className="animate-element animate-delay-100 text-xl md:text-2xl font-semibold leading-tight">{title}</h1>
            <p className="animate-element animate-delay-200 text-xs text-muted-foreground">{description}</p>

            <form className="space-y-2" onSubmit={onSignUp} suppressHydrationWarning={true}>
              <div className="animate-element animate-delay-300 grid grid-cols-2 gap-2" suppressHydrationWarning={true}>
                <div suppressHydrationWarning={true}>
                  <label className="text-xs font-medium text-muted-foreground">First Name</label>
                  <GlassInputWrapper>
                    <input name="firstName" type="text" placeholder="John" className="w-full bg-transparent text-xs p-1.5 rounded-lg focus:outline-none text-foreground placeholder:text-muted-foreground" required />
                  </GlassInputWrapper>
                </div>
                <div suppressHydrationWarning={true}>
                  <label className="text-xs font-medium text-muted-foreground">Last Name</label>
                  <GlassInputWrapper>
                    <input name="lastName" type="text" placeholder="Doe" className="w-full bg-transparent text-xs p-1.5 rounded-lg focus:outline-none text-foreground placeholder:text-muted-foreground" required />
                  </GlassInputWrapper>
                </div>
              </div>

              <div className="animate-element animate-delay-400" suppressHydrationWarning={true}>
                <label className="text-xs font-medium text-muted-foreground">Email Address</label>
                <GlassInputWrapper>
                  <input name="email" type="email" placeholder="john@example.com" className="w-full bg-transparent text-xs p-1.5 rounded-lg focus:outline-none text-foreground placeholder:text-muted-foreground" required />
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-500" suppressHydrationWarning={true}>
                <label className="text-xs font-medium text-muted-foreground">Password</label>
                <GlassInputWrapper>
                  <div className="relative" suppressHydrationWarning={true}>
                    <input name="password" type={showPassword ? 'text' : 'password'} placeholder="Create a strong password" className="w-full bg-transparent text-xs p-1.5 pr-7 rounded-lg focus:outline-none text-foreground placeholder:text-muted-foreground" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-1.5 flex items-center">
                      {showPassword ? <EyeOff className="w-3 h-3 text-muted-foreground hover:text-foreground transition-colors" /> : <Eye className="w-3 h-3 text-muted-foreground hover:text-foreground transition-colors" />}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-600" suppressHydrationWarning={true}>
                <label className="text-xs font-medium text-muted-foreground">Confirm Password</label>
                <GlassInputWrapper>
                  <div className="relative" suppressHydrationWarning={true}>
                    <input name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm your password" className="w-full bg-transparent text-xs p-1.5 pr-7 rounded-lg focus:outline-none text-foreground placeholder:text-muted-foreground" required />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-1.5 flex items-center">
                      {showConfirmPassword ? <EyeOff className="w-3 h-3 text-muted-foreground hover:text-foreground transition-colors" /> : <Eye className="w-3 h-3 text-muted-foreground hover:text-foreground transition-colors" />}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-700 flex items-center gap-1 text-xs" suppressHydrationWarning={true}>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" name="agreeTerms" className="custom-checkbox" required />
                  <span className="text-foreground/90">I agree to the <a href="#" className="text-pink-400 hover:underline">Terms</a> and <a href="#" className="text-pink-400 hover:underline">Privacy</a></span>
                </label>
              </div>

              <button type="submit" className="animate-element animate-delay-800 w-full rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 py-1.5 font-medium text-white transition-colors text-xs">
                Create Account
              </button>
            </form>

            <div className="animate-element animate-delay-900 relative flex items-center justify-center py-2" suppressHydrationWarning={true}>
              <span className="w-full border-t border-border"></span>
              <span className="px-2 text-xs text-muted-foreground bg-background absolute">Or continue with</span>
            </div>

            <div className="animate-element animate-delay-1000 space-y-1" suppressHydrationWarning={true}>
              <button onClick={onGoogleSignUp} className="w-full flex items-center justify-center gap-2 border border-border rounded-lg py-1.5 hover:bg-secondary transition-colors text-foreground bg-background">
                <GoogleIcon />
                <span className="text-xs">Continue with Google</span>
              </button>
              
              <button onClick={onMicrosoftSignUp} className="w-full flex items-center justify-center gap-2 border border-border rounded-lg py-1.5 hover:bg-secondary transition-colors text-foreground bg-background">
                <MicrosoftIcon />
                <span className="text-xs">Continue with Microsoft</span>
              </button>
            </div>

            <p className="animate-element animate-delay-1100 text-center text-xs text-muted-foreground">
              Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); onSignIn?.(); }} className="text-pink-400 hover:underline transition-colors">Sign In</a>
            </p>
          </div>
        </div>
      </section>

      {/* Right column: hero image + testimonials */}
      {heroImageSrc && (
        <section className="hidden md:block flex-1 relative p-4" suppressHydrationWarning={true}>
          <div className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center" style={{ backgroundImage: `url(${heroImageSrc})` }} suppressHydrationWarning={true}></div>
          {testimonials.length > 0 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 px-8 w-full justify-center" suppressHydrationWarning={true}>
              <TestimonialCard testimonial={testimonials[0]} delay="animate-delay-1200" />
              {testimonials[1] && <div className="hidden xl:flex" suppressHydrationWarning={true}><TestimonialCard testimonial={testimonials[1]} delay="animate-delay-1400" /></div>}
              {testimonials[2] && <div className="hidden 2xl:flex" suppressHydrationWarning={true}><TestimonialCard testimonial={testimonials[2]} delay="animate-delay-1600" /></div>}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
