import AppLayout from '@/components/layout/AppLayout';
import { 
  Trophy, Target, Gamepad2, Users, Shield, Star, 
  Zap, Eye, Heart, Smartphone, Lock, Scale, 
  Users2, MessageSquare, Award, Swords
} from 'lucide-react';

const AboutUs = () => {
  return (
    <AppLayout title="About Us">
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
                Room details are hidden until 30 minutes before the match to prevent stream sniping. Our <strong className="text-foreground">80/20 prize split</strong> is clear: 80% to players, 10% to organizers, 10% platform fee.
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
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-2 rounded-lg text-xs font-medium bg-card border border-border">
              📧 vyuhaesport@gmail.com
            </span>
            <span className="px-3 py-2 rounded-lg text-xs font-medium bg-card border border-border">
              📱 In-App Support
            </span>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground pt-2">
          Join thousands of gamers. Compete. Win. Rise. 🎮
        </p>
      </div>
    </AppLayout>
  );
};

export default AboutUs;
