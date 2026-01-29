import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import SEOHead from '@/components/SEOHead';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import { 
  Trophy, ChevronRight, Wallet, BarChart3, User, Zap,
  Target, Shield, Eye, EyeOff, Loader2, Gamepad2, Brain,
  Swords, Crosshair, Medal, Flame, Users, Star, Crown, Cpu, Instagram
} from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const emailSchema = z.string().email('Invalid email');
const passwordSchema = z.string().min(6, 'Min 6 characters');

// Glitch Text Component
const GlitchText = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  return (
    <span className={`glitch-text relative inline-block ${className}`} data-text={children}>
      {children}
    </span>
  );
};

const Landing = () => {
  const [authDialog, setAuthDialog] = useState<'login' | 'signup' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string; terms?: string }>({});
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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

  // Tournament data
  const liveTournaments = [
    { id: 1, name: 'BGMI Championship', prize: '₹50,000', players: '234/256', status: 'LIVE', game: 'BGMI' },
    { id: 2, name: 'Free Fire Pro League', prize: '₹25,000', players: '180/200', status: 'STARTING', game: 'FF' },
    { id: 3, name: 'College Cup Finals', prize: '₹15,000', players: '64/64', status: 'LIVE', game: 'BGMI' },
  ];

  const features = [
    { icon: Trophy, title: 'Win Prizes', desc: 'Cash & rewards', color: 'from-yellow-500 to-orange-500' },
    { icon: Shield, title: 'Fair Play', desc: 'Anti-cheat system', color: 'from-cyan-500 to-blue-500' },
    { icon: Swords, title: 'Build Squad', desc: 'Find teammates', color: 'from-purple-500 to-pink-500' },
    { icon: Zap, title: 'Fast Payouts', desc: 'Instant withdraw', color: 'from-green-500 to-emerald-500' },
  ];

  const dashboardFeatures = [
    { icon: Wallet, label: 'Wallet', value: '₹5,240', color: 'text-green-400' },
    { icon: BarChart3, label: 'Win Rate', value: '67%', color: 'text-cyan-400' },
    { icon: Crown, label: 'Rank', value: '#142', color: 'text-yellow-400' },
  ];

  return (
    <>
      <SEOHead
        title="Vyuha Esports - The Stage for Underdogs | India's Premier Gaming Platform"
        description="Join Vyuha Esport - India's premier esports platform founded by Abhishek Shukla. Compete in BGMI, Free Fire, COD Mobile tournaments. Win real cash prizes up to ₹1 Lakh!"
        keywords="BGMI tournament, Free Fire tournament India, esports India, Vyuha Esport, Abhishek Shukla, gaming tournaments, mobile esports, competitive gaming India"
        url="https://vyuhaesport.in"
      />
      
      {/* Glitch CSS */}
      <style>{`
        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
          100% { transform: translate(0); }
        }
        
        @keyframes glitch-skew {
          0% { transform: skew(0deg); }
          20% { transform: skew(-1deg); }
          40% { transform: skew(1deg); }
          60% { transform: skew(-0.5deg); }
          80% { transform: skew(0.5deg); }
          100% { transform: skew(0deg); }
        }
        
        .glitch-text {
          animation: glitch-skew 4s infinite linear alternate-reverse;
        }
        
        .glitch-text::before,
        .glitch-text::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        
        .glitch-text::before {
          left: 2px;
          text-shadow: -2px 0 #ff00ff;
          clip: rect(24px, 550px, 90px, 0);
          animation: glitch 3s infinite linear alternate-reverse;
        }
        
        .glitch-text::after {
          left: -2px;
          text-shadow: -2px 0 #00ffff;
          clip: rect(85px, 550px, 140px, 0);
          animation: glitch 2s infinite linear alternate-reverse;
        }
        
        .glitch-underline {
          position: relative;
        }
        
        .glitch-underline::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #6366f1, #a855f7, #06b6d4);
          animation: glitch 2s infinite linear alternate-reverse;
        }
      `}</style>
      
      <div ref={containerRef} className="min-h-screen bg-[#0a0a0f] overflow-hidden text-white">
        
        {/* Cyberpunk Background - Static (No Mouse Effects) */}
        <div ref={particleContainerRef} className="fixed inset-0 pointer-events-none overflow-hidden">
          {/* Animated particles */}
          {[...Array(25)].map((_, i) => (
            <div
              key={i}
              className="cyber-particle absolute rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${Math.random() * 3 + 1}px`,
                height: `${Math.random() * 3 + 1}px`,
                background: i % 3 === 0 
                  ? 'rgba(99, 102, 241, 0.5)' 
                  : i % 3 === 1 
                    ? 'rgba(139, 92, 246, 0.5)' 
                    : 'rgba(6, 182, 212, 0.4)',
                boxShadow: i % 3 === 0 
                  ? '0 0 10px rgba(99, 102, 241, 0.6)' 
                  : i % 3 === 1 
                    ? '0 0 10px rgba(139, 92, 246, 0.6)' 
                    : '0 0 10px rgba(6, 182, 212, 0.5)',
              }}
            />
          ))}
          
          {/* Static gradient orbs */}
          <div className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full blur-[80px] bg-indigo-600/20" />
          <div className="absolute top-1/2 -right-32 w-[350px] h-[350px] rounded-full blur-[80px] bg-purple-600/15" />
          <div className="absolute -bottom-20 left-1/3 w-[300px] h-[300px] rounded-full blur-[80px] bg-cyan-600/15" />
          
          {/* Cyberpunk grid */}
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(99, 102, 241, 0.4) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(99, 102, 241, 0.4) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
            }}
          />
        </div>

        {/* Glassmorphic Navbar - Compact */}
        <header className="fixed top-0 left-0 right-0 z-50 px-3 py-2">
          <nav className="max-w-5xl mx-auto flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="flex items-center gap-2">
              <img src={vyuhaLogo} alt="Vyuha" className="h-7 w-7 rounded-full object-cover ring-1 ring-indigo-500/50" />
              <span className="font-bold text-sm bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent">VYUHA</span>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setAuthDialog('login')} 
                className="text-[10px] h-7 px-2 text-white/80 hover:text-white hover:bg-white/10"
              >
                Login
              </Button>
              <Button 
                size="sm" 
                onClick={() => setAuthDialog('signup')} 
                className="text-[10px] h-7 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border border-indigo-400/30"
              >
                Sign Up
              </Button>
            </div>
          </nav>
        </header>

        {/* Hero Section - Compact with Glitch Effect */}
        <section ref={heroRef} className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 pt-16 pb-12">
          {/* Logo with glow effect - Smaller */}
          <div className="relative mb-5">
            <div className="absolute inset-0 bg-indigo-500/25 rounded-full blur-2xl scale-150" />
            <img 
              ref={logoRef}
              src={vyuhaLogo} 
              alt="Vyuha Esport" 
              className="relative h-20 w-20 md:h-24 md:w-24 rounded-full object-cover ring-2 ring-indigo-500/50 shadow-xl shadow-indigo-500/30"
            />
          </div>
          
          {/* Headline with Glitch Effect */}
          <h1 
            ref={titleRef}
            className="text-2xl md:text-4xl lg:text-5xl font-black text-center mb-4 leading-tight"
          >
            <GlitchText className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              VYUHA ESPORTS
            </GlitchText>
            <br />
            <span className="text-base md:text-xl lg:text-2xl font-bold text-white/90 block mt-2">
              The Stage for <span className="glitch-underline text-cyan-400">Underdogs</span>
            </span>
          </h1>
          
          <p 
            ref={subtitleRef}
            className="text-white/60 text-xs md:text-sm mb-6 max-w-sm mx-auto text-center leading-relaxed"
          >
            Empowering players from schools & colleges across India. Your journey from underdog to champion starts here.
          </p>

          <div ref={ctaRef} className="flex flex-col sm:flex-row gap-3">
            <Button 
              size="default" 
              onClick={() => setAuthDialog('signup')}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30 gap-1.5 group px-5 py-2 text-xs font-semibold"
            >
              <Gamepad2 className="h-3.5 w-3.5" />
              Start Playing
              <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </Button>
            <Button 
              size="default" 
              variant="ghost"
              className="bg-transparent border border-white/20 text-white/80 hover:bg-white/10 hover:text-white gap-1.5 px-5 py-2 text-xs"
              onClick={() => window.open('https://www.instagram.com/vyuha_freefire?igsh=M3N6bnVncDJ4azVs', '_blank')}
            >
              <Instagram className="h-3.5 w-3.5" />
              Join Community
            </Button>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-bounce">
            <div className="w-5 h-8 rounded-full border border-white/30 flex items-start justify-center p-1.5">
              <div className="w-0.5 h-1.5 bg-white/50 rounded-full" />
            </div>
          </div>
        </section>

        {/* Tournament Lobby Section - Compact */}
        <section ref={tournamentRef} className="relative z-10 px-3 py-10">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-5">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30">
                <Trophy className="h-4 w-4 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-white">Tournament Lobby</h2>
                <p className="text-white/50 text-[10px]">Live matches happening now</p>
              </div>
            </div>
            
            <div className="grid gap-3">
              {liveTournaments.map((tournament) => (
                <div
                  key={tournament.id}
                  className="tournament-card group relative p-3 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-indigo-500/50 transition-all duration-300 cursor-pointer overflow-hidden"
                  onMouseMove={handleCardTilt}
                  onMouseLeave={handleCardTiltReset}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/0 via-purple-600/0 to-cyan-600/0 group-hover:from-indigo-600/5 group-hover:via-purple-600/5 group-hover:to-cyan-600/5 transition-all duration-300" />
                  
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-600/30 to-purple-600/30 flex items-center justify-center border border-indigo-500/30">
                        <Gamepad2 className="h-4 w-4 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-xs text-white group-hover:text-indigo-300 transition-colors">{tournament.name}</h3>
                        <p className="text-[10px] text-white/50">{tournament.players} players</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-cyan-400">{tournament.prize}</div>
                      <div className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full inline-block ${
                        tournament.status === 'LIVE' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-yellow-500/20 text-yellow-400'
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

        {/* Dashboard Preview Section - Compact */}
        <section ref={dashboardRef} className="relative z-10 px-3 py-10">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-5">
              <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border border-cyan-500/30">
                <User className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-white">Player Dashboard</h2>
                <p className="text-white/50 text-[10px]">Your gaming command center</p>
              </div>
            </div>
            
            <div className="p-4 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10">
              {/* Dashboard Header */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Pro_Underdog_42</h3>
                  <p className="text-[10px] text-cyan-400">⭐ Elite Player</p>
                </div>
              </div>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2">
                {dashboardFeatures.map((feature, i) => (
                  <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <feature.icon className={`h-4 w-4 ${feature.color} mb-1.5`} />
                    <div className={`text-base font-bold ${feature.color}`}>{feature.value}</div>
                    <div className="text-[9px] text-white/50">{feature.label}</div>
                  </div>
                ))}
              </div>
              
              {/* Quick Stats */}
              <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-indigo-600/10 to-purple-600/10 border border-indigo-500/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Tournaments</span>
                  <span className="text-white font-semibold">47</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1.5">
                  <span className="text-white/60">Total Winnings</span>
                  <span className="text-green-400 font-semibold">₹12,450</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid - Compact */}
        <section ref={featuresRef} className="relative z-10 px-3 py-10">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-lg md:text-xl font-bold text-center mb-2 text-white">
              <GlitchText>Why Vyuha?</GlitchText>
            </h2>
            <p className="text-white/50 text-[10px] text-center mb-6">Built by gamers, for gamers</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {features.map((feature, i) => (
                <div 
                  key={i} 
                  className="feature-card p-3 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-indigo-500/40 transition-all duration-300 group cursor-pointer"
                  onMouseMove={handleCardTilt}
                  onMouseLeave={handleCardTiltReset}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-2.5 shadow-lg group-hover:scale-105 transition-transform`}>
                    <feature.icon className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="font-bold text-white text-[11px] mb-0.5">{feature.title}</h3>
                  <p className="text-[9px] text-white/50">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Groq AI Integration Section - Compact */}
        <section ref={aiRef} className="relative z-10 px-3 py-10">
          <div className="max-w-3xl mx-auto">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-900/30 via-indigo-900/30 to-cyan-900/30 backdrop-blur-xl border border-purple-500/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-transparent to-cyan-600/5" />
              
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-purple-600/30 to-cyan-600/30 border border-purple-500/30">
                    <Brain className="h-4 w-4 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      <GlitchText>Powered by AI</GlitchText>
                    </h2>
                    <p className="text-white/50 text-[10px]">Smart gaming insights</p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Cpu className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-white text-xs">Match Analysis</h4>
                        <p className="text-[10px] text-white/50">AI-powered gameplay breakdown</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Star className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-white text-xs">Performance Tips</h4>
                        <p className="text-[10px] text-white/50">Personalized recommendations</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Target className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-white text-xs">Opponent Insights</h4>
                        <p className="text-[10px] text-white/50">Know your competition</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl blur-lg opacity-20" />
                      <div className="relative px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-purple-500/30">
                        <Brain className="h-10 w-10 text-purple-400 mx-auto mb-1" />
                        <p className="text-[9px] text-white/60 text-center">Groq AI</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About Creator - Compact */}
        <section className="relative z-10 px-3 py-10 pb-28">
          <div 
            ref={aboutRef}
            className="max-w-3xl mx-auto p-4 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10"
          >
            <div className="flex items-center gap-3 mb-3">
              <img 
                src="/abhishek-shukla.jpg" 
                alt="Abhishek Shukla" 
                className="h-12 w-12 rounded-full object-cover ring-2 ring-indigo-500/50"
              />
              <div>
                <h3 className="font-bold text-white text-sm">Abhishek Shukla</h3>
                <p className="text-[10px] text-indigo-400 font-medium">Founder & CEO</p>
              </div>
            </div>
            <p className="text-[11px] text-white/60 leading-relaxed">
              An 18-year-old engineering student and tech enthusiast who built Vyuha to bridge the gap between casual gaming and professional esports.
            </p>
            <div className="mt-3 pt-3 border-t border-white/10">
              <a 
                href="https://instagram.com/abhishek.shhh" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
              >
                <Instagram className="h-3 w-3" />
                @abhishek.shhh
              </a>
            </div>
          </div>
        </section>

        {/* CTA Footer - Fixed Button */}
        <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/95 to-transparent">
          <Button 
            className="w-full max-w-sm mx-auto flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-xl shadow-indigo-500/25 border border-indigo-400/30 py-5 text-sm font-semibold"
            onClick={() => setAuthDialog('signup')}
          >
            <Gamepad2 className="h-4 w-4" />
            Join Vyuha
          </Button>
        </div>

        {/* Tactical Terminal Auth Dialog */}
        <Dialog open={authDialog !== null} onOpenChange={(open) => !open && setAuthDialog(null)}>
          <DialogContent className="max-w-sm p-0 bg-[#0d0d0d] border border-[#1a1a1a] text-white overflow-hidden font-mono">
            {/* Corner Accents */}
            <div className="absolute top-0 left-0 w-3 h-3 border-l-2 border-t-2 border-[#00ff00]" />
            <div className="absolute top-0 right-0 w-3 h-3 border-r-2 border-t-2 border-[#00ff00]" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-l-2 border-b-2 border-[#00ff00]" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 border-[#00ff00]" />
            
            <div className="p-6">
              {/* Status Badge */}
              <div className="mb-4">
                <span className="inline-block px-3 py-1.5 bg-[#00ff00] text-black text-[10px] font-bold tracking-wider uppercase">
                  {authDialog === 'login' ? 'SECURITY_GATEWAY_ACTIVE' : 'REGISTRATION_GATEWAY_ACTIVE'}
                </span>
              </div>
              
              {/* Title */}
              <h2 className="text-2xl font-black tracking-tight mb-1">
                {authDialog === 'login' ? (
                  <>SYSTEM <span className="text-[#00ff00]">ACCESS</span></>
                ) : (
                  <>CREATE <span className="text-[#00ff00]">CREDENTIALS</span></>
                )}
              </h2>
              <p className="text-[10px] text-gray-500 tracking-[0.2em] uppercase mb-6">
                {authDialog === 'login' ? 'IDENTIFY YOURSELF TO PROCEED' : 'ENROLL YOUR PROFILE INTO THE NETWORK'}
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {authDialog === 'signup' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#00ff00] tracking-[0.15em] uppercase font-bold">OPERATOR_IDENTITY</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">
                        <User className="h-4 w-4" />
                      </div>
                      <Input 
                        value={fullName}
                        onChange={(e) => { setFullName(e.target.value); setErrors(p => ({...p, fullName: undefined})); }}
                        placeholder="OPERATOR_NAME"
                        className={`h-11 pl-10 text-xs bg-[#0a0a0a] border-[#1a1a1a] text-gray-400 placeholder:text-gray-600 placeholder:tracking-wider focus:border-[#00ff00] focus:ring-0 rounded-none font-mono uppercase ${errors.fullName ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.fullName && <p className="text-[9px] text-red-500 tracking-wider">{errors.fullName}</p>}
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#00ff00] tracking-[0.15em] uppercase font-bold">
                    {authDialog === 'login' ? 'IDENTITY_HANDLE' : 'COMMS_CHANNEL'}
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">
                      <span className="text-sm">@</span>
                    </div>
                    <Input 
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setErrors(p => ({...p, email: undefined})); }}
                      placeholder={authDialog === 'login' ? 'OPERATOR_NAME' : 'COMMS_CHANNEL'}
                      className={`h-11 pl-10 text-xs bg-[#0a0a0a] border-[#1a1a1a] text-gray-400 placeholder:text-gray-600 placeholder:tracking-wider focus:border-[#00ff00] focus:ring-0 rounded-none font-mono uppercase ${errors.email ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.email && <p className="text-[9px] text-red-500 tracking-wider">{errors.email}</p>}
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#00ff00] tracking-[0.15em] uppercase font-bold">
                    {authDialog === 'login' ? 'ACCESS_CODE' : 'SECURE_CODE'}
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">
                      <Shield className="h-4 w-4" />
                    </div>
                    <Input 
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrors(p => ({...p, password: undefined})); }}
                      placeholder={authDialog === 'login' ? '••••••••' : 'SECURE_CODE'}
                      className={`h-11 pl-10 pr-10 text-xs bg-[#0a0a0a] border-[#1a1a1a] text-gray-400 placeholder:text-gray-600 placeholder:tracking-wider focus:border-[#00ff00] focus:ring-0 rounded-none font-mono ${errors.password ? 'border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-[9px] text-red-500 tracking-wider">{errors.password}</p>}
                </div>

                {authDialog === 'signup' ? (
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      checked={acceptedTerms} 
                      onCheckedChange={(c) => { setAcceptedTerms(!!c); setErrors(p => ({...p, terms: undefined})); }}
                      className="h-4 w-4 border-[#1a1a1a] data-[state=checked]:bg-[#00ff00] data-[state=checked]:border-[#00ff00] rounded-none"
                    />
                    <label className="text-[10px] text-gray-500 tracking-wider uppercase">
                      ACCEPT_NETWORK_PROTOCOLS
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        className="h-4 w-4 border-[#1a1a1a] data-[state=checked]:bg-[#00ff00] data-[state=checked]:border-[#00ff00] rounded-none"
                      />
                      <label className="text-[10px] text-gray-500 tracking-wider uppercase">
                        REMEMBER_TERMINAL
                      </label>
                    </div>
                    <button type="button" className="text-[10px] text-[#00ff00] tracking-wider uppercase hover:underline">
                      FORGOT_CODE?
                    </button>
                  </div>
                )}
                {errors.terms && <p className="text-[9px] text-red-500 tracking-wider">{errors.terms}</p>}

                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full h-12 text-xs bg-[#00ff00] hover:bg-[#00dd00] text-black font-bold tracking-[0.15em] uppercase rounded-none border-0"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {authDialog === 'login' ? 'INITIALIZE_LOGIN' : 'INITIALIZE_REGISTRATION'}
                      <Zap className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                {/* Divider */}
                <div className="relative py-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#1a1a1a]" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-[#0d0d0d] px-3 text-[9px] text-gray-600 tracking-[0.2em] uppercase">
                      NETWORK_INTEGRATIONS
                    </span>
                  </div>
                </div>

                {/* Social Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="h-10 bg-[#0a0a0a] border-[#1a1a1a] text-white hover:bg-[#1a1a1a] hover:border-[#2a2a2a] rounded-none text-[10px] tracking-wider uppercase font-medium"
                  >
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    GOOGLE
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="h-10 bg-[#0a0a0a] border-[#1a1a1a] text-white hover:bg-[#1a1a1a] hover:border-[#2a2a2a] rounded-none text-[10px] tracking-wider uppercase font-medium"
                  >
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                    </svg>
                    DISCORD
                  </Button>
                </div>

                {/* Switch Auth Mode */}
                <p className="text-center text-[10px] text-gray-500 tracking-wider uppercase pt-2">
                  {authDialog === 'login' ? (
                    <>NEW OPERATOR? <button type="button" onClick={() => setAuthDialog('signup')} className="text-[#00ff00] hover:underline">REQUEST_ACCESS_CREDENTIALS</button></>
                  ) : (
                    <>ALREADY REGISTERED? <button type="button" onClick={() => setAuthDialog('login')} className="text-[#00ff00] hover:underline">INITIALIZE_LOGIN_SEQUENCE</button></>
                  )}
                </p>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default Landing;
