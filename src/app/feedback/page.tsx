"use client";

import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar";
import { BlankHeader } from "@/components/ui/blank-header";

import { CheckCircle2, Send, Star } from "lucide-react";
export default function FeedbackPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  // Form states
  const [feedbackType, setFeedbackType] = useState("general");
  const [rating, setRating] = useState(0);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    email: user?.email || "",
    category: "general"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({
        title: "",
        description: "",
        email: user?.email || "",
        category: "general"
      });
      setRating(0);
    }, 3000);
  };

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
              <h1 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl xl:text-5xl tracking-tighter font-geist text-foreground leading-tight mt-7">
                Feedback
              </h1>
              <p className="text-sm md:text-base text-muted-foreground mt-2">
                Help us improve Runwise by sharing your thoughts and suggestions
              </p>
            </div>

            <div className="mt-8 space-y-8 px-4 sm:px-6 lg:px-8">
              {/* Feedback Content */}
              
              {/* Quick Rating Section */}
              <div className="border-b border-border pb-8">
                <div className="mb-4">
                  <h2 className="text-xl sm:text-2xl tracking-tighter font-geist text-foreground leading-tight">
                    Quick Rating
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    How would you rate your overall experience with Runwise?
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`p-1 transition-colors ${
                        star <= rating 
                          ? 'text-yellow-400 hover:text-yellow-500' 
                          : 'text-stone-200 dark:text-zinc-700 hover:text-yellow-400'
                      }`}
                    >
                      <Star className="w-6 h-6 fill-current" />
                    </button>
                  ))}
                  {rating > 0 && (
                    <span className="ml-3 text-sm text-muted-foreground">
                      {rating === 5 ? 'Excellent!' : rating === 4 ? 'Good' : rating === 3 ? 'Okay' : rating === 2 ? 'Poor' : 'Very Poor'}
                    </span>
                  )}
                </div>
              </div>

              {/* Main Feedback Form */}
              <div>
                <div className="mb-6">
                  <h2 className="text-xl sm:text-2xl tracking-tighter font-geist text-foreground leading-tight">
                    Share Your Feedback
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Tell us more about your experience or suggestions
                  </p>
                </div>
                
                <CardContent className="p-0">
                  {isSubmitted ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">Thank you!</h3>
                      <p className="text-sm text-muted-foreground">
                        Your feedback has been submitted successfully. We appreciate your input!
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      
                      {/* Feedback Type Selection */}
                      <div className="space-y-2">
                        <Label className="text-foreground">Feedback Type</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div 
                            onClick={() => setFeedbackType('general')}
                            className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all duration-300 backdrop-blur-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] ${
                              feedbackType === 'general' 
                                ? 'bg-stone-200/60 dark:bg-zinc-800/60 border-black dark:border-white shadow-sm' 
                                : 'bg-white/40 dark:bg-zinc-900/40 border-stone-200 dark:border-white/10 hover:bg-white/60 dark:hover:bg-zinc-800/60 hover:shadow-sm'
                            }`}
                          >
                            <span className="text-sm font-medium">General</span>
                          </div>
                          <div 
                            onClick={() => setFeedbackType('bug')}
                            className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all duration-300 backdrop-blur-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] ${
                              feedbackType === 'bug' 
                                ? 'bg-stone-200/60 dark:bg-zinc-800/60 border-black dark:border-white shadow-sm' 
                                : 'bg-white/40 dark:bg-zinc-900/40 border-stone-200 dark:border-white/10 hover:bg-white/60 dark:hover:bg-zinc-800/60 hover:shadow-sm'
                            }`}
                          >
                            <span className="text-sm font-medium">Bug Report</span>
                          </div>
                          <div 
                            onClick={() => setFeedbackType('feature')}
                            className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all duration-300 backdrop-blur-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] ${
                              feedbackType === 'feature' 
                                ? 'bg-stone-200/60 dark:bg-zinc-800/60 border-black dark:border-white shadow-sm' 
                                : 'bg-white/40 dark:bg-zinc-900/40 border-stone-200 dark:border-white/10 hover:bg-white/60 dark:hover:bg-zinc-800/60 hover:shadow-sm'
                            }`}
                          >
                            <span className="text-sm font-medium">Feature Request</span>
                          </div>
                          <div 
                            onClick={() => setFeedbackType('praise')}
                            className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all duration-300 backdrop-blur-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] ${
                              feedbackType === 'praise' 
                                ? 'bg-stone-200/60 dark:bg-zinc-800/60 border-black dark:border-white shadow-sm' 
                                : 'bg-white/40 dark:bg-zinc-900/40 border-stone-200 dark:border-white/10 hover:bg-white/60 dark:hover:bg-zinc-800/60 hover:shadow-sm'
                            }`}
                          >
                            <span className="text-sm font-medium">Praise</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="title">Title</Label>
                          <Input
                            id="title"
                            placeholder="Brief summary of your feedback"
                            value={formData.title}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                            className="backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 border-stone-200 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus-visible:ring-0 focus-visible:border-stone-400 dark:focus-visible:border-white/40 focus-visible:bg-white/60 dark:focus-visible:bg-zinc-900/60 transition-all duration-300 placeholder:text-muted-foreground/70"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="your@email.com"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className="backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 border-stone-200 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus-visible:ring-0 focus-visible:border-stone-400 dark:focus-visible:border-white/40 focus-visible:bg-white/60 dark:focus-visible:bg-zinc-900/60 transition-all duration-300 placeholder:text-muted-foreground/70"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          placeholder="Please provide detailed feedback about your experience..."
                          value={formData.description}
                          onChange={(e) => handleInputChange('description', e.target.value)}
                          className="backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 border-stone-200 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus-visible:ring-0 focus-visible:border-stone-400 dark:focus-visible:border-white/40 focus-visible:bg-white/60 dark:focus-visible:bg-zinc-900/60 transition-all duration-300 placeholder:text-muted-foreground/70"
                          rows={6}
                          required
                        />
                      </div>

                      <div className="flex items-center justify-end">
                        <Button 
                          type="submit" 
                          disabled={isSubmitting}
                          variant="ghost"
                          className="justify-center backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:shadow-none hover:bg-white/90 dark:hover:bg-white/10 transition-all duration-300 active:scale-[0.98] text-foreground"
                        >
                          {isSubmitting ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                              Submitting...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Submit Feedback
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
