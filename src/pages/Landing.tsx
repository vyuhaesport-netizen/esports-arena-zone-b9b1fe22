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
  Swords, Crosshair, Medal, Flame, Users, Star, Crown, Cpu
} from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const emailSchema = z.string().email('Invalid email');
const passwordSchema = z.string().min(6, 'Min 6 characters');

// Mouse position hook for parallax
const useMousePosition = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ 
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2 
      });
    };
    
    window.addEventListener('mousemove', updateMousePosition);
    return () => window.removeEventListener('mousemove', updateMousePosition);
  }, []);
  
  return mousePosition;
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
  const mousePosition = useMousePosition();

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
        y: 60,
      });

      // Epic logo reveal with glow
      heroTl
        .to(logoRef.current, {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: 'back.out(1.4)',
        })
        .to(titleRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.8,
        }, '-=0.5')
        .to(subtitleRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.6,
        }, '-=0.4')
        .to(ctaRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.6,
        }, '-=0.3');

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
            y: `random(-50, 50)`,
            x: `random(-30, 30)`,
            opacity: `random(0.3, 0.8)`,
            duration: `random(3, 6)`,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            delay: i * 0.1,
          });
        });
      }

      // Scroll-triggered sections with stagger
      const sections = [
        { ref: tournamentRef, delay: 0 },
        { ref: dashboardRef, delay: 0.1 },
        { ref: featuresRef, delay: 0.2 },
        { ref: aiRef, delay: 0.3 },
        { ref: aboutRef, delay: 0.4 },
      ];

      sections.forEach(({ ref }) => {
        if (ref.current) {
          gsap.fromTo(ref.current,
            { opacity: 0, y: 80 },
            {
              opacity: 1,
              y: 0,
              duration: 0.8,
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
          { opacity: 0, y: 40, rotateX: -15 },
          {
            opacity: 1,
            y: 0,
            rotateX: 0,
            duration: 0.6,
            stagger: 0.15,
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
          { opacity: 0, scale: 0.9, y: 30 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.1,
            ease: 'back.out(1.2)',
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
    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;
    
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
      duration: 0.5,
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
    { icon: Trophy, title: 'Win Real Prizes', desc: 'Cash prizes & exclusive rewards', color: 'from-yellow-500 to-orange-500' },
    { icon: Shield, title: 'Fair Play Guaranteed', desc: 'Anti-cheat & transparent rules', color: 'from-cyan-500 to-blue-500' },
    { icon: Swords, title: 'Build Your Squad', desc: 'Find teammates & dominate', color: 'from-purple-500 to-pink-500' },
    { icon: Zap, title: 'Instant Payouts', desc: 'Win & withdraw instantly', color: 'from-green-500 to-emerald-500' },
  ];

  const dashboardFeatures = [
    { icon: Wallet, label: 'Player Wallet', value: '₹5,240', color: 'text-green-400' },
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
      <div ref={containerRef} className="min-h-screen bg-[#0a0a0f] overflow-hidden text-white">
        
        {/* Cyberpunk Background with Mouse-Reactive Particles */}
        <div 
          ref={particleContainerRef} 
          className="fixed inset-0 pointer-events-none overflow-hidden"
          style={{
            transform: `translate(${mousePosition.x * 10}px, ${mousePosition.y * 10}px)`,
            transition: 'transform 0.3s ease-out',
          }}
        >
          {/* Animated particles */}
          {[...Array(40)].map((_, i) => (
            <div
              key={i}
              className="cyber-particle absolute rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${Math.random() * 4 + 2}px`,
                height: `${Math.random() * 4 + 2}px`,
                background: i % 3 === 0 
                  ? 'rgba(99, 102, 241, 0.6)' 
                  : i % 3 === 1 
                    ? 'rgba(139, 92, 246, 0.6)' 
                    : 'rgba(6, 182, 212, 0.5)',
                boxShadow: i % 3 === 0 
                  ? '0 0 15px rgba(99, 102, 241, 0.8)' 
                  : i % 3 === 1 
                    ? '0 0 15px rgba(139, 92, 246, 0.8)' 
                    : '0 0 15px rgba(6, 182, 212, 0.7)',
              }}
            />
          ))}
          
          {/* Large gradient orbs with parallax */}
          <div 
            className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full blur-[100px]"
            style={{
              background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
              transform: `translate(${mousePosition.x * 30}px, ${mousePosition.y * 30}px)`,
            }}
          />
          <div 
            className="absolute top-1/2 -right-48 w-[500px] h-[500px] rounded-full blur-[100px]"
            style={{
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, transparent 70%)',
              transform: `translate(${mousePosition.x * -20}px, ${mousePosition.y * 20}px)`,
            }}
          />
          <div 
            className="absolute -bottom-32 left-1/3 w-[400px] h-[400px] rounded-full blur-[100px]"
            style={{
              background: 'radial-gradient(circle, rgba(6, 182, 212, 0.2) 0%, transparent 70%)',
              transform: `translate(${mousePosition.x * 15}px, ${mousePosition.y * -15}px)`,
            }}
          />
          
          {/* Cyberpunk grid */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(99, 102, 241, 0.5) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(99, 102, 241, 0.5) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
            }}
          />
          
          {/* Scan lines effect */}
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
            }}
          />
        </div>

        {/* Glassmorphic Navbar */}
        <header className="fixed top-0 left-0 right-0 z-50 px-4 py-3">
          <nav className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl shadow-indigo-500/10">
            <div className="flex items-center gap-3">
              <img src={vyuhaLogo} alt="Vyuha" className="h-10 w-10 rounded-full object-cover ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-500/30" />
              <span className="font-bold text-lg bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent tracking-wider">VYUHA</span>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setAuthDialog('login')} 
                className="text-xs text-white/80 hover:text-white hover:bg-white/10 border border-transparent hover:border-indigo-500/50 transition-all duration-300"
              >
                Login
              </Button>
              <Button 
                size="sm" 
                onClick={() => setAuthDialog('signup')} 
                className="text-xs bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border border-indigo-400/30 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-300"
              >
                Sign Up
              </Button>
            </div>
          </nav>
        </header>

        {/* Hero Section - The Shock Factor */}
        <section ref={heroRef} className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-16">
          {/* Logo with glow effect */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-indigo-500/30 rounded-full blur-3xl scale-150 animate-pulse" />
            <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-2xl scale-125" />
            <img 
              ref={logoRef}
              src={vyuhaLogo} 
              alt="Vyuha Esport" 
              className="relative h-28 w-28 md:h-36 md:w-36 rounded-full object-cover ring-4 ring-indigo-500/50 shadow-2xl shadow-indigo-500/40"
            />
          </div>
          
          {/* Massive Headline */}
          <h1 
            ref={titleRef}
            className="text-4xl md:text-6xl lg:text-7xl font-black text-center mb-6 leading-tight"
          >
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">VYUHA ESPORTS</span>
            <br />
            <span className="text-2xl md:text-3xl lg:text-4xl font-bold text-white/90 block mt-2">
              The Stage for <span className="text-cyan-400 underline decoration-wavy decoration-cyan-400/50">Underdogs</span>
            </span>
          </h1>
          
          <p 
            ref={subtitleRef}
            className="text-white/60 text-sm md:text-base mb-10 max-w-lg mx-auto text-center leading-relaxed"
          >
            Empowering players from schools and colleges across India. Your journey from underdog to champion starts here.
          </p>

          <div ref={ctaRef} className="flex flex-col sm:flex-row gap-4">
            <Button 
              size="lg" 
              onClick={() => setAuthDialog('signup')}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 border border-indigo-400/30 gap-2 group px-8 py-6 text-base font-semibold"
            >
              <Gamepad2 className="h-5 w-5" />
              Start Playing Now
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-white/20 text-white/80 hover:bg-white/10 hover:text-white hover:border-cyan-500/50 gap-2 px-8 py-6"
            >
              <Users className="h-5 w-5" />
              Join Community
            </Button>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
              <div className="w-1 h-2 bg-white/50 rounded-full animate-pulse" />
            </div>
          </div>
        </section>

        {/* Tournament Lobby Section */}
        <section ref={tournamentRef} className="relative z-10 px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30">
                <Trophy className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">Tournament Lobby</h2>
                <p className="text-white/50 text-sm">Live matches happening right now</p>
              </div>
            </div>
            
            <div className="grid gap-4">
              {liveTournaments.map((tournament) => (
                <div
                  key={tournament.id}
                  className="tournament-card group relative p-5 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-indigo-500/50 transition-all duration-500 cursor-pointer overflow-hidden"
                  onMouseMove={handleCardTilt}
                  onMouseLeave={handleCardTiltReset}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/0 via-purple-600/0 to-cyan-600/0 group-hover:from-indigo-600/10 group-hover:via-purple-600/10 group-hover:to-cyan-600/10 transition-all duration-500" />
                  
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-600/30 to-purple-600/30 flex items-center justify-center border border-indigo-500/30">
                        <Gamepad2 className="h-6 w-6 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white group-hover:text-indigo-300 transition-colors">{tournament.name}</h3>
                        <p className="text-xs text-white/50">{tournament.players} players</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-cyan-400">{tournament.prize}</div>
                      <div className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block ${
                        tournament.status === 'LIVE' 
                          ? 'bg-green-500/20 text-green-400 animate-pulse' 
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

        {/* Dashboard Preview Section */}
        <section ref={dashboardRef} className="relative z-10 px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border border-cyan-500/30">
                <User className="h-6 w-6 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">Player Dashboard</h2>
                <p className="text-white/50 text-sm">Your gaming command center</p>
              </div>
            </div>
            
            <div className="p-6 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-2xl">
              {/* Dashboard Header */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <User className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Pro_Underdog_42</h3>
                  <p className="text-xs text-cyan-400">⭐ Elite Player</p>
                </div>
              </div>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                {dashboardFeatures.map((feature, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-all">
                    <feature.icon className={`h-5 w-5 ${feature.color} mb-2`} />
                    <div className={`text-xl font-bold ${feature.color}`}>{feature.value}</div>
                    <div className="text-xs text-white/50">{feature.label}</div>
                  </div>
                ))}
              </div>
              
              {/* Quick Stats */}
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-indigo-600/10 to-purple-600/10 border border-indigo-500/20">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Tournaments Played</span>
                  <span className="text-white font-semibold">47</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-white/60">Total Winnings</span>
                  <span className="text-green-400 font-semibold">₹12,450</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section ref={featuresRef} className="relative z-10 px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-3 text-white">Why Choose Vyuha?</h2>
            <p className="text-white/50 text-center mb-10">Built by gamers, for gamers</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {features.map((feature, i) => (
                <div 
                  key={i} 
                  className="feature-card p-5 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-indigo-500/40 transition-all duration-300 group cursor-pointer"
                  onMouseMove={handleCardTilt}
                  onMouseLeave={handleCardTiltReset}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-white text-sm mb-1">{feature.title}</h3>
                  <p className="text-xs text-white/50">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Groq AI Integration Section */}
        <section ref={aiRef} className="relative z-10 px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="p-8 rounded-3xl bg-gradient-to-br from-purple-900/30 via-indigo-900/30 to-cyan-900/30 backdrop-blur-xl border border-purple-500/20 relative overflow-hidden">
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-transparent to-cyan-600/10 animate-pulse" />
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-600/30 to-cyan-600/30 border border-purple-500/30">
                    <Brain className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white">Powered by AI</h2>
                    <p className="text-white/50 text-sm">Smart insights for smarter gaming</p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Cpu className="h-5 w-5 text-cyan-400 mt-1" />
                      <div>
                        <h4 className="font-semibold text-white text-sm">Match Analysis</h4>
                        <p className="text-xs text-white/50">AI-powered breakdown of your gameplay</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Star className="h-5 w-5 text-yellow-400 mt-1" />
                      <div>
                        <h4 className="font-semibold text-white text-sm">Performance Tips</h4>
                        <p className="text-xs text-white/50">Personalized recommendations to improve</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Target className="h-5 w-5 text-green-400 mt-1" />
                      <div>
                        <h4 className="font-semibold text-white text-sm">Opponent Insights</h4>
                        <p className="text-xs text-white/50">Know your competition before the match</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl blur-xl opacity-30 animate-pulse" />
                      <div className="relative px-6 py-4 rounded-2xl bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-purple-500/30">
                        <Brain className="h-16 w-16 text-purple-400 mx-auto mb-2" />
                        <p className="text-xs text-white/60 text-center">Groq AI Integration</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About Creator */}
        <section className="relative z-10 px-4 py-16 pb-32">
          <div 
            ref={aboutRef}
            className="max-w-4xl mx-auto p-6 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10"
          >
            <div className="flex items-center gap-4 mb-4">
              <img 
                src="/abhishek-shukla.jpg" 
                alt="Abhishek Shukla" 
                className="h-16 w-16 rounded-full object-cover ring-2 ring-indigo-500/50 shadow-lg"
              />
              <div>
                <h3 className="font-bold text-white text-lg">Abhishek Shukla</h3>
                <p className="text-xs text-indigo-400 font-medium">Founder & CEO</p>
              </div>
            </div>
            <p className="text-sm text-white/60 leading-relaxed">
              An 18-year-old engineering student and tech enthusiast who built Vyuha to bridge the gap between casual gaming and professional esports. Our mission is to give every underdog a fair chance to shine.
            </p>
            <div className="mt-4 pt-4 border-t border-white/10">
              <a href="https://instagram.com/abhishek.shhh" target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                @abhishek.shhh
              </a>
            </div>
          </div>
        </section>

        {/* CTA Footer */}
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/95 to-transparent">
          <Button 
            className="w-full max-w-md mx-auto block bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-2xl shadow-indigo-500/30 border border-indigo-400/30 py-6 text-base font-semibold"
            onClick={() => setAuthDialog('signup')}
          >
            <Gamepad2 className="h-5 w-5 mr-2" />
            Join Vyuha Now
          </Button>
        </div>

        {/* Auth Dialog */}
        <Dialog open={authDialog !== null} onOpenChange={(open) => !open && setAuthDialog(null)}>
          <DialogContent className="max-w-sm bg-[#0a0a0f]/95 backdrop-blur-2xl border border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <img src={vyuhaLogo} alt="Vyuha" className="h-8 w-8 rounded-full ring-2 ring-indigo-500/50" />
                {authDialog === 'login' ? 'Welcome Back' : 'Join Vyuha'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              {authDialog === 'signup' && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/70">Full Name</Label>
                  <Input 
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setErrors(p => ({...p, fullName: undefined})); }}
                    placeholder="Your name"
                    className={`bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-indigo-500 ${errors.fullName ? 'border-red-500' : ''}`}
                  />
                  {errors.fullName && <p className="text-[10px] text-red-400">{errors.fullName}</p>}
                </div>
              )}
              
              <div className="space-y-1.5">
                <Label className="text-xs text-white/70">Email</Label>
                <Input 
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors(p => ({...p, email: undefined})); }}
                  placeholder="you@example.com"
                  className={`bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-indigo-500 ${errors.email ? 'border-red-500' : ''}`}
                />
                {errors.email && <p className="text-[10px] text-red-400">{errors.email}</p>}
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs text-white/70">Password</Label>
                <div className="relative">
                  <Input 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors(p => ({...p, password: undefined})); }}
                    placeholder="••••••••"
                    className={`bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-indigo-500 ${errors.password ? 'border-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-[10px] text-red-400">{errors.password}</p>}
              </div>

              {authDialog === 'signup' && (
                <div className="flex items-start gap-2">
                  <Checkbox 
                    checked={acceptedTerms} 
                    onCheckedChange={(c) => { setAcceptedTerms(!!c); setErrors(p => ({...p, terms: undefined})); }}
                    className="border-white/30 data-[state=checked]:bg-indigo-600"
                  />
                  <Label className="text-[10px] text-white/60 leading-tight">
                    I accept the <a href="/terms" className="text-indigo-400 hover:underline">Terms</a> & <a href="/refund" className="text-indigo-400 hover:underline">Refund Policy</a>
                  </Label>
                </div>
              )}
              {errors.terms && <p className="text-[10px] text-red-400">{errors.terms}</p>}

              <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border border-indigo-400/30">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : authDialog === 'login' ? 'Login' : 'Create Account'}
              </Button>

              <p className="text-center text-xs text-white/50">
                {authDialog === 'login' ? (
                  <>Don't have an account? <button type="button" onClick={() => setAuthDialog('signup')} className="text-indigo-400 hover:underline">Sign Up</button></>
                ) : (
                  <>Already have an account? <button type="button" onClick={() => setAuthDialog('login')} className="text-indigo-400 hover:underline">Login</button></>
                )}
              </p>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default Landing;
