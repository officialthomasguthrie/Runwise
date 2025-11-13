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
import { Star, MessageSquare, Bug, Lightbulb, Heart, Send, CheckCircle } from "lucide-react";
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar";
import { BlankHeader } from "@/components/ui/blank-header";

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
        <main className="flex h-full grow flex-col overflow-auto relative">
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
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Star className="w-5 h-5 text-yellow-400" />
                    Quick Rating
                  </CardTitle>
                  <CardDescription>
                    How would you rate your overall experience with Runwise?
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className={`p-1 transition-colors ${
                          star <= rating 
                            ? 'text-yellow-400 hover:text-yellow-500' 
                            : 'text-muted-foreground hover:text-yellow-400'
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
                </CardContent>
              </Card>

              {/* Feedback Type Selection */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <MessageSquare className="w-5 h-5 text-blue-400" />
                    Feedback Type
                  </CardTitle>
                  <CardDescription>
                    What type of feedback would you like to share?
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={feedbackType} onValueChange={setFeedbackType} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="general" id="general" />
                      <Label htmlFor="general" className="flex items-center gap-2 cursor-pointer">
                        <MessageSquare className="w-4 h-4 text-blue-400" />
                        General
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="bug" id="bug" />
                      <Label htmlFor="bug" className="flex items-center gap-2 cursor-pointer">
                        <Bug className="w-4 h-4 text-red-400" />
                        Bug Report
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="feature" id="feature" />
                      <Label htmlFor="feature" className="flex items-center gap-2 cursor-pointer">
                        <Lightbulb className="w-4 h-4 text-green-400" />
                        Feature Request
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="praise" id="praise" />
                      <Label htmlFor="praise" className="flex items-center gap-2 cursor-pointer">
                        <Heart className="w-4 h-4 text-pink-400" />
                        Praise
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* Main Feedback Form */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-foreground">Share Your Feedback</CardTitle>
                  <CardDescription>
                    Tell us more about your experience or suggestions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isSubmitted ? (
                    <div className="text-center py-8">
                      <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">Thank you!</h3>
                      <p className="text-sm text-muted-foreground">
                        Your feedback has been submitted successfully. We appreciate your input!
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="title">Title</Label>
                          <Input
                            id="title"
                            placeholder="Brief summary of your feedback"
                            value={formData.title}
                            onChange={(e) => handleInputChange('title', e.target.value)}
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
                          rows={6}
                          required
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {feedbackType === 'general' && 'General Feedback'}
                          {feedbackType === 'bug' && 'Bug Report'}
                          {feedbackType === 'feature' && 'Feature Request'}
                          {feedbackType === 'praise' && 'Praise'}
                        </Badge>
                        
                        <Button 
                          type="submit" 
                          disabled={isSubmitting}
                          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        >
                          {isSubmitting ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
              </Card>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
