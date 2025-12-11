import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Paperclip, X, Send, Search, MessageSquare, Phone, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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

const faqs = [
  {
    question: "I paid money but it's not in my wallet yet!",
    answer: "Please note that Vyuha uses a manual verification system. Deposits are not instant. Verification typically takes between 15 minutes to 24 hours. If you submitted the correct UTR, your funds will be added shortly. Do not spam support."
  },
  {
    question: "I want a refund, I forgot to join.",
    answer: "We cannot issue a refund for this. According to our policy, 'No-Shows' (failing to join the room on time) are not eligible for refunds. Your entry fee is forfeited."
  },
  {
    question: "Can I change my name?",
    answer: "You can change your name in the 'Edit Profile' section. However, please note there is a 5-day restriction. If you changed it recently, you must wait until the 5 days are over."
  },
  {
    question: "Someone was hacking in my game.",
    answer: "We have zero tolerance for hacking. Please submit a report immediately with video or photo evidence. Our Admins will review it. If confirmed, the player will be disqualified and banned. Admin decisions are final."
  },
  {
    question: "How do I withdraw my winnings?",
    answer: "You can withdraw your wallet balance directly to your bank account. Go to the Wallet section and select 'Withdraw'. Note that withdrawals are subject to admin approval and may take up to 24 hours to process."
  },
  {
    question: "I entered the wrong UTR number by mistake. Will I be banned?",
    answer: "If it was a genuine mistake, please contact Support immediately with a screenshot of your actual payment. However, be warned: our system has Zero Tolerance for Fraud. Intentionally submitting fake or duplicate UTRs results in a permanent account ban and forfeiture of funds."
  },
  {
    question: "The tournament was cancelled. Where is my refund?",
    answer: "If a tournament is cancelled by the Admin or due to insufficient participants, your refund is automatically credited to your Vyuha Esport Wallet within 24 hours. It is not sent back to your bank account directly, but you can use it for other tournaments or withdraw it."
  },
  {
    question: "My game crashed/internet died during the match. Can I get a refund?",
    answer: "No. Refunds are not issued for player-side technical issues. Once the tournament status is 'Live', no refunds are possible."
  },
  {
    question: "I saw two players teaming up in a Solo match. What do I do?",
    answer: "Teaming or 'win trading' in Solo matches is strictly prohibited. Please record the gameplay and submit it via the 'Report' button immediately after the match. If verified, they will be disqualified."
  },
  {
    question: "Where do I get the Room ID and Password?",
    answer: "The Room ID and Password will be shared within the specific Tournament details page 10-15 minutes before the match starts. Please stay on the app to receive them on time."
  },
  {
    question: "Can I edit my Username or Game Name right now?",
    answer: "Check your profile settings. If you have updated your Username or Game Name recently, you are under a 5-day edit restriction to prevent fraud. You must wait for the timer to expire before changing it again. Profile pictures, however, can be changed anytime."
  },
  {
    question: "My account was suspended. Can you unban me?",
    answer: "Account suspensions for fraud (fake UTRs) or severe cheating are usually permanent. However, you may submit an appeal through our support system. Please note that Admin decisions are final and binding."
  },
  {
    question: "I provided the wrong Game UID and couldn't join the room. Refund please?",
    answer: "We cannot issue a refund in this case. It is your responsibility to provide accurate player details. If you cannot participate due to incorrect info, the entry fee is forfeited."
  },
  {
    question: "Can I use a GFX tool or iPad view config?",
    answer: "No. Using any third-party software, mods, GFX tools, or config files to gain an unfair advantage is strictly prohibited. Detection leads to immediate disqualification."
  },
];

type ViewType = 'faq' | 'ticket';

const HelpSupport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('faq');
  const [searchQuery, setSearchQuery] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [requestCallback, setRequestCallback] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const topics = [
    { value: 'payment', label: 'Payment Issue' },
    { value: 'tournament', label: 'Tournament Bug' },
    { value: 'account', label: 'Account Problem' },
    { value: 'organizer', label: 'Organizer Report' },
    { value: 'other', label: 'Other' },
  ];

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          toast({
            title: 'File too large',
            description: `${file.name} exceeds 10MB limit`,
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Invalid file type',
          description: 'Only images and videos are allowed',
          variant: 'destructive',
        });
      }
    }

    setAttachments(prev => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please login to submit a support request',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    if (!topic) {
      toast({
        title: 'Select a topic',
        description: 'Please select the topic of your issue',
        variant: 'destructive',
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: 'Describe your issue',
        description: 'Please provide details about your problem',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const attachmentUrls: string[] = [];
      for (const file of attachments) {
        const fileName = `${user.id}/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('chat-media')
          .getPublicUrl(uploadData.path);

        attachmentUrls.push(urlData.publicUrl);
      }

      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          topic,
          description: description.trim(),
          request_callback: requestCallback,
          attachments: attachmentUrls,
        });

      if (error) throw error;

      toast({
        title: 'Request Submitted',
        description: requestCallback 
          ? 'Our team will contact you soon on your registered number.'
          : "We'll get back to you via email within 24 hours.",
      });

      setCurrentView('faq');
      setTopic('');
      setDescription('');
      setAttachments([]);
      setRequestCallback(false);
    } catch (error) {
      console.error('Error submitting ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit support request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openTicketForm = (withCallback: boolean = false) => {
    setRequestCallback(withCallback);
    setCurrentView('ticket');
  };

  // FAQ View
  if (currentView === 'faq') {
    return (
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/profile')}
                className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-foreground" />
              </button>
              <h1 className="text-lg font-bold text-foreground">Help & Support</h1>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => openTicketForm(false)}
              className="bg-primary hover:bg-primary/90"
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Raise Ticket
            </Button>
          </div>
        </header>

        <div className="p-4 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => openTicketForm(false)}
              className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-xl hover:bg-muted/50 transition-colors"
            >
              <div className="p-3 bg-primary/10 rounded-full">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">Raise Ticket</span>
              <span className="text-xs text-muted-foreground text-center">Submit your issue</span>
            </button>
            <button
              onClick={() => openTicketForm(true)}
              className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-xl hover:bg-muted/50 transition-colors"
            >
              <div className="p-3 bg-green-500/10 rounded-full">
                <Phone className="h-5 w-5 text-green-500" />
              </div>
              <span className="text-sm font-medium text-foreground">Contact Team</span>
              <span className="text-xs text-muted-foreground text-center">Request a callback</span>
            </button>
          </div>

          {/* FAQs Section */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              Frequently Asked Questions
            </h2>

            {filteredFaqs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No FAQs found for "{searchQuery}"</p>
                <Button
                  variant="link"
                  onClick={() => openTicketForm(false)}
                  className="mt-2 text-primary"
                >
                  Raise a Ticket Instead
                </Button>
              </div>
            ) : (
              <Accordion type="single" collapsible className="space-y-2">
                {filteredFaqs.map((faq, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`faq-${index}`}
                    className="bg-card border border-border rounded-xl px-4 data-[state=open]:border-primary/50"
                  >
                    <AccordionTrigger className="text-sm font-medium text-foreground text-left hover:no-underline py-4">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>

          {/* Still Need Help */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4 text-center space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Still need help?</h3>
            <p className="text-xs text-muted-foreground">
              Cannot find your answer? Submit a ticket and our team will assist you.
            </p>
            <Button
              onClick={() => openTicketForm(false)}
              variant="default"
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Ticket Form View
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setCurrentView('faq')}
            className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">
            {requestCallback ? 'Contact Team' : 'Raise a Ticket'}
          </h1>
        </div>
      </header>

      <div className="p-4 space-y-5">
        {/* Info Card */}
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
          <p className="text-sm text-foreground">
            {requestCallback 
              ? "Fill out the form below and our team will call you back on your registered phone number."
              : "Describe your issue in detail and attach any relevant screenshots. We'll respond within 24 hours."
            }
          </p>
        </div>

        {/* Topic Dropdown */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Topic of Issue *</Label>
          <Select value={topic} onValueChange={setTopic}>
            <SelectTrigger className="w-full bg-card border-border">
              <SelectValue placeholder="Select a topic" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {topics.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Describe Your Problem *</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please explain your issue in detail..."
            className="min-h-[120px] bg-card border-border resize-none"
          />
        </div>

        {/* Attachments */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Attachments (Proof)</Label>
          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex flex-col items-center justify-center py-4">
              <Paperclip className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Attach Screenshot or Video</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG or MP4 (max 10MB)</p>
            </div>
            <input 
              type="file" 
              className="hidden" 
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
            />
          </label>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {attachments.map((file, index) => (
                <div 
                  key={index}
                  className="relative group bg-muted rounded-lg px-3 py-2 flex items-center gap-2"
                >
                  <span className="text-xs text-foreground truncate max-w-[120px]">
                    {file.name}
                  </span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="p-0.5 hover:bg-destructive/20 rounded-full transition-colors"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Request Callback Toggle */}
        <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium text-foreground">Request a Call Back?</Label>
            <p className="text-xs text-muted-foreground">
              Our team will call your registered number if urgent.
            </p>
          </div>
          <Switch
            checked={requestCallback}
            onCheckedChange={setRequestCallback}
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6"
        >
          {submitting ? (
            'Submitting...'
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit Request
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default HelpSupport;
