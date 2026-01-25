import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import { 
  Trophy, ChevronRight,
  Target, Shield, Eye, EyeOff, Loader2,
  Swords, Crosshair, Medal, Flame
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
  const ring1Ref = useRef<HTMLDivElement>(null);
  const ring2Ref = useRef<HTMLDivElement>(null);
  const ring3Ref = useRef<HTMLDivElement>(null);
  const visionRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const opportunitiesRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) navigate('/home');
  }, [user, navigate]);

  // GSAP Hollywood Animations
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Master timeline for hero entrance
      const heroTl = gsap.timeline({ defaults: { ease: 'power4.out' } });

      // Initial states
      gsap.set([logoRef.current, titleRef.current, subtitleRef.current, ctaRef.current], {
        opacity: 0,
        y: 60,
      });
      gsap.set([ring1Ref.current, ring2Ref.current, ring3Ref.current], {
        opacity: 0,
        scale: 0,
        rotation: -180,
      });

      // Dramatic logo reveal
      heroTl
        .to(logoRef.current, {
          opacity: 1,
          y: 0,
          duration: 1.2,
          ease: 'elastic.out(1, 0.5)',
        })
        .to([ring1Ref.current, ring2Ref.current, ring3Ref.current], {
          opacity: 1,
          scale: 1,
          rotation: 0,
          duration: 1.5,
          stagger: 0.15,
          ease: 'back.out(1.7)',
        }, '-=0.8')
        .to(titleRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.8,
        }, '-=0.6')
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

      // Continuous logo float animation
      gsap.to(logoRef.current, {
        y: -15,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut',
      });

      // Orbiting rings continuous rotation
      gsap.to(ring1Ref.current, {
        rotation: 360,
        duration: 20,
        repeat: -1,
        ease: 'none',
      });
      gsap.to(ring2Ref.current, {
        rotation: -360,
        duration: 25,
        repeat: -1,
        ease: 'none',
      });
      gsap.to(ring3Ref.current, {
        rotation: 360,
        duration: 30,
        repeat: -1,
        ease: 'none',
      });

      // Scroll-triggered sections with cinematic reveals
      if (visionRef.current) {
        gsap.fromTo(visionRef.current,
          { opacity: 0, y: 100, scale: 0.9 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: visionRef.current,
              start: 'top 85%',
              end: 'top 50%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      // Features grid stagger animation
      if (featuresRef.current) {
        const featureCards = featuresRef.current.querySelectorAll('.feature-card');
        gsap.fromTo(featureCards,
          { opacity: 0, y: 80, rotateX: 15 },
          {
            opacity: 1,
            y: 0,
            rotateX: 0,
            duration: 0.8,
            stagger: 0.15,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: featuresRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      // Opportunities dramatic slide-in
      if (opportunitiesRef.current) {
        const oppCards = opportunitiesRef.current.querySelectorAll('.opp-card');
        gsap.fromTo(oppCards,
          { opacity: 0, x: -100, rotateY: -15 },
          {
            opacity: 1,
            x: 0,
            rotateY: 0,
            duration: 1,
            stagger: 0.2,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: opportunitiesRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      // About section cinematic reveal
      if (aboutRef.current) {
        gsap.fromTo(aboutRef.current,
          { opacity: 0, scale: 0.8, y: 60 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 1.2,
            ease: 'elastic.out(1, 0.75)',
            scrollTrigger: {
              trigger: aboutRef.current,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      // Floating particles
      if (particlesRef.current) {
        const particles = particlesRef.current.querySelectorAll('.particle');
        particles.forEach((particle, i) => {
          gsap.to(particle, {
            y: `random(-30, 30)`,
            x: `random(-20, 20)`,
            duration: `random(3, 5)`,
            repeat: -1,
            yoyo: true,
            ease: 'power1.inOut',
            delay: i * 0.1,
          });
          gsap.to(particle, {
            opacity: `random(0.3, 0.8)`,
            duration: `random(2, 4)`,
            repeat: -1,
            yoyo: true,
            ease: 'power1.inOut',
          });
        });
      }

    }, containerRef);

    return () => ctx.revert();
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

  const features = [
    { icon: Trophy, title: 'Win Real Prizes', desc: 'Compete for cash prizes & exclusive rewards' },
    { icon: Shield, title: 'Fair Play', desc: 'Anti-cheat systems & transparent rules' },
    { icon: Swords, title: 'Build Your Team', desc: 'Find teammates & form squads' },
    { icon: Flame, title: 'Instant Payouts', desc: 'Quick withdrawals to your wallet' },
  ];

  const opportunities = [
    { 
      title: 'For Players', 
      icon: Crosshair,
      points: ['Join tournaments & win prizes', 'Track your stats & rankings', 'Connect with pro players', 'Build your esports career']
    },
    { 
      title: 'For Creators', 
      icon: Medal,
      points: ['Host your own tournaments', 'Earn commission on every match', 'Build your community', 'Get verified creator badge']
    },
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-background overflow-hidden">
      {/* Animated Background Particles */}
      <div ref={particlesRef} className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(25)].map((_, i) => (
          <div
            key={i}
            className="particle absolute w-2 h-2 rounded-full bg-primary/40"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0.4,
            }}
          />
        ))}
        
        {/* Gradient orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-48 w-[500px] h-[500px] bg-gradient-to-br from-gaming-purple/15 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 w-80 h-80 bg-gradient-to-br from-gaming-cyan/20 to-transparent rounded-full blur-3xl" />
        
        {/* Grid overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--primary)) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--primary)) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-50 flex items-center justify-between px-4 py-3 bg-background/60 backdrop-blur-2xl border-b border-border/30">
        <div className="flex items-center gap-2">
          <img src={vyuhaLogo} alt="Vyuha" className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/30" />
          <span className="font-bold text-lg text-foreground tracking-wide">VYUHA</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setAuthDialog('login')} className="text-xs">
            Login
          </Button>
          <Button 
            size="sm" 
            onClick={() => setAuthDialog('signup')} 
            className="text-xs bg-primary hover:bg-primary/90"
          >
            Sign Up
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section ref={heroRef} className="relative z-10 px-4 py-20 text-center">
        <div className="relative inline-block mb-10">
          {/* Animated orbital rings */}
          <div ref={ring1Ref} className="absolute inset-[-25px] rounded-full border-2 border-primary/30" />
          <div ref={ring2Ref} className="absolute inset-[-45px] rounded-full border border-gaming-purple/20" />
          <div ref={ring3Ref} className="absolute inset-[-65px] rounded-full border border-gaming-cyan/15" style={{ borderStyle: 'dashed' }} />
          
          {/* Glow effect */}
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl scale-150" />
          
          <img 
            ref={logoRef}
            src={vyuhaLogo} 
            alt="Vyuha Esport" 
            className="relative h-32 w-32 rounded-full object-cover ring-4 ring-primary/50 shadow-2xl"
          />
        </div>
        
        <h1 
          ref={titleRef}
          className="text-4xl font-bold mb-4 text-foreground"
        >
          <span className="text-primary">VYUHA</span> ESPORT
        </h1>
        
        <p 
          ref={subtitleRef}
          className="text-muted-foreground text-sm mb-10 max-w-xs mx-auto leading-relaxed"
        >
          India's Premier Platform for School, College & Local Esports Tournaments
        </p>

        <div ref={ctaRef} className="flex justify-center">
          <Button 
            size="lg" 
            onClick={() => setAuthDialog('signup')}
            className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 gap-2 group"
          >
            Start Playing 
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </section>

      {/* Vision Section */}
      <section className="relative z-10 px-4 py-8">
        <div 
          ref={visionRef}
          className="glass-card rounded-2xl p-6 max-w-md mx-auto"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-bold text-foreground">Our Vision</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            To democratize esports in India by empowering schools, colleges, and local communities to organize professional-grade tournaments. We believe every gamer deserves a fair chance to compete and win.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section ref={featuresRef} className="relative z-10 px-4 py-8">
        <h2 className="text-lg font-bold text-center mb-6 text-foreground">Why Vyuha?</h2>
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          {features.map((feature, i) => (
            <div 
              key={i} 
              className="feature-card glass-card rounded-xl p-4 hover:shadow-lg hover:shadow-primary/10 transition-shadow"
            >
              <feature.icon className="h-7 w-7 text-primary mb-3" />
              <h3 className="font-semibold text-xs text-foreground">{feature.title}</h3>
              <p className="text-[10px] text-muted-foreground mt-1">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Opportunities Section */}
      <section ref={opportunitiesRef} className="relative z-10 px-4 py-8">
        <h2 className="text-lg font-bold text-center mb-6 text-foreground">Opportunities</h2>
        <div className="space-y-4 max-w-md mx-auto">
          {opportunities.map((opp, i) => (
            <div 
              key={i} 
              className="opp-card glass-card rounded-xl p-5"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <opp.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold text-foreground">{opp.title}</h3>
              </div>
              <ul className="space-y-2">
                {opp.points.map((point, j) => (
                  <li key={j} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* About Creator */}
      <section className="relative z-10 px-4 py-8 pb-28">
        <div 
          ref={aboutRef}
          className="glass-card rounded-2xl p-6 max-w-md mx-auto"
        >
          <div className="flex items-center gap-4 mb-4">
            <img 
              src="/abhishek-shukla.jpg" 
              alt="Abhishek Shukla" 
              className="h-14 w-14 rounded-full object-cover ring-2 ring-primary/30"
            />
            <div>
              <h3 className="font-bold text-foreground">Abhishek Shukla</h3>
              <p className="text-[10px] text-primary font-medium">Founder & CEO</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            An 18-year-old engineering student and tech enthusiast who built Vyuha to bridge the gap between casual gaming and professional esports.
          </p>
          <div className="mt-4 pt-4 border-t border-border/50">
            <a href="https://instagram.com/abhishek.shhh" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
              @abhishek.shhh
            </a>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/80 backdrop-blur-xl border-t border-border/30">
        <Button 
          className="w-full max-w-md mx-auto block bg-primary hover:bg-primary/90 shadow-lg"
          onClick={() => setAuthDialog('signup')}
        >
          Join Vyuha Now
        </Button>
      </div>

      {/* Auth Dialog */}
      <Dialog open={authDialog !== null} onOpenChange={(open) => !open && setAuthDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src={vyuhaLogo} alt="Vyuha" className="h-8 w-8 rounded-full" />
              {authDialog === 'login' ? 'Welcome Back' : 'Join Vyuha'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {authDialog === 'signup' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Full Name</Label>
                <Input 
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setErrors(p => ({...p, fullName: undefined})); }}
                  placeholder="Your name"
                  className={errors.fullName ? 'border-destructive' : ''}
                />
                {errors.fullName && <p className="text-[10px] text-destructive">{errors.fullName}</p>}
              </div>
            )}
            
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input 
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors(p => ({...p, email: undefined})); }}
                placeholder="you@example.com"
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && <p className="text-[10px] text-destructive">{errors.email}</p>}
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs">Password</Label>
              <div className="relative">
                <Input 
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors(p => ({...p, password: undefined})); }}
                  placeholder="••••••••"
                  className={errors.password ? 'border-destructive' : ''}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-[10px] text-destructive">{errors.password}</p>}
            </div>

            {authDialog === 'signup' && (
              <div className="flex items-start gap-2">
                <Checkbox 
                  checked={acceptedTerms} 
                  onCheckedChange={(c) => { setAcceptedTerms(!!c); setErrors(p => ({...p, terms: undefined})); }}
                />
                <Label className="text-[10px] text-muted-foreground leading-tight">
                  I accept the <a href="/terms" className="text-primary hover:underline">Terms</a> & <a href="/refund" className="text-primary hover:underline">Refund Policy</a>
                </Label>
              </div>
            )}
            {errors.terms && <p className="text-[10px] text-destructive">{errors.terms}</p>}

            <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : authDialog === 'login' ? 'Login' : 'Create Account'}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              {authDialog === 'login' ? (
                <>Don't have an account? <button type="button" onClick={() => setAuthDialog('signup')} className="text-primary hover:underline">Sign Up</button></>
              ) : (
                <>Already have an account? <button type="button" onClick={() => setAuthDialog('login')} className="text-primary hover:underline">Login</button></>
              )}
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Landing;