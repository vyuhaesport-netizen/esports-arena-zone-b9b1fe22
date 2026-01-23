import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import SEOHead from '@/components/SEOHead';
import { 
  Trophy, Target, Gamepad2, Users, Shield, Star, 
  Zap, Eye, Heart, Smartphone, Lock, Scale, 
  Users2, MessageSquare, Award, Swords, Instagram, Youtube,
  ExternalLink, Mail, Phone
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const AboutUs = () => {
  const [socialLinks, setSocialLinks] = useState({
    discord: '',
    instagram: '',
    youtube: '',
  });

  useEffect(() => {
    const fetchSocialLinks = async () => {
      try {
        const { data } = await supabase
          .from('platform_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['social_discord', 'social_instagram', 'social_youtube']);
        
        if (data) {
          const links: any = {};
          data.forEach((s) => {
            if (s.setting_key === 'social_discord') links.discord = s.setting_value;
            if (s.setting_key === 'social_instagram') links.instagram = s.setting_value;
            if (s.setting_key === 'social_youtube') links.youtube = s.setting_value;
          });
          setSocialLinks(links);
        }
      } catch (error) {
        console.error('Error fetching social links:', error);
      }
    };
    fetchSocialLinks();
  }, []);

  return (
    <>
      <SEOHead
        title="About Us"
        description="Learn about Vyuha Esport - India's mobile-first competitive gaming platform. Discover our mission, values, and commitment to the esports community."
        url="https://vyuhaesport.in/about"
      />
      <AppLayout title="About Us" showBack>
      <div className="p-4 pb-8 space-y-6">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-2xl border-2 border-border p-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border-2 border-border mb-4 shadow-md">
              <Swords className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-3 tracking-tight">VYUHA ESPORT</h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              India's Mobile-First Competitive Gaming Platform — Where Every Gamer Has a Stage
            </p>
          </div>
        </div>

        {/* Social Links Section */}
        {(socialLinks.discord || socialLinks.instagram || socialLinks.youtube) && (
          <div className="bg-card rounded-xl border-2 border-border overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 p-4 border-b border-border bg-primary/5">
              <div className="p-2 rounded-lg bg-primary/10">
                <ExternalLink className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Connect With Us</h2>
                <p className="text-xs text-muted-foreground">Follow us on social media</p>
              </div>
            </div>
            <div className="p-4">
              <div className="flex justify-center gap-4">
                {socialLinks.discord && (
                  <a
                    href={socialLinks.discord}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors min-w-[80px]"
                  >
                    <svg className="h-8 w-8 text-indigo-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Discord</span>
                  </a>
                )}
                {socialLinks.instagram && (
                  <a
                    href={socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/20 transition-colors min-w-[80px]"
                  >
                    <Instagram className="h-8 w-8 text-pink-500" />
                    <span className="text-xs font-medium text-pink-600 dark:text-pink-400">Instagram</span>
                  </a>
                )}
                {socialLinks.youtube && (
                  <a
                    href={socialLinks.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors min-w-[80px]"
                  >
                    <Youtube className="h-8 w-8 text-red-500" />
                    <span className="text-xs font-medium text-red-600 dark:text-red-400">YouTube</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* The Meaning of Vyuha */}
        <div className="bg-card rounded-xl border-2 border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 p-4 border-b border-border bg-primary/5">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">The Vyuha Philosophy</h2>
              <p className="text-xs text-muted-foreground">Ancient Strategy, Modern Gaming</p>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              In ancient warfare, a <strong className="text-foreground">"Vyuha"</strong> is a strategic formation — a deliberate arrangement of forces designed to secure victory. 
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Vyuha Esport embodies this philosophy as a digital battleground designed for the modern strategist. We are not just an app; we are an ecosystem where <strong className="text-foreground">every gamer has a stage</strong>, and <strong className="text-foreground">every organizer has the tools to build an empire</strong>.
            </p>
          </div>
        </div>

        {/* What We Do */}
        <div className="bg-card rounded-xl border-2 border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 p-4 border-b border-border bg-primary/5">
            <div className="p-2 rounded-lg bg-primary/10">
              <Gamepad2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">What We Do</h2>
              <p className="text-xs text-muted-foreground">Tournaments for Everyone</p>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              We organize competitive gaming tournaments for:
            </p>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                <Award className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Daily Scrims & Community Cups</p>
                  <p className="text-xs text-muted-foreground">One-click registration for instant action</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                <Users2 className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">School & College Tournaments</p>
                  <p className="text-xs text-muted-foreground">Campus-level competitive gaming events</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                <Trophy className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Local & Regional Events</p>
                  <p className="text-xs text-muted-foreground">Community tournaments across India</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl border-2 border-border p-4 text-center">
            <p className="text-2xl font-bold text-primary">1000+</p>
            <p className="text-xs text-muted-foreground">Tournaments</p>
          </div>
          <div className="bg-card rounded-xl border-2 border-border p-4 text-center">
            <p className="text-2xl font-bold text-green-500">₹50L+</p>
            <p className="text-xs text-muted-foreground">Prize Distributed</p>
          </div>
          <div className="bg-card rounded-xl border-2 border-border p-4 text-center">
            <p className="text-2xl font-bold text-blue-500">10K+</p>
            <p className="text-xs text-muted-foreground">Active Players</p>
          </div>
        </div>

        {/* The Three Pillars */}
        <div className="space-y-4">
          <h2 className="font-bold text-lg px-1">Our Three Pillars</h2>
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-card rounded-xl border-2 border-border p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Eye className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-bold">Transparency</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Room details are hidden until 30 minutes before the match to prevent stream sniping. Our <strong className="text-foreground">70/20/10 prize split</strong> is clear: 70% to players, 20% to organizers, 10% platform fee.
              </p>
            </div>

            <div className="bg-card rounded-xl border-2 border-border p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="font-bold">Community</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We don't just host matches — we build teams. From Open teams to Approval-based squads, find teammates based on Role (Assaulter, Sniper, IGL) and Language with our Squad Finder.
              </p>
            </div>

            <div className="bg-card rounded-xl border-2 border-border p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Star className="h-5 w-5 text-amber-600" />
                </div>
                <h3 className="font-bold">Opportunity</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Whether you're a solo fragger or squad leader, the path to the leaderboard is open. Zero-fee community matches help beginners practice without financial risk.
              </p>
            </div>
          </div>
        </div>

        {/* Technology & Trust */}
        <div className="bg-card rounded-xl border-2 border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 p-4 border-b border-border bg-primary/5">
            <div className="p-2 rounded-lg bg-primary/10">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Mobile-First Revolution</h2>
              <p className="text-xs text-muted-foreground">Built for Speed & Accessibility</p>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              The modern gamer is fast. Our core experience is the <strong className="text-foreground">"Swipe to Join"</strong> gesture — see a tournament, swipe right, and you're in the arena.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/50">
                <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium">Fast & Lightweight</p>
                  <p className="text-xs text-muted-foreground">Works on all devices, even low-network areas</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/50">
                <Lock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium">Enterprise Security</p>
                  <p className="text-xs text-muted-foreground">Your data is encrypted & protected</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Compliance */}
        <div className="bg-card rounded-xl border-2 border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 p-4 border-b border-border bg-primary/5">
            <div className="p-2 rounded-lg bg-primary/10">
              <Scale className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Legal & Compliance</h2>
              <p className="text-xs text-muted-foreground">100% Legal "Game of Skill"</p>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Vyuha Esport operates strictly under Indian laws. Our tournaments are classified as <strong className="text-foreground">"Games of Skill"</strong> as defined by the Supreme Court of India.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
                Zero Gambling Policy
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                MeitY Compliant
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                No Betting
              </span>
            </div>
          </div>
        </div>

        {/* Fair Play */}
        <div className="bg-card rounded-xl border-2 border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 p-4 border-b border-border bg-primary/5">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Fair Play & Anti-Cheat</h2>
              <p className="text-xs text-muted-foreground">Legends Are Born from Skill, Not Hacks</p>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <div>
                <p className="text-sm font-medium">Mandatory Verification</p>
                <p className="text-xs text-muted-foreground">Mobile number verification for all users</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <div>
                <p className="text-sm font-medium">Match Monitoring</p>
                <p className="text-xs text-muted-foreground">Manual & automated review of replays</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <div>
                <p className="text-sm font-medium">Zero Tolerance Ban Policy</p>
                <p className="text-xs text-muted-foreground">Permanent ban for hacks or teaming</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="bg-gradient-to-br from-primary/10 to-transparent rounded-xl border-2 border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="font-bold">Get in Touch</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Have questions, want to organize a tournament for your school/college, or need support? We're here to help!
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-card border border-border">
              <Mail className="h-4 w-4 text-primary" />
              <span className="text-sm">vyuhaesport@gmail.com</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-card border border-border">
              <Phone className="h-4 w-4 text-primary" />
              <span className="text-sm">In-App Support Available 24/7</span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground pt-2">
          Join thousands of gamers. Compete. Win. Rise. 🎮
        </p>
        
        <p className="text-center text-xs text-muted-foreground">
          © 2025 Vyuha Esport. All rights reserved.
        </p>
      </div>
    </AppLayout>
    </>
  );
};

export default AboutUs;
