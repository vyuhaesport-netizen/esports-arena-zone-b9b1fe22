import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Paperclip, X, Send, MessageSquare, Clock, Bot, Loader2, Ticket, ChevronRight, Sparkles, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TicketType {
  id: string;
  topic: string;
  description: string;
  status: string;
  admin_response: string | null;
  created_at: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Profile {
  full_name: string | null;
  username: string | null;
}

type ViewType = 'main' | 'ticket' | 'history';

const faqs = [
  { question: 'How to join a tournament?', answer: 'Go to Home, find a tournament, and click "Join". Ensure you have enough wallet balance.' },
  { question: 'How to deposit money?', answer: 'Go to Wallet > Deposit, enter amount, and pay via UPI. Usually credited in minutes.' },
  { question: 'How to withdraw winnings?', answer: 'Go to Wallet > Withdraw, enter amount and UPI ID. Processed within 24-48 hours.' },
  { question: 'Tournament cancelled?', answer: 'Entry fee is auto-refunded to your wallet within 24 hours.' },
  { question: 'Why is withdrawal pending?', answer: 'Withdrawals need verification. Complete your profile. If >48 hours, raise a ticket.' },
];

const HelpSupport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('main');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [requestCallback, setRequestCallback] = useState(false);
  const [callbackPhone, setCallbackPhone] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  
  // AI Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (user) {
      fetchTickets();
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchTickets = async () => {
    if (!user) return;
    setLoadingTickets(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('id, topic, description, status, admin_response, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoadingTickets(false);
    }
  };

  const topics = [
    { value: 'payment', label: 'Payment Issue' },
    { value: 'tournament', label: 'Tournament Bug' },
    { value: 'account', label: 'Account Problem' },
    { value: 'organizer', label: 'Organizer Report' },
    { value: 'other', label: 'Other' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        if (file.size <= 10 * 1024 * 1024) {
          validFiles.push(file);
        } else {
          toast({ title: 'File too large', description: `${file.name} exceeds 10MB limit`, variant: 'destructive' });
        }
      } else {
        toast({ title: 'Invalid file type', description: 'Only images and videos are allowed', variant: 'destructive' });
      }
    }
    setAttachments(prev => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: 'Login Required', description: 'Please login to submit a support request', variant: 'destructive' });
      navigate('/auth');
      return;
    }
    if (!topic) {
      toast({ title: 'Select a topic', description: 'Please select the topic of your issue', variant: 'destructive' });
      return;
    }
    if (!description.trim()) {
      toast({ title: 'Describe your issue', description: 'Please provide details about your problem', variant: 'destructive' });
      return;
    }
    if (requestCallback && !callbackPhone.trim()) {
      toast({ title: 'Phone Required', description: 'Please enter your phone number for callback', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const attachmentUrls: string[] = [];
      for (const file of attachments) {
        const fileName = `${user.id}/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from('chat-media').upload(fileName, file);
        if (uploadError) continue;
        const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(uploadData.path);
        attachmentUrls.push(urlData.publicUrl);
      }

      const { error } = await supabase.from('support_tickets').insert({
        user_id: user.id,
        topic,
        description: `${description.trim()}${requestCallback && callbackPhone ? `\n\n📞 Callback Phone: ${callbackPhone}` : ''}`,
        request_callback: requestCallback,
        attachments: attachmentUrls,
      });

      if (error) throw error;
      toast({ title: 'Request Submitted', description: requestCallback ? `We'll contact you on ${callbackPhone}.` : "We'll respond within 24 hours." });
      setCurrentView('main');
      setTopic('');
      setDescription('');
      setAttachments([]);
      setRequestCallback(false);
      setCallbackPhone('');
      fetchTickets();
    } catch (error) {
      console.error('Error submitting ticket:', error);
      toast({ title: 'Error', description: 'Failed to submit. Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [chatMessages]);

  const handleAiChat = async () => {
    if (!chatInput.trim() || isAiTyping) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput.trim() };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsAiTyping(true);

    try {
      const response = await supabase.functions.invoke('ai-chat', {
        body: { 
          messages: [...chatMessages, userMessage].map(m => ({ role: m.role, content: m.content })),
          type: 'support',
          userId: user?.id
        }
      });

      if (response.error) throw response.error;
      const aiResponse = response.data?.response || 'Sorry, I could not process your request.';
      setChatMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (error: any) {
      console.error('AI chat error:', error);
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      if (error?.message?.includes('limit') || error?.message?.includes('disabled')) {
        errorMessage = 'AI service unavailable. Please raise a ticket instead.';
      }
      setChatMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'open': return { color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Clock, label: 'Open' };
      case 'in_progress': return { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Loader2, label: 'In Progress' };
      case 'resolved': return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle, label: 'Resolved' };
      default: return { color: 'text-muted-foreground', bg: 'bg-muted', icon: MessageSquare, label: status };
    }
  };

  const getUserDisplayName = () => {
    if (profile?.full_name) return profile.full_name;
    if (profile?.username) return profile.username;
    return 'there';
  };

  const recentTicket = tickets[0];

  // Ticket Form View
  if (currentView === 'ticket') {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentView('main')} className="p-2 -ml-2 hover:bg-muted/50 rounded-xl transition-all">
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Raise a Ticket</h1>
          </div>
        </header>

        <div className="p-4 space-y-5 max-w-lg mx-auto">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Topic</Label>
            <Select value={topic} onValueChange={setTopic}>
              <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-border/50 focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent>
                {topics.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Describe your issue</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide details..."
              rows={5}
              className="resize-none rounded-xl bg-muted/30 border-border/50 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl">
            <div>
              <Label className="text-sm font-medium">Request Callback</Label>
              <p className="text-xs text-muted-foreground">We'll call you to resolve</p>
            </div>
            <Switch checked={requestCallback} onCheckedChange={setRequestCallback} />
          </div>

          {requestCallback && (
            <Input
              type="tel"
              value={callbackPhone}
              onChange={(e) => setCallbackPhone(e.target.value)}
              placeholder="Enter phone number"
              className="h-12 rounded-xl bg-muted/30 border-border/50"
            />
          )}

          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-lg text-sm">
                  <span className="truncate max-w-[120px]">{file.name}</span>
                  <button onClick={() => removeAttachment(index)}><X className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-primary cursor-pointer hover:underline">
              <Paperclip className="h-4 w-4" />
              <span>Add attachments</span>
              <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileChange} />
            </label>
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full h-12 rounded-xl font-medium">
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</> : 'Submit Ticket'}
          </Button>
        </div>
      </div>
    );
  }

  // History View
  if (currentView === 'history') {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentView('main')} className="p-2 -ml-2 hover:bg-muted/50 rounded-xl transition-all">
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">My Tickets</h1>
          </div>
        </header>

        <div className="p-4 max-w-lg mx-auto">
          {loadingTickets ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 bg-muted/50 rounded-2xl flex items-center justify-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">No tickets yet</p>
              <Button variant="outline" onClick={() => setCurrentView('ticket')}>Raise a Ticket</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => {
                const config = getStatusConfig(ticket.status);
                const StatusIcon = config.icon;
                return (
                  <div key={ticket.id} className="bg-card/50 backdrop-blur border border-border/50 rounded-2xl p-4 hover:bg-card/80 transition-all">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="font-medium capitalize text-foreground">{ticket.topic}</span>
                      <Badge className={`${config.bg} ${config.color} border-0 text-xs`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{ticket.description}</p>
                    {ticket.admin_response && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-xs text-primary font-medium mb-1">Response:</p>
                        <p className="text-sm text-foreground">{ticket.admin_response}</p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(ticket.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main View - Modern Aesthetic
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 flex flex-col">
      {/* Minimal Header */}
      <header className="sticky top-0 z-50 bg-background/60 backdrop-blur-2xl border-b border-border/30 px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-muted/50 rounded-xl transition-all">
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <span className="text-base font-medium text-foreground">Support</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setCurrentView('ticket')}
            className="text-primary hover:text-primary hover:bg-primary/10 font-medium"
          >
            <Ticket className="h-4 w-4 mr-1.5" />
            Raise Ticket
          </Button>
        </div>
      </header>

      {/* Recent Ticket Banner */}
      {recentTicket && (
        <div className="px-4 pt-3 max-w-2xl mx-auto w-full">
          <button 
            onClick={() => setCurrentView('history')}
            className="w-full group"
          >
            <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
              recentTicket.status === 'resolved' 
                ? 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10' 
                : recentTicket.status === 'in_progress'
                ? 'bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10'
                : 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10'
            }`}>
              <div className="flex items-center gap-3">
                {recentTicket.status === 'resolved' ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                ) : recentTicket.status === 'in_progress' ? (
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                )}
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">
                    {recentTicket.status === 'resolved' ? 'Ticket Resolved' : recentTicket.status === 'in_progress' ? 'Ticket In Progress' : 'Ticket Open'}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">{recentTicket.topic} • {new Date(recentTicket.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        {/* Welcome & Chat Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 pb-4">
            {chatMessages.length === 0 ? (
              <div className="pt-8 pb-4">
                {/* Greeting */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full mb-4">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Vyuha AI</span>
                  </div>
                  <h1 className="text-2xl font-semibold text-foreground mb-2">
                    Hey {getUserDisplayName()}!
                  </h1>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                    How can I help you today? Ask me anything about Vyuha.
                  </p>
                </div>

                {/* Quick Questions */}
                <div className="grid grid-cols-1 gap-2">
                  {faqs.slice(0, 3).map((faq, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setChatInput(faq.question);
                        inputRef.current?.focus();
                      }}
                      className="group flex items-center justify-between p-4 bg-card/50 hover:bg-card border border-border/50 hover:border-border rounded-xl text-left transition-all"
                    >
                      <span className="text-sm text-foreground">{faq.question}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {chatMessages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card/80 backdrop-blur border border-border/50'
                    }`}>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Bot className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-medium text-primary">Vyuha AI</span>
                        </div>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}

                {isAiTyping && (
                  <div className="flex justify-start">
                    <div className="bg-card/80 backdrop-blur border border-border/50 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={chatEndRef} />
          </div>
        </ScrollArea>

        {/* Modern Input Box - Lovable Style */}
        <div className="p-4 pt-2">
          <div className={`relative bg-card/80 backdrop-blur-xl border rounded-2xl transition-all duration-200 ${
            isFocused ? 'border-primary/50 shadow-lg shadow-primary/5' : 'border-border/50'
          }`}>
            <Textarea
              ref={inputRef}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAiChat();
                }
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Ask me anything..."
              disabled={isAiTyping}
              rows={1}
              className="w-full bg-transparent border-0 resize-none py-4 px-4 pr-14 text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:outline-none min-h-[56px] max-h-32"
              style={{ fieldSizing: 'content' } as React.CSSProperties}
            />
            <Button
              onClick={handleAiChat}
              disabled={!chatInput.trim() || isAiTyping}
              size="icon"
              className="absolute right-3 bottom-3 h-8 w-8 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-30 transition-all"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground/60 mt-2">
            AI may make mistakes. For account issues, raise a ticket.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HelpSupport;
