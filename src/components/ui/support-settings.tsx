"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  HelpCircle, 
  MessageSquare, 
  Mail, 
  Phone, 
  BookOpen, 
  Video, 
  FileText, 
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Loader2,
  Send,
  Download,
  Search,
  Clock,
  User,
  Calendar,
  Star,
  ThumbsUp,
  ThumbsDown,
  Plus,
  Settings
} from "lucide-react";

interface SupportTicket {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  category: string;
}

interface KnowledgeBaseArticle {
  id: string;
  title: string;
  category: string;
  views: number;
  helpful: number;
  lastUpdated: string;
}

interface SupportContact {
  type: 'email' | 'phone' | 'chat';
  value: string;
  available: boolean;
  hours: string;
}

export function SupportSettings() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([
    {
      id: 'ticket_1',
      subject: 'Unable to create new workflow',
      status: 'in_progress',
      priority: 'high',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      category: 'Technical Issue'
    },
    {
      id: 'ticket_2',
      subject: 'Billing question about subscription',
      status: 'resolved',
      priority: 'medium',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'Billing'
    }
  ]);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseArticle[]>([
    {
      id: 'kb_1',
      title: 'Getting Started with Workflows',
      category: 'Getting Started',
      views: 1250,
      helpful: 89,
      lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'kb_2',
      title: 'API Integration Guide',
      category: 'API Documentation',
      views: 890,
      helpful: 67,
      lastUpdated: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'kb_3',
      title: 'Troubleshooting Common Issues',
      category: 'Troubleshooting',
      views: 2100,
      helpful: 156,
      lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]);
  const [contactMethods, setContactMethods] = useState<SupportContact[]>([
    {
      type: 'email',
      value: 'support@runwise.com',
      available: true,
      hours: '24/7'
    },
    {
      type: 'phone',
      value: '+1 (555) 123-4567',
      available: true,
      hours: 'Mon-Fri 9AM-6PM EST'
    },
    {
      type: 'chat',
      value: 'Live Chat',
      available: true,
      hours: 'Mon-Fri 9AM-6PM EST'
    }
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    category: '',
    priority: 'medium' as const
  });

  // Load support data
  useEffect(() => {
    const loadSupportData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        // In a real app, this would load from support API
        // For now, we'll use mock data
      } catch (error) {
        console.error('Error loading support data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSupportData();
  }, [user]);

  // Handle new ticket creation
  const handleCreateTicket = async () => {
    if (!newTicket.subject || !newTicket.description) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return;
    }

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const ticket: SupportTicket = {
        id: `ticket_${Date.now()}`,
        subject: newTicket.subject,
        status: 'open',
        priority: newTicket.priority,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        category: newTicket.category || 'General'
      };

      setTickets(prev => [ticket, ...prev]);
      setNewTicket({ subject: '', description: '', category: '', priority: 'medium' });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error creating ticket:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle article feedback
  const handleArticleFeedback = async (articleId: string, helpful: boolean) => {
    try {
      setKnowledgeBase(prev => 
        prev.map(article => 
          article.id === articleId 
            ? { ...article, helpful: article.helpful + (helpful ? 1 : 0) }
            : article
        )
      );
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2 text-muted-foreground">Loading support information...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Support Header */}
      <div>
        <div className="mb-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Support & Help
            </h2>
            <p className="text-muted-foreground mt-1">
              Get help, contact support, and access documentation
            </p>
          </div>
        </div>
      </div>

      {/* Contact Support */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <MessageSquare className="h-4 w-4" />
          Contact Support
        </h3>
        <p className="text-muted-foreground mb-6">
          Get in touch with our support team
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {contactMethods.map((contact) => (
            <div key={contact.type} className="p-4 bg-muted/50 border border-border rounded-md">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-md">
                  {contact.type === 'email' && <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
                  {contact.type === 'phone' && <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
                  {contact.type === 'chat' && <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
                </div>
                <div>
                  <h4 className="font-medium capitalize">{contact.type}</h4>
                  <p className="text-sm text-muted-foreground">{contact.value}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Badge 
                  variant={contact.available ? 'default' : 'secondary'}
                  className={contact.available ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : ''}
                >
                  {contact.available ? 'Available' : 'Offline'}
                </Badge>
                <span className="text-xs text-muted-foreground">{contact.hours}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator className="my-8" />

      {/* Create Support Ticket */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Plus className="h-4 w-4" />
          Create Support Ticket
        </h3>
        <p className="text-muted-foreground mb-6">
          Submit a new support request
        </p>
        
        <div className="p-6 bg-muted/50 border border-border rounded-md">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Brief description of your issue"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={newTicket.category}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-border bg-background rounded-md text-sm"
                >
                  <option value="">Select a category</option>
                  <option value="Technical Issue">Technical Issue</option>
                  <option value="Billing">Billing</option>
                  <option value="Feature Request">Feature Request</option>
                  <option value="Bug Report">Bug Report</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={newTicket.description}
                onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Please provide detailed information about your issue..."
                className="w-full min-h-[120px] px-3 py-2 border border-border bg-background rounded-md text-sm resize-none"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                value={newTicket.priority}
                onChange={(e) => setNewTicket(prev => ({ ...prev, priority: e.target.value as any }))}
                className="w-full px-3 py-2 border border-border bg-background rounded-md text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            
            <Button
              onClick={handleCreateTicket}
              disabled={isSaving || !newTicket.subject || !newTicket.description}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Create Ticket
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Support Tickets */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <FileText className="h-4 w-4" />
          Your Support Tickets
        </h3>
        <p className="text-muted-foreground mb-6">
          Track your support requests and their status
        </p>
        
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="p-4 bg-muted/50 border border-border rounded-md">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{ticket.subject}</h4>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(ticket.status)}>
                    {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                  </Badge>
                  <Badge className={getPriorityColor(ticket.priority)}>
                    {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{ticket.category}</span>
                <span>Created {new Date(ticket.createdAt).toLocaleDateString()}</span>
                <span>Updated {new Date(ticket.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator className="my-8" />

      {/* Knowledge Base */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <BookOpen className="h-4 w-4" />
          Knowledge Base
        </h3>
        <p className="text-muted-foreground mb-6">
          Browse helpful articles and documentation
        </p>
        
        <div className="space-y-4">
          {knowledgeBase.map((article) => (
            <div key={article.id} className="p-4 bg-muted/50 border border-border rounded-md">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{article.title}</h4>
                <Badge variant="secondary">{article.category}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Last updated {new Date(article.lastUpdated).toLocaleDateString()}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {article.views} views
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" />
                    {article.helpful} helpful
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleArticleFeedback(article.id, true)}
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleArticleFeedback(article.id, false)}
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator className="my-8" />

      {/* Additional Resources */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <ExternalLink className="h-4 w-4" />
          Additional Resources
        </h3>
        <p className="text-muted-foreground mb-6">
          More ways to get help and learn
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-md">
                <Video className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium">Video Tutorials</h4>
                <p className="text-sm text-muted-foreground">
                  Watch step-by-step video guides
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Tutorials
            </Button>
          </div>

          <div className="p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-md">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium">API Documentation</h4>
                <p className="text-sm text-muted-foreground">
                  Complete API reference and examples
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Docs
            </Button>
          </div>

          <div className="p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-md">
                <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="font-medium">Community Forum</h4>
                <p className="text-sm text-muted-foreground">
                  Connect with other users and experts
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Join Forum
            </Button>
          </div>

          <div className="p-4 bg-muted/50 border border-border rounded-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-md">
                <Download className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h4 className="font-medium">Status Page</h4>
                <p className="text-sm text-muted-foreground">
                  Check system status and uptime
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Check Status
            </Button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6">
        <div className="flex items-center gap-2">
          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Support request submitted successfully!</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Failed to submit support request. Please try again.</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <HelpCircle className="h-4 w-4" />
          <span>Need more help? Contact us anytime</span>
        </div>
      </div>
    </div>
  );
}
