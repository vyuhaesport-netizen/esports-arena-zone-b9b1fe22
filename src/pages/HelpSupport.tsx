import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Paperclip, X, Send, MessageSquare, Clock, Bot, Loader2, 
  ChevronRight, Sparkles, CheckCircle, AlertCircle,
  Volume2, VolumeX, ThumbsUp, ThumbsDown, Plus,
  FileText, Headphones
} from 'lucide-react';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

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
  timestamp?: Date;
  feedback?: 'positive' | 'negative' | null;
  hasAudio?: boolean;
  imageUrl?: string;
}

interface Profile {
  full_name: string | null;
  username: string | null;
}

type ViewType = 'main' | 'ticket' | 'history';

// FAQ Data
const FAQ_DATA = [
  {
    question: "Team banane ke baad access nahi ho raha?",
    answer: "Agar team create karne ke baad dikhai nahi de raha, toh page refresh karo ya logout/login karo. Kabhi kabhi network slow hone se data load nahi hota. Agar phir bhi issue ho toh ticket raise karo."
  },
  {
    question: "Tournament join karne ke liye team zaroori hai?",
    answer: "Solo tournaments mein team ki zaroorat nahi. Lekin Duo aur Squad tournaments ke liye pehle team banana padega. Team page pe jaake team create ya join karo."
  },
  {
    question: "Wallet mein paisa kab aata hai?",
    answer: "Tournament jeetne ke baad 24-48 hours mein prize automatically credit ho jata hai. Withdrawal request ke baad 3-5 working days lagta hai UPI mein transfer hone mein."
  },
  {
    question: "Account ban ho gaya, kya karu?",
    answer: "Agar account ban hai toh ban screen pe reason dikhai dega. Temporary ban ke liye wait karo, permanent ban ke liye AI se baat karo jo appeal process guide karega."
  },
  {
    question: "Room ID/Password kab milega?",
    answer: "Tournament start hone se 10-15 minutes pehle My Match page pe Room ID aur Password dikhai dega. Notification bhi aayega."
  },
  {
    question: "Payment fail ho gaya lekin paisa kat gaya?",
    answer: "Payment fail pe auto-refund 24-48 hours mein hota hai. Agar nahi aaya toh ticket raise karo transaction ID ke saath."
  },
  {
    question: "Profile photo ya username kaise change karu?",
    answer: "Profile page pe jaake edit button pe click karo. Avatar change karne ke liye avatar gallery se select karo. Username ek baar set hone ke baad change nahi hota."
  },
  {
    question: "Tournament cancel kyun hua?",
    answer: "Minimum players join nahi hone pe tournament auto-cancel ho jata hai. Entry fee automatically refund ho jayega wallet mein."
  }
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
  
  // Voice state (for text-to-speech)
  const [isSpeaking, setIsSpeaking] = useState(false);

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


  // Text-to-Speech for AI responses
  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    } else {
      toast({ title: 'Not Supported', description: 'Voice output not supported on this device', variant: 'destructive' });
    }
  };

  const handleAiChat = async () => {
    if (!chatInput.trim() || isAiTyping) return;

    const userMessage: ChatMessage = { 
      role: 'user', 
      content: chatInput.trim(), 
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsAiTyping(true);

    try {
      const response = await supabase.functions.invoke('ai-chat', {
        body: { 
          messages: [...chatMessages, userMessage].map(m => ({ 
            role: m.role, 
            content: m.imageUrl ? `${m.content}\n[User shared an image: ${m.imageUrl}]` : m.content 
          })),
          type: 'support',
          userId: user?.id
        }
      });

      if (response.error) throw response.error;
      const aiResponse = response.data?.response || 'Sorry, I could not process your request.';
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: aiResponse, 
        timestamp: new Date(),
        hasAudio: true 
      }]);
    } catch (error: any) {
      console.error('AI chat error:', error);
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      if (error?.message?.includes('limit') || error?.message?.includes('disabled')) {
        errorMessage = 'AI service unavailable. Please raise a ticket instead.';
      }
      setChatMessages(prev => [...prev, { role: 'assistant', content: errorMessage, timestamp: new Date() }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleFeedback = (index: number, type: 'positive' | 'negative') => {
    setChatMessages(prev => prev.map((msg, i) => 
      i === index ? { ...msg, feedback: type } : msg
    ));
    toast({ 
      title: type === 'positive' ? '😊 Thanks!' : '😔 Sorry to hear that',
      description: type === 'positive' ? 'Glad I could help!' : 'I\'ll try to do better. Consider raising a ticket for more help.'
    });
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
    if (profile?.full_name) return profile.full_name.split(' ')[0];
    if (profile?.username) return profile.username;
    return 'there';
  };

  const recentTicket = tickets[0];

  // FAQ View
  const renderFAQ = () => (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Frequently Asked Questions</h2>
      </div>
      <Accordion type="single" collapsible className="space-y-2">
        {FAQ_DATA.map((faq, index) => (
          <AccordionItem 
            key={index} 
            value={`faq-${index}`}
            className="border border-border/50 rounded-xl px-4 bg-card/30 backdrop-blur"
          >
            <AccordionTrigger className="text-left text-sm font-medium py-4 hover:no-underline">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground pb-4">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );

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

  // Main View - Professional AI Interface
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/10 flex flex-col">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 bg-background/70 backdrop-blur-2xl border-b border-border/20 px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-muted/50 rounded-xl transition-all">
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg">
                <Headphones className="h-4 w-4 text-primary" />
              </div>
              <span className="text-base font-semibold text-foreground">Support</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setCurrentView('history')}
              className="text-muted-foreground hover:text-foreground"
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button 
              size="sm"
              onClick={() => setCurrentView('ticket')}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-lg shadow-lg shadow-primary/30"
            >
              <Plus className="h-4 w-4 mr-1" />
              Ticket
            </Button>
          </div>
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
                  <p className="text-xs text-muted-foreground capitalize">{recentTicket.topic}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 pb-4">
            {chatMessages.length === 0 ? (
              <div className="pt-6 pb-4">
                {/* AI Avatar & Greeting */}
                <div className="text-center mb-8">
                  <div className="relative inline-block mb-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary/30 via-primary/20 to-primary/5 rounded-3xl flex items-center justify-center shadow-lg shadow-primary/10">
                      <Bot className="h-10 w-10 text-primary" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-background flex items-center justify-center">
                      <span className="text-[10px] text-white font-bold">AI</span>
                    </div>
                  </div>
                  <h1 className="text-2xl font-bold text-foreground mb-1">
                    Hi {getUserDisplayName()}! 👋
                  </h1>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                    I'm Vyuha AI, your personal support assistant. How can I help you today?
                  </p>
                </div>

                {/* Capabilities Info */}
                <div className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent rounded-2xl p-4 border border-primary/10">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">I can help you with:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Check your wallet, tournaments & account status</li>
                        <li>• Restore banned accounts (if eligible)</li>
                        <li>• Raise support tickets on your behalf</li>
                        <li>• Answer questions about Vyuha Esports</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* FAQ Section */}
                {renderFAQ()}
              </div>
            ) : (
              <>
                {chatMessages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] ${msg.role === 'user' ? '' : 'space-y-2'}`}>
                      {/* User Image Preview */}
                      {msg.imageUrl && msg.role === 'user' && (
                        <div className="mb-2">
                          <img src={msg.imageUrl} alt="Shared" className="max-w-[200px] rounded-xl" />
                        </div>
                      )}
                      
                      <div className={`rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card/80 backdrop-blur border border-border/50'
                      }`}>
                        {msg.role === 'assistant' && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <div className="p-1 bg-primary/10 rounded-md">
                              <Bot className="h-3 w-3 text-primary" />
                            </div>
                            <span className="text-xs font-semibold text-primary">Vyuha AI</span>
                          </div>
                        )}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      
                      {/* AI Response Actions */}
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 px-2">
                          <button
                            onClick={() => speakResponse(msg.content)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isSpeaking ? 'bg-primary/20 text-primary' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {isSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                          </button>
                          {!msg.feedback && (
                            <>
                              <button
                                onClick={() => handleFeedback(index, 'positive')}
                                className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500 transition-colors"
                              >
                                <ThumbsUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleFeedback(index, 'negative')}
                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                              >
                                <ThumbsDown className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          {msg.feedback === 'positive' && (
                            <span className="text-xs text-emerald-500 flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3" /> Helpful
                            </span>
                          )}
                          {msg.feedback === 'negative' && (
                            <span className="text-xs text-muted-foreground">Feedback noted</span>
                          )}
                        </div>
                      )}
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
                        <span className="text-xs text-muted-foreground">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={chatEndRef} />
          </div>
        </ScrollArea>


        {/* Modern Input Box */}
        <div className="p-4 pt-2">
          <div className={`relative bg-card/80 backdrop-blur-xl border rounded-2xl transition-all duration-200 ${
            isFocused ? 'border-primary/50 shadow-xl shadow-primary/5' : 'border-border/50'
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
            Vyuha AI • Powered by DeepSeek R1
          </p>
        </div>
      </div>
    </div>
  );
};

export default HelpSupport;
