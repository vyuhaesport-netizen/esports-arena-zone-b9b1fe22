import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CyberInput } from '@/components/ui/CyberInput';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import SEOHead from '@/components/SEOHead';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import { 
  Trophy, ChevronRight, Wallet, BarChart3, User, Zap,
  Target, Shield, Gamepad2, Brain,
  Swords, Medal, Crown, Cpu, Instagram, Loader2, X
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
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string; terms?: string }>({});
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const refCode = searchParams.get('ref');

  useEffect(() => {
    if (refCode) {
      localStorage.setItem('collab_ref_code', refCode);
      trackLinkClick(refCode);
    }
  }, [refCode]);

  const trackLinkClick = async (code: string) => {
    try {
      const { data: link } = await supabase
        .from('collab_links')
        .select('id, total_clicks')
        .eq('link_code', code)
        .eq('is_active', true)
        .maybeSingle();
      
      if (link) {
        await supabase
          .from('collab_links')
          .update({ total_clicks: link.total_clicks + 1 })
          .eq('id', link.id);
      }
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };

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
      const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      gsap.set([logoRef.current, titleRef.current, subtitleRef.current, ctaRef.current], {
        opacity: 0,
        y: 40,
      });

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

      // Neon pulse animation for logo
      gsap.to(logoRef.current, {
        scale: 1.03,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // Floating particles
      if (particleContainerRef.current) {
        const particles = particleContainerRef.current.querySelectorAll('.cyber-particle');
        particles.forEach((particle, i) => {
          gsap.to(particle, {
            y: `random(-30, 30)`,
            x: `random(-20, 20)`,
            opacity: `random(0.3, 0.8)`,
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

          const storedRefCode = localStorage.getItem('collab_ref_code');
          if (storedRefCode) {
            await trackReferralSignup(data.user.id, storedRefCode);
            localStorage.removeItem('collab_ref_code');
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

  const trackReferralSignup = async (userId: string, code: string) => {
    try {
      const { data: link } = await supabase
        .from('collab_links')
        .select('id')
        .eq('link_code', code)
        .eq('is_active', true)
        .maybeSingle();

      if (link) {
        await supabase.from('collab_referrals').insert({
          link_id: link.id,
          referred_user_id: userId,
          status: 'registered',
        });

        const { data: currentLink } = await supabase
          .from('collab_links')
          .select('total_signups')
          .eq('id', link.id)
          .single();
        
        if (currentLink) {
          await supabase
            .from('collab_links')
            .update({ 
              total_signups: currentLink.total_signups + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', link.id);
        }
      }
    } catch (error) {
      console.error('Error tracking referral:', error);
    }
  };

  const liveTournaments = [
    { id: 1, name: 'BGMI Championship', prize: '₹50,000', players: '234/256', progress: 91, status: 'LIVE', game: 'BGMI' },
    { id: 2, name: 'Free Fire Pro League', prize: '₹25,000', players: '180/200', progress: 90, status: 'STARTING', game: 'FF' },
    { id: 3, name: 'College Cup Finals', prize: '₹15,000', players: '64/64', progress: 100, status: 'LIVE', game: 'BGMI' },
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
        description="Join Vyuha Esport - India's premier esports platform. Compete in BGMI, Free Fire, COD Mobile tournaments. Win real cash prizes!"
        keywords="BGMI tournament, Free Fire tournament India, esports India, Vyuha Esport"
        url="https://vyuhaesport.in"
      />
      
      <div ref={containerRef} className="min-h-screen overflow-hidden text-foreground" style={{ background: 'linear-gradient(135deg, hsl(210 25% 5%) 0%, hsl(210 30% 3%) 100%)' }}>
        
        {/* Cyber Background with particles */}
        <div ref={particleContainerRef} className="fixed inset-0 pointer-events-none overflow-hidden">
          {/* Neon gradient orbs */}
          <div className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full blur-[120px] opacity-30" style={{ background: 'radial-gradient(circle, hsl(187 100% 50% / 0.3), transparent 70%)' }} />
          <div className="absolute top-1/2 -right-32 w-[400px] h-[400px] rounded-full blur-[100px] opacity-20" style={{ background: 'radial-gradient(circle, hsl(270 100% 65% / 0.4), transparent 70%)' }} />
          <div className="absolute -bottom-20 left-1/3 w-[350px] h-[350px] rounded-full blur-[100px] opacity-20" style={{ background: 'radial-gradient(circle, hsl(187 100% 50% / 0.25), transparent 70%)' }} />
          
          {/* Cyber grid pattern */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `
                linear-gradient(to right, hsl(187 100% 50% / 0.3) 1px, transparent 1px),
                linear-gradient(to bottom, hsl(187 100% 50% / 0.3) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
            }}
          />

          {/* Floating cyber particles */}
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="cyber-particle absolute w-1 h-1 rounded-full"
              style={{
                left: `${10 + (i * 8)}%`,
                top: `${15 + (i * 7) % 70}%`,
                background: i % 2 === 0 ? 'hsl(187 100% 50%)' : 'hsl(270 100% 65%)',
                boxShadow: `0 0 10px ${i % 2 === 0 ? 'hsl(187 100% 50% / 0.5)' : 'hsl(270 100% 65% / 0.5)'}`,
              }}
            />
          ))}
        </div>

        {/* Floating Navbar with blue glow border */}
        <header className="fixed top-0 left-0 right-0 z-50 px-3 py-3">
          <nav 
            className="max-w-5xl mx-auto flex items-center justify-between px-5 py-3 rounded-xl"
            style={{
              background: 'hsl(210 30% 8% / 0.9)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid hsl(187 100% 50% / 0.15)',
              boxShadow: '0 4px 30px hsl(0 0% 0% / 0.3), 0 0 20px hsl(187 100% 50% / 0.05)'
            }}
          >
            <div className="flex items-center gap-3">
              <img 
                src={vyuhaLogo} 
                alt="Vyuha" 
                className="h-9 w-9 rounded-full object-cover"
                style={{
                  border: '2px solid hsl(187 100% 50% / 0.3)',
                  boxShadow: '0 0 15px hsl(187 100% 50% / 0.3)'
                }}
              />
              <span 
                className="font-bold text-base tracking-widest uppercase"
                style={{ 
                  fontFamily: 'Orbitron, Rajdhani, sans-serif',
                  color: 'hsl(var(--foreground))'
                }}
              >
                VYUHA
              </span>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setAuthDialog('login')} 
                className="text-xs h-8 px-4 text-muted-foreground hover:text-[hsl(187_100%_50%)] font-medium uppercase tracking-wider"
              >
                Login
              </Button>
              <Button 
                size="sm" 
                onClick={() => setAuthDialog('signup')} 
                className="text-xs h-8 px-4 font-semibold uppercase tracking-wider"
                style={{
                  background: 'linear-gradient(135deg, hsl(187 100% 50%) 0%, hsl(270 100% 65%) 100%)',
                  color: 'hsl(210 25% 5%)',
                  boxShadow: '0 4px 15px hsl(187 100% 50% / 0.3)'
                }}
              >
                Sign Up
              </Button>
            </div>
          </nav>
        </header>

        {/* Hero Section */}
        <section ref={heroRef} className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-14">
          {/* Logo with neon pulse */}
          <div className="relative mb-8">
            <div 
              className="absolute inset-0 rounded-full blur-3xl scale-150 animate-neon-pulse"
              style={{ background: 'radial-gradient(circle, hsl(187 100% 50% / 0.3), transparent 70%)' }}
            />
            <img 
              ref={logoRef}
              src={vyuhaLogo} 
              alt="Vyuha Esport" 
              className="relative h-28 w-28 md:h-32 md:w-32 rounded-full object-cover"
              style={{
                border: '3px solid hsl(187 100% 50% / 0.4)',
                boxShadow: '0 0 30px hsl(187 100% 50% / 0.4), 0 0 60px hsl(187 100% 50% / 0.2)'
              }}
            />
          </div>
          
          {/* Headline */}
          <h1 
            ref={titleRef}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-5 leading-tight tracking-tight uppercase"
            style={{ fontFamily: 'Orbitron, Rajdhani, sans-serif' }}
          >
            <span className="text-foreground">VYUHA ESPORTS</span>
            <br />
            <span className="text-base md:text-xl lg:text-2xl font-medium block mt-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              The Stage for{' '}
              <span 
                className="font-bold"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--foreground)) 0%, hsl(187 100% 50%) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                Underdogs
              </span>
            </span>
          </h1>
          
          <p 
            ref={subtitleRef}
            className="text-muted-foreground text-sm md:text-base mb-10 max-w-md mx-auto text-center leading-relaxed"
          >
            Empowering players from schools & colleges across India. Your journey from underdog to champion starts here.
          </p>

          <div ref={ctaRef} className="flex flex-col sm:flex-row gap-4">
            <Button 
              size="lg" 
              onClick={() => setAuthDialog('signup')}
              className="gap-2 group px-8 py-4 text-sm font-bold uppercase tracking-wider h-12 shine-effect"
              style={{
                background: 'linear-gradient(135deg, hsl(187 100% 50%) 0%, hsl(270 100% 65%) 100%)',
                color: 'hsl(210 25% 5%)',
                boxShadow: '0 6px 25px hsl(187 100% 50% / 0.35), 0 0 40px hsl(187 100% 50% / 0.2)'
              }}
            >
              <Gamepad2 className="h-5 w-5" />
              Start Playing
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="gap-2 px-8 py-4 text-sm font-medium uppercase tracking-wider h-12"
              style={{
                background: 'transparent',
                border: '1px solid hsl(187 100% 50% / 0.3)',
                color: 'hsl(var(--foreground))'
              }}
              onClick={() => window.open('https://www.instagram.com/vyuha_freefire?igsh=M3N6bnVncDJ4azVs', '_blank')}
            >
              <Instagram className="h-5 w-5" />
              Join Community
            </Button>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <div 
              className="w-6 h-10 rounded-full flex items-start justify-center p-2"
              style={{ border: '1px solid hsl(187 100% 50% / 0.3)' }}
            >
              <div className="w-1 h-2 rounded-full" style={{ background: 'hsl(187 100% 50%)' }} />
            </div>
          </div>
        </section>

        {/* Tournament Lobby Section */}
        <section ref={tournamentRef} className="relative z-10 px-4 py-14">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div 
                className="p-3 rounded-xl"
                style={{
                  background: 'hsl(187 100% 50% / 0.1)',
                  border: '1px solid hsl(187 100% 50% / 0.2)'
                }}
              >
                <Trophy className="h-5 w-5" style={{ color: 'hsl(187 100% 50%)' }} />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground uppercase tracking-wide" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  Tournament Lobby
                </h2>
                <p className="text-muted-foreground text-xs uppercase tracking-widest">Live matches happening now</p>
              </div>
            </div>
            
            <div className="grid gap-4">
              {liveTournaments.map((tournament) => (
                <div
                  key={tournament.id}
                  className="tournament-card group relative p-5 rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden"
                  onMouseMove={handleCardTilt}
                  onMouseLeave={handleCardTiltReset}
                  style={{ 
                    transformStyle: 'preserve-3d',
                    background: 'hsl(210 30% 8% / 0.9)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid hsl(187 100% 50% / 0.1)',
                    boxShadow: '0 4px 24px hsl(0 0% 0% / 0.3)'
                  }}
                >
                  {/* Top glow line */}
                  <div 
                    className="absolute top-0 left-0 right-0 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'linear-gradient(90deg, transparent, hsl(187 100% 50% / 0.5), transparent)' }}
                  />
                  
                  <div className="relative flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div 
                        className="h-12 w-12 rounded-xl flex items-center justify-center"
                        style={{
                          background: 'hsl(187 100% 50% / 0.1)',
                          border: '1px solid hsl(187 100% 50% / 0.2)'
                        }}
                      >
                        <Gamepad2 className="h-5 w-5" style={{ color: 'hsl(187 100% 50%)' }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-foreground group-hover:text-[hsl(187_100%_50%)] transition-colors">
                          {tournament.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">{tournament.players} players</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold" style={{ color: 'hsl(187 100% 50%)' }}>{tournament.prize}</div>
                      <div className={`text-[10px] font-semibold px-2.5 py-1 rounded-full inline-block uppercase tracking-wider ${
                        tournament.status === 'LIVE' 
                          ? 'bg-success/20 text-success' 
                          : 'bg-warning/20 text-warning'
                      }`}>
                        ● {tournament.status}
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="cyber-progress">
                    <div 
                      className="cyber-progress-bar" 
                      style={{ width: `${tournament.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Dashboard Preview Section */}
        <section ref={dashboardRef} className="relative z-10 px-4 py-14">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div 
                className="p-3 rounded-xl"
                style={{
                  background: 'hsl(187 100% 50% / 0.1)',
                  border: '1px solid hsl(187 100% 50% / 0.2)'
                }}
              >
                <User className="h-5 w-5" style={{ color: 'hsl(187 100% 50%)' }} />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-foreground uppercase tracking-wide" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  Player Dashboard
                </h2>
                <p className="text-muted-foreground text-[10px] uppercase tracking-widest">Your gaming command center</p>
              </div>
            </div>
            
            <div 
              className="p-6 rounded-2xl"
              style={{
                background: 'hsl(210 30% 8% / 0.9)',
                backdropFilter: 'blur(12px)',
                border: '1px solid hsl(187 100% 50% / 0.1)',
                boxShadow: '0 4px 24px hsl(0 0% 0% / 0.3)'
              }}
            >
              {/* Dashboard Header */}
              <div className="flex items-center gap-4 mb-5 pb-5" style={{ borderBottom: '1px solid hsl(187 100% 50% / 0.1)' }}>
                <div 
                  className="h-12 w-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'hsl(187 100% 50% / 0.1)',
                    border: '1px solid hsl(187 100% 50% / 0.2)'
                  }}
                >
                  <User className="h-6 w-6" style={{ color: 'hsl(187 100% 50%)' }} />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">Pro_Underdog_42</h3>
                  <p className="text-xs font-medium" style={{ color: 'hsl(187 100% 50%)' }}>⭐ Elite Player</p>
                </div>
              </div>
              
              {/* HUD Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                {dashboardFeatures.map((feature, i) => (
                  <div key={i} className="hud-display text-center">
                    <feature.icon className="h-5 w-5 mx-auto mb-2" style={{ color: 'hsl(187 100% 50%)' }} />
                    <div className="hud-value text-lg">{feature.value}</div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">{feature.label}</div>
                  </div>
                ))}
              </div>
              
              {/* Quick Stats */}
              <div 
                className="mt-5 p-4 rounded-xl"
                style={{
                  background: 'hsl(187 100% 50% / 0.05)',
                  border: '1px solid hsl(187 100% 50% / 0.1)'
                }}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Tournaments</span>
                  <span className="text-foreground font-bold font-mono">47</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-2">
                  <span className="text-muted-foreground">Total Winnings</span>
                  <span className="font-bold font-mono" style={{ color: 'hsl(187 100% 50%)' }}>₹12,450</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section ref={featuresRef} className="relative z-10 px-4 py-14">
          <div className="max-w-3xl mx-auto">
            <h2 
              className="text-lg md:text-xl font-bold text-center mb-3 text-foreground uppercase tracking-wide"
              style={{ fontFamily: 'Rajdhani, sans-serif' }}
            >
              Why <span style={{ color: 'hsl(187 100% 50%)' }}>Vyuha</span>?
            </h2>
            <p className="text-muted-foreground text-[10px] text-center mb-8 uppercase tracking-widest">Built by gamers, for gamers</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {features.map((feature, i) => (
                <div 
                  key={i} 
                  className="feature-card p-4 rounded-2xl transition-all duration-300 group cursor-pointer"
                  onMouseMove={handleCardTilt}
                  onMouseLeave={handleCardTiltReset}
                  style={{ 
                    transformStyle: 'preserve-3d',
                    background: 'hsl(210 30% 8% / 0.9)',
                    border: '1px solid hsl(187 100% 50% / 0.1)'
                  }}
                >
                  <div 
                    className="h-10 w-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"
                    style={{
                      background: 'hsl(187 100% 50% / 0.1)',
                      border: '1px solid hsl(187 100% 50% / 0.2)'
                    }}
                  >
                    <feature.icon className="h-5 w-5" style={{ color: 'hsl(187 100% 50%)' }} />
                  </div>
                  <h3 className="font-semibold text-foreground text-xs mb-1">{feature.title}</h3>
                  <p className="text-[10px] text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI Integration Section */}
        <section ref={aiRef} className="relative z-10 px-4 py-14">
          <div className="max-w-3xl mx-auto">
            <div 
              className="p-6 rounded-2xl relative overflow-hidden"
              style={{
                background: 'hsl(210 30% 8% / 0.9)',
                backdropFilter: 'blur(12px)',
                border: '1px solid hsl(270 100% 65% / 0.2)',
                boxShadow: '0 4px 24px hsl(0 0% 0% / 0.3)'
              }}
            >
              {/* Purple accent glow */}
              <div 
                className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at top right, hsl(270 100% 65% / 0.3), transparent 70%)' }}
              />
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div 
                    className="p-3 rounded-xl"
                    style={{
                      background: 'hsl(270 100% 65% / 0.1)',
                      border: '1px solid hsl(270 100% 65% / 0.2)'
                    }}
                  >
                    <Brain className="h-5 w-5" style={{ color: 'hsl(270 100% 65%)' }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground uppercase tracking-wide" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                      Powered by <span style={{ color: 'hsl(270 100% 65%)' }}>AI</span>
                    </h2>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-widest">Smart gaming insights</p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-4">
                    {[
                      { icon: Cpu, title: 'Match Analysis', desc: 'AI-powered gameplay breakdown' },
                      { icon: Medal, title: 'Performance Tips', desc: 'Personalized recommendations' },
                      { icon: Target, title: 'Opponent Insights', desc: 'Know your competition' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <item.icon className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'hsl(270 100% 65%)' }} />
                        <div>
                          <h4 className="font-semibold text-foreground text-xs">{item.title}</h4>
                          <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <div 
                        className="absolute inset-0 rounded-xl blur-xl"
                        style={{ background: 'hsl(270 100% 65% / 0.2)' }}
                      />
                      <div 
                        className="relative px-6 py-4 rounded-xl"
                        style={{
                          background: 'hsl(270 100% 65% / 0.1)',
                          border: '1px solid hsl(270 100% 65% / 0.2)'
                        }}
                      >
                        <Brain className="h-12 w-12 mx-auto mb-2" style={{ color: 'hsl(270 100% 65%)' }} />
                        <p className="text-[10px] text-muted-foreground text-center uppercase tracking-wider">AI Engine</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About Creator */}
        <section className="relative z-10 px-4 py-14 pb-32">
          <div 
            ref={aboutRef}
            className="max-w-3xl mx-auto p-5 rounded-2xl"
            style={{
              background: 'hsl(210 30% 8% / 0.9)',
              backdropFilter: 'blur(12px)',
              border: '1px solid hsl(187 100% 50% / 0.1)'
            }}
          >
            <div className="flex items-center gap-4 mb-4">
              <img 
                src="/abhishek-shukla.jpg" 
                alt="Abhishek Shukla" 
                className="h-14 w-14 rounded-full object-cover"
                style={{
                  border: '2px solid hsl(187 100% 50% / 0.3)',
                  boxShadow: '0 0 15px hsl(187 100% 50% / 0.2)'
                }}
              />
              <div>
                <h3 className="font-bold text-foreground text-base">Abhishek Shukla</h3>
                <p className="text-xs font-medium" style={{ color: 'hsl(187 100% 50%)' }}>Founder & CEO</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              An 18-year-old engineering student and tech enthusiast who built Vyuha to bridge the gap between casual gaming and professional esports.
            </p>
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid hsl(187 100% 50% / 0.1)' }}>
              <a 
                href="https://instagram.com/abhishek.shhh" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-xs font-medium flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                style={{ color: 'hsl(187 100% 50%)' }}
              >
                <Instagram className="h-3.5 w-3.5" />
                @abhishek.shhh
              </a>
            </div>
          </div>
        </section>

        {/* CTA Footer */}
        <div 
          className="fixed bottom-0 left-0 right-0 z-50 p-4"
          style={{
            background: 'linear-gradient(to top, hsl(210 25% 5%) 0%, hsl(210 25% 5% / 0.95) 50%, transparent 100%)'
          }}
        >
          <Button 
            className="w-full max-w-sm mx-auto flex items-center justify-center gap-2 py-6 text-sm font-bold uppercase tracking-wider shine-effect"
            onClick={() => setAuthDialog('signup')}
            style={{
              background: 'linear-gradient(135deg, hsl(187 100% 50%) 0%, hsl(270 100% 65%) 100%)',
              color: 'hsl(210 25% 5%)',
              boxShadow: '0 6px 30px hsl(187 100% 50% / 0.4)'
            }}
          >
            <Gamepad2 className="h-5 w-5" />
            Join Vyuha
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Auth Dialog - Glassmorphism */}
        <Dialog open={authDialog !== null} onOpenChange={(open) => !open && setAuthDialog(null)}>
          <DialogContent 
            className="max-w-[400px] max-h-[90vh] p-0 overflow-y-auto border-0"
            style={{
              background: 'hsl(210 30% 8% / 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid hsl(187 100% 50% / 0.15)',
              boxShadow: '0 8px 40px hsl(0 0% 0% / 0.5), 0 0 30px hsl(187 100% 50% / 0.1)'
            }}
            aria-describedby={undefined}
          >
            {/* Close button with red glow on hover */}
            <button
              onClick={() => setAuthDialog(null)}
              className="absolute right-4 top-4 p-2 rounded-full transition-all duration-200 hover:bg-destructive/20 group z-10"
              style={{ border: '1px solid hsl(var(--muted) / 0.3)' }}
            >
              <X className="h-4 w-4 text-muted-foreground group-hover:text-destructive transition-colors" />
            </button>

            <DialogTitle className="sr-only">
              {authDialog === 'login' ? 'Login' : 'Sign Up'}
            </DialogTitle>
            
            <div className="p-8">
              {/* Title */}
              <h2 
                className="text-2xl font-bold tracking-tight mb-1 text-foreground uppercase"
                style={{ fontFamily: 'Rajdhani, sans-serif' }}
              >
                {authDialog === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-xs text-muted-foreground mb-8">
                {authDialog === 'login' ? 'Sign in to continue your gaming journey' : 'Join Vyuha and start winning'}
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {authDialog === 'signup' && (
                  <CyberInput 
                    label="Full Name"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setErrors(p => ({...p, fullName: undefined})); }}
                    error={errors.fullName}
                  />
                )}
                
                <CyberInput 
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors(p => ({...p, email: undefined})); }}
                  error={errors.email}
                />
                
                <CyberInput 
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors(p => ({...p, password: undefined})); }}
                  error={errors.password}
                />

                {authDialog === 'signup' ? (
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      checked={acceptedTerms} 
                      onCheckedChange={(c) => { setAcceptedTerms(!!c); setErrors(p => ({...p, terms: undefined})); }}
                      className="h-4 w-4 border-muted data-[state=checked]:bg-[hsl(187_100%_50%)] data-[state=checked]:border-[hsl(187_100%_50%)]"
                    />
                    <label className="text-xs text-muted-foreground">
                      I accept the terms & conditions
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center justify-end">
                    <button 
                      type="button" 
                      onClick={() => {
                        setAuthDialog(null);
                        navigate('/forgot-password');
                      }}
                      className="text-xs font-medium hover:opacity-80 transition-opacity"
                      style={{ color: 'hsl(187 100% 50%)' }}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
                
                {errors.terms && <p className="text-[10px] text-destructive">{errors.terms}</p>}

                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full h-12 text-sm font-bold uppercase tracking-wider gap-2 shine-effect"
                  style={{
                    background: 'linear-gradient(135deg, hsl(187 100% 50%) 0%, hsl(270 100% 65%) 100%)',
                    color: 'hsl(210 25% 5%)',
                    boxShadow: '0 4px 20px hsl(187 100% 50% / 0.3)'
                  }}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {authDialog === 'login' ? 'Sign In' : 'Create Account'}
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>

              {/* Switch */}
              <p className="text-center text-xs text-muted-foreground pt-6">
                {authDialog === 'login' ? (
                  <>Don't have an account? <button type="button" onClick={() => setAuthDialog('signup')} className="font-medium hover:opacity-80" style={{ color: 'hsl(187 100% 50%)' }}>Sign up</button></>
                ) : (
                  <>Already have an account? <button type="button" onClick={() => setAuthDialog('login')} className="font-medium hover:opacity-80" style={{ color: 'hsl(187 100% 50%)' }}>Login</button></>
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
