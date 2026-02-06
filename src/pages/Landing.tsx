import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import SEOHead from '@/components/SEOHead';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import { 
  Trophy, ChevronRight, Wallet, BarChart3, User, Zap,
  Target, Shield, Eye, EyeOff, Loader2, Gamepad2, Brain,
  Swords, Medal, Crown, Cpu, Instagram
} from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const emailSchema = z.string().email('Invalid email');
const passwordSchema = z.string().min(6, 'Min 6 characters');

const Landing = () => {
  const [authDialog, setAuthDialog] = useState<'login' | 'signup' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleAuthEnabled, setGoogleAuthEnabled] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string; terms?: string }>({});
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Track referral code from URL
  const refCode = searchParams.get('ref');

  useEffect(() => {
    // Store referral code in localStorage if present
    if (refCode) {
      localStorage.setItem('collab_ref_code', refCode);
      // Track click via backend function (works even before login)
      supabase.functions.invoke('collab-track', {
        body: { action: 'click', code: refCode },
      }).catch(() => {
        // ignore
      });
    }
  }, [refCode]);

  // Fetch Google auth setting
  useEffect(() => {
    const fetchGoogleAuthSetting = async () => {
      try {
        const { data } = await supabase
          .from('platform_settings')
          .select('setting_value')
          .eq('setting_key', 'google_auth_enabled')
          .maybeSingle();
        
        setGoogleAuthEnabled(data?.setting_value === 'true');
      } catch {
        // Default to false
      }
    };
    fetchGoogleAuthSetting();
  }, []);

  // Refs for GSAP animations
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const particleContainerRef = useRef<HTMLDivElement>(null);
  const tournamentRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const aiRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) navigate('/home');
  }, [user, navigate]);

  // GSAP Premium Animations
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Hero entrance timeline
      const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // Initial states
      gsap.set([logoRef.current, titleRef.current, subtitleRef.current, ctaRef.current], {
        opacity: 0,
        y: 40,
      });

      // Epic logo reveal with glow
      heroTl
        .to(logoRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'back.out(1.2)',
        })
        .to(titleRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.6,
        }, '-=0.4')
        .to(subtitleRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.5,
        }, '-=0.3')
        .to(ctaRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.5,
        }, '-=0.2');

      // Logo pulse animation
      gsap.to(logoRef.current, {
        scale: 1.02,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // Floating particles animation
      if (particleContainerRef.current) {
        const particles = particleContainerRef.current.querySelectorAll('.cyber-particle');
        particles.forEach((particle, i) => {
          gsap.to(particle, {
            y: `random(-30, 30)`,
            x: `random(-20, 20)`,
            opacity: `random(0.3, 0.7)`,
            duration: `random(3, 5)`,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            delay: i * 0.08,
          });
        });
      }

      // Scroll-triggered sections
      const sections = [tournamentRef, dashboardRef, featuresRef, aiRef, aboutRef];

      sections.forEach((ref) => {
        if (ref.current) {
          gsap.fromTo(ref.current,
            { opacity: 0, y: 60 },
            {
              opacity: 1,
              y: 0,
              duration: 0.7,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: ref.current,
                start: 'top 85%',
                toggleActions: 'play none none reverse',
              },
            }
          );
        }
      });

      // Tournament cards stagger animation
      if (tournamentRef.current) {
        const cards = tournamentRef.current.querySelectorAll('.tournament-card');
        gsap.fromTo(cards,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: tournamentRef.current,
              start: 'top 80%',
            },
          }
        );
      }

      // Feature cards animation
      if (featuresRef.current) {
        const featureCards = featuresRef.current.querySelectorAll('.feature-card');
        gsap.fromTo(featureCards,
          { opacity: 0, scale: 0.95, y: 20 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.4,
            stagger: 0.08,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: featuresRef.current,
              start: 'top 80%',
            },
          }
        );
      }

    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Tilt effect for cards
  const handleCardTilt = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 12;
    const rotateY = (centerX - x) / 12;
    
    gsap.to(card, {
      rotateX: rotateX,
      rotateY: rotateY,
      transformPerspective: 1000,
      duration: 0.3,
      ease: 'power2.out',
    });
  }, []);

  const handleCardTiltReset = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    gsap.to(e.currentTarget, {
      rotateX: 0,
      rotateY: 0,
      duration: 0.4,
      ease: 'power2.out',
    });
  }, []);

  const validateForm = () => {
    const newErrors: typeof errors = {};
    try { emailSchema.parse(email); } catch { newErrors.email = 'Invalid email'; }
    try { passwordSchema.parse(password); } catch { newErrors.password = 'Min 6 characters'; }
    if (authDialog === 'signup') {
      if (!fullName.trim()) newErrors.fullName = 'Required';
      if (!acceptedTerms) newErrors.terms = 'Accept terms';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
        if (authDialog === 'login') {
          const { error } = await signIn(email, password);
          if (error) {
            toast({ title: 'Login Failed', description: error.message, variant: 'destructive' });
          } else {
            const storedRefCode = localStorage.getItem('collab_ref_code');
            if (storedRefCode) {
              const { error: trackErr } = await supabase.functions.invoke('collab-track', {
                body: { action: 'signup', code: storedRefCode },
              });
              if (!trackErr) {
                localStorage.removeItem('collab_ref_code');
              }
            }

            navigate('/home');
          }
        } else {
          const { data, error } = await signUp(email, password);
          if (error) {
            toast({ title: 'Signup Failed', description: error.message, variant: 'destructive' });
          } else if (data?.user) {
            await supabase.from('profiles').upsert({
              user_id: data.user.id,
              email: email.toLowerCase().trim(),
              full_name: fullName.trim(),
            }, { onConflict: 'user_id' });

            // Track referral signup (best-effort; keep code if user isn't authenticated yet)
            const storedRefCode = localStorage.getItem('collab_ref_code');
            if (storedRefCode) {
              const { error: trackErr } = await supabase.functions.invoke('collab-track', {
                body: { action: 'signup', code: storedRefCode },
              });
              if (!trackErr) {
                localStorage.removeItem('collab_ref_code');
              }
            }

            toast({ title: 'Account Created!', description: 'Complete your profile.' });
            navigate('/complete-profile');
          }
        }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const trackReferralSignup = async (code: string) => {
    // Best-effort: this requires an authenticated session (so it may fail right after signup
    // if email confirmation is required). In that case we keep the code in localStorage and
    // retry on next login.
    try {
      const { error } = await supabase.functions.invoke('collab-track', {
        body: { action: 'signup', code },
      });
      if (!error) {
        localStorage.removeItem('collab_ref_code');
      }
    } catch (error) {
      console.error('Error tracking referral:', error);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/home`,
        },
      });
      if (error) {
        toast({ title: 'Google Sign In Failed', description: error.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong with Google sign in.', variant: 'destructive' });
    } finally {
      setGoogleLoading(false);
    }
  };

  // Tournament data
  const liveTournaments = [
    { id: 1, name: 'BGMI Championship', prize: '₹50,000', players: '234/256', status: 'LIVE', game: 'BGMI' },
    { id: 2, name: 'Free Fire Pro League', prize: '₹25,000', players: '180/200', status: 'STARTING', game: 'FF' },
    { id: 3, name: 'College Cup Finals', prize: '₹15,000', players: '64/64', status: 'LIVE', game: 'BGMI' },
  ];

  const features = [
    { icon: Trophy, title: 'Win Prizes', desc: 'Cash & rewards' },
    { icon: Shield, title: 'Fair Play', desc: 'Anti-cheat system' },
    { icon: Swords, title: 'Build Squad', desc: 'Find teammates' },
    { icon: Zap, title: 'Fast Payouts', desc: 'Instant withdraw' },
  ];

  const dashboardFeatures = [
    { icon: Wallet, label: 'Wallet', value: '₹5,240' },
    { icon: BarChart3, label: 'Win Rate', value: '67%' },
    { icon: Crown, label: 'Rank', value: '#142' },
  ];

  return (
    <>
      <SEOHead
        title="Vyuha Esports - The Stage for Underdogs | India's Premier Gaming Platform"
        description="Join Vyuha Esport - India's premier esports platform founded by Abhishek Shukla. Compete in BGMI, Free Fire, COD Mobile tournaments. Win real cash prizes up to ₹1 Lakh!"
        keywords="BGMI tournament, Free Fire tournament India, esports India, Vyuha Esport, Abhishek Shukla, gaming tournaments, mobile esports, competitive gaming India"
        url="https://vyuhaesport.in"
      />
      
      <div ref={containerRef} className="min-h-screen bg-background overflow-hidden text-foreground">
        
        {/* Dark Background with subtle gradients */}
        <div ref={particleContainerRef} className="fixed inset-0 pointer-events-none overflow-hidden">
          {/* Subtle gradient orbs using design system colors */}
          <div className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full blur-[100px] bg-primary/5" />
          <div className="absolute top-1/2 -right-32 w-[350px] h-[350px] rounded-full blur-[100px] bg-muted/10" />
          <div className="absolute -bottom-20 left-1/3 w-[300px] h-[300px] rounded-full blur-[100px] bg-primary/3" />
          
          {/* Grid pattern */}
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `
                linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
            }}
          />
        </div>

        {/* Navbar */}
        <header className="fixed top-0 left-0 right-0 z-50 px-3 py-2.5">
          <nav className="max-w-5xl mx-auto flex items-center justify-between px-5 py-3 rounded-xl glass-card">
            <div className="flex items-center gap-2.5">
              <img src={vyuhaLogo} alt="Vyuha" className="h-9 w-9 rounded-full object-cover ring-1 ring-primary/30" />
              <span className="font-semibold text-base text-foreground tracking-wide">VYUHA</span>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setAuthDialog('login')} 
                className="text-xs h-7 px-3 text-muted-foreground hover:text-foreground font-medium"
              >
                Login
              </Button>
              <Button 
                size="sm" 
                onClick={() => setAuthDialog('signup')} 
                className="text-xs h-7 px-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                Sign Up
              </Button>
            </div>
          </nav>
        </header>

        {/* Hero Section */}
        <section ref={heroRef} className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-14">
          {/* Logo with glow effect */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl scale-150" />
            <img 
              ref={logoRef}
              src={vyuhaLogo} 
              alt="Vyuha Esport" 
              className="relative h-24 w-24 md:h-28 md:w-28 rounded-full object-cover ring-2 ring-primary/30 shadow-xl"
            />
          </div>
          
          {/* Headline */}
          <h1 
            ref={titleRef}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-5 leading-tight tracking-tight"
          >
            <span className="text-foreground">VYUHA ESPORTS</span>
            <br />
            <span className="text-base md:text-xl lg:text-2xl font-medium text-muted-foreground block mt-3">
              The Stage for <span className="text-primary font-semibold">Underdogs</span>
            </span>
          </h1>
          
          <p 
            ref={subtitleRef}
            className="text-muted-foreground text-sm md:text-base mb-8 max-w-md mx-auto text-center leading-relaxed"
          >
            Empowering players from schools & colleges across India. Your journey from underdog to champion starts here.
          </p>

          <div ref={ctaRef} className="flex flex-col sm:flex-row gap-3.5">
            <Button 
              size="default" 
              onClick={() => setAuthDialog('signup')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg gap-2 group px-6 py-3 text-sm font-semibold h-11"
            >
              <Gamepad2 className="h-4.5 w-4.5" />
              Start Playing
              <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Button>
            <Button 
              size="default" 
              variant="outline"
              className="border-border text-foreground hover:bg-muted gap-2 px-6 py-3 text-sm font-medium h-11"
              onClick={() => window.open('https://www.instagram.com/vyuha_freefire?igsh=M3N6bnVncDJ4azVs', '_blank')}
            >
              <Instagram className="h-4.5 w-4.5" />
              Join Community
            </Button>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 rounded-full border border-border flex items-start justify-center p-2">
              <div className="w-1 h-2 bg-muted-foreground rounded-full" />
            </div>
          </div>
        </section>

        {/* Tournament Lobby Section */}
        <section ref={tournamentRef} className="relative z-10 px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-semibold text-foreground">Tournament Lobby</h2>
                <p className="text-muted-foreground text-xs uppercase tracking-wider">Live matches happening now</p>
              </div>
            </div>
            
            <div className="grid gap-4">
              {liveTournaments.map((tournament) => (
                <div
                  key={tournament.id}
                  className="tournament-card group relative p-4 rounded-xl glass-card hover:border-primary/30 transition-all duration-300 cursor-pointer overflow-hidden"
                  onMouseMove={handleCardTilt}
                  onMouseLeave={handleCardTiltReset}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Gamepad2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">{tournament.name}</h3>
                        <p className="text-xs text-muted-foreground">{tournament.players} players</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-primary">{tournament.prize}</div>
                      <div className={`text-[10px] font-medium px-2 py-0.5 rounded inline-block ${
                        tournament.status === 'LIVE' 
                          ? 'bg-success/20 text-success' 
                          : 'bg-warning/20 text-warning'
                      }`}>
                        ● {tournament.status}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Dashboard Preview Section */}
        <section ref={dashboardRef} className="relative z-10 px-3 py-10">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-5">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-semibold text-foreground">Player Dashboard</h2>
                <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Your gaming command center</p>
              </div>
            </div>
            
            <div className="p-4 rounded-xl glass-card">
              {/* Dashboard Header */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Pro_Underdog_42</h3>
                  <p className="text-[10px] text-primary">⭐ Elite Player</p>
                </div>
              </div>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2">
                {dashboardFeatures.map((feature, i) => (
                  <div key={i} className="p-3 rounded-lg bg-card border border-border">
                    <feature.icon className="h-4 w-4 text-primary mb-1.5" />
                    <div className="text-sm font-semibold text-foreground">{feature.value}</div>
                    <div className="text-[9px] text-muted-foreground">{feature.label}</div>
                  </div>
                ))}
              </div>
              
              {/* Quick Stats */}
              <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Tournaments</span>
                  <span className="text-foreground font-medium">47</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1.5">
                  <span className="text-muted-foreground">Total Winnings</span>
                  <span className="text-primary font-medium">₹12,450</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section ref={featuresRef} className="relative z-10 px-3 py-10">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-base md:text-lg font-semibold text-center mb-2 text-foreground">
              Why <span className="text-primary">Vyuha</span>?
            </h2>
            <p className="text-muted-foreground text-[10px] text-center mb-6 uppercase tracking-wider">Built by gamers, for gamers</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {features.map((feature, i) => (
                <div 
                  key={i} 
                  className="feature-card p-3 rounded-xl glass-card hover:border-primary/30 transition-all duration-300 group cursor-pointer"
                  onMouseMove={handleCardTilt}
                  onMouseLeave={handleCardTiltReset}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                    <feature.icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-medium text-foreground text-[11px] mb-0.5">{feature.title}</h3>
                  <p className="text-[9px] text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI Integration Section */}
        <section ref={aiRef} className="relative z-10 px-3 py-10">
          <div className="max-w-3xl mx-auto">
            <div className="p-5 rounded-xl glass-card relative overflow-hidden">
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <Brain className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">
                      Powered by <span className="text-primary">AI</span>
                    </h2>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Smart gaming insights</p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Cpu className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-foreground text-xs">Match Analysis</h4>
                        <p className="text-[10px] text-muted-foreground">AI-powered gameplay breakdown</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Medal className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-foreground text-xs">Performance Tips</h4>
                        <p className="text-[10px] text-muted-foreground">Personalized recommendations</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Target className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-foreground text-xs">Opponent Insights</h4>
                        <p className="text-[10px] text-muted-foreground">Know your competition</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/10 rounded-lg blur-lg" />
                      <div className="relative px-4 py-3 rounded-lg bg-primary/5 border border-primary/20">
                        <Brain className="h-10 w-10 text-primary mx-auto mb-1" />
                        <p className="text-[9px] text-muted-foreground text-center">AI Engine</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About Creator */}
        <section className="relative z-10 px-3 py-10 pb-28">
          <div 
            ref={aboutRef}
            className="max-w-3xl mx-auto p-4 rounded-xl glass-card"
          >
            <div className="flex items-center gap-3 mb-3">
              <img 
                src="/abhishek-shukla.jpg" 
                alt="Abhishek Shukla" 
                className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/30"
              />
              <div>
                <h3 className="font-semibold text-foreground text-sm">Abhishek Shukla</h3>
                <p className="text-[10px] text-primary font-medium">Founder & CEO</p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              An 18-year-old engineering student and tech enthusiast who built Vyuha to bridge the gap between casual gaming and professional esports.
            </p>
            <div className="mt-3 pt-3 border-t border-border">
              <a 
                href="https://instagram.com/abhishek.shhh" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              >
                <Instagram className="h-3 w-3" />
                @abhishek.shhh
              </a>
            </div>
          </div>
        </section>

        {/* CTA Footer - Fixed Button */}
        <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-gradient-to-t from-background via-background/95 to-transparent">
          <Button 
            className="w-full max-w-sm mx-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl py-5 text-xs font-semibold"
            onClick={() => setAuthDialog('signup')}
          >
            <Gamepad2 className="h-4 w-4" />
            Join Vyuha
          </Button>
        </div>

        {/* Auth Dialog */}
        <Dialog open={authDialog !== null} onOpenChange={(open) => !open && setAuthDialog(null)}>
          <DialogContent 
            className="max-w-[380px] max-h-[90vh] p-0 bg-card border border-border text-card-foreground overflow-y-auto"
            aria-describedby={undefined}
          >
            <DialogTitle className="sr-only">
              {authDialog === 'login' ? 'Login' : 'Sign Up'}
            </DialogTitle>
            
            <div className="p-6">
              {/* Title */}
              <h2 className="text-xl font-semibold tracking-tight mb-1 text-foreground">
                {authDialog === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-xs text-muted-foreground mb-6">
                {authDialog === 'login' ? 'Sign in to continue your gaming journey' : 'Join Vyuha and start winning'}
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {authDialog === 'signup' && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium">Full Name</label>
                    <Input 
                      value={fullName}
                      onChange={(e) => { setFullName(e.target.value); setErrors(p => ({...p, fullName: undefined})); }}
                      placeholder="Enter your name"
                      className={`h-10 text-sm bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary ${errors.fullName ? 'border-destructive' : ''}`}
                    />
                    {errors.fullName && <p className="text-[10px] text-destructive">{errors.fullName}</p>}
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Email</label>
                  <Input 
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrors(p => ({...p, email: undefined})); }}
                    placeholder="Enter your email"
                    className={`h-10 text-sm bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary ${errors.email ? 'border-destructive' : ''}`}
                  />
                  {errors.email && <p className="text-[10px] text-destructive">{errors.email}</p>}
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Password</label>
                  <div className="relative">
                    <Input 
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrors(p => ({...p, password: undefined})); }}
                      placeholder="••••••••"
                      className={`h-10 pr-10 text-sm bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary ${errors.password ? 'border-destructive' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-[10px] text-destructive">{errors.password}</p>}
                </div>

                {authDialog === 'signup' ? (
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      checked={acceptedTerms} 
                      onCheckedChange={(c) => { setAcceptedTerms(!!c); setErrors(p => ({...p, terms: undefined})); }}
                      className="h-4 w-4 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <label className="text-xs text-muted-foreground">
                      I accept the terms & conditions
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <button 
                      type="button" 
                      onClick={() => {
                        setAuthDialog(null);
                        navigate('/forgot-password');
                      }}
                      className="text-xs text-primary hover:underline font-medium ml-auto"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
                
                {errors.terms && <p className="text-[10px] text-destructive">{errors.terms}</p>}

                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full h-11 text-sm bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {authDialog === 'login' ? 'Sign In' : 'Create Account'}
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Google Sign In */}
              {googleAuthEnabled && (
                <>
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-card px-2 text-muted-foreground">or</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                    className="w-full h-11 text-sm border-border hover:bg-muted gap-2"
                  >
                    {googleLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Continue with Google
                      </>
                    )}
                  </Button>
                </>
              )}

              {/* Switch */}
              <p className="text-center text-xs text-muted-foreground pt-4">
                {authDialog === 'login' ? (
                  <>Don't have an account? <button type="button" onClick={() => setAuthDialog('signup')} className="text-primary hover:underline font-medium">Sign up</button></>
                ) : (
                  <>Already have an account? <button type="button" onClick={() => setAuthDialog('login')} className="text-primary hover:underline font-medium">Login</button></>
                )}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default Landing;
