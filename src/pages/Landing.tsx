import { useState, useEffect, useRef } from 'react';
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
  Gamepad2, Trophy, Users, ChevronRight, Star, Sparkles,
  Target, Shield, Crown, Eye, EyeOff, Loader2,
  Swords, Crosshair, Medal, Flame, Zap, Joystick
} from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const emailSchema = z.string().email('Invalid email');
const passwordSchema = z.string().min(6, 'Min 6 characters');

// Stunning particle system
const ParticleField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number; y: number; size: number; speedX: number; speedY: number; 
      opacity: number; hue: number; pulse: number;
    }> = [];

    // Create particles
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.2,
        hue: Math.random() * 60 + 180, // Cyan to purple range
        pulse: Math.random() * Math.PI * 2,
      });
    }

    let animationId: number;
    let time = 0;

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      time += 0.01;

      particles.forEach((p, i) => {
        // Update position
        p.x += p.speedX + Math.sin(time + i) * 0.2;
        p.y += p.speedY + Math.cos(time + i) * 0.2;
        p.pulse += 0.02;

        // Wrap around
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Pulsing size
        const pulseSize = p.size * (1 + Math.sin(p.pulse) * 0.3);
        const pulseOpacity = p.opacity * (0.7 + Math.sin(p.pulse) * 0.3);

        // Draw particle with glow
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pulseSize * 4);
        gradient.addColorStop(0, `hsla(${p.hue}, 80%, 60%, ${pulseOpacity})`);
        gradient.addColorStop(0.5, `hsla(${p.hue}, 80%, 50%, ${pulseOpacity * 0.3})`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.arc(p.x, p.y, pulseSize * 4, 0, Math.PI * 2);
        ctx.fill();

        // Draw connections
        particles.forEach((p2, j) => {
          if (i === j) return;
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `hsla(${(p.hue + p2.hue) / 2}, 70%, 50%, ${(1 - dist / 120) * 0.15})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ opacity: 0.6 }} />;
};

// Morphing blob animation
const MorphingBlob = ({ className, delay = 0 }: { className: string; delay?: number }) => (
  <div 
    className={`absolute rounded-full blur-3xl animate-pulse ${className}`}
    style={{ 
      animationDelay: `${delay}s`, 
      animationDuration: '4s',
      background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--gaming-purple) / 0.15))',
    }}
  />
);

const Landing = () => {
  const [authDialog, setAuthDialog] = useState<'login' | 'signup' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string; terms?: string }>({});
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) navigate('/home');
  }, [user, navigate]);

  // Intersection observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('[data-animate]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
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

  const isVisible = (id: string) => visibleSections.has(id);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Particle Canvas Background */}
      <ParticleField />
      
      {/* Morphing Gradient Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <MorphingBlob className="w-[500px] h-[500px] -top-48 -left-24" delay={0} />
        <MorphingBlob className="w-[400px] h-[400px] top-1/3 -right-32" delay={1.5} />
        <MorphingBlob className="w-[350px] h-[350px] bottom-1/4 left-1/4" delay={3} />
        
        {/* Animated grid lines */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--primary)) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--primary)) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-50 flex items-center justify-between px-4 py-3 bg-background/60 backdrop-blur-2xl border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/30 rounded-full blur-lg animate-pulse" />
            <img src={vyuhaLogo} alt="Vyuha" className="relative h-10 w-10 rounded-full object-cover ring-2 ring-primary/50 shadow-lg shadow-primary/20" />
          </div>
          <span className="font-bold text-lg text-foreground tracking-wide">VYUHA</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setAuthDialog('login')} className="text-xs hover:bg-primary/10">
            Login
          </Button>
          <Button 
            size="sm" 
            onClick={() => setAuthDialog('signup')} 
            className="text-xs bg-gradient-to-r from-primary via-gaming-purple to-primary bg-[length:200%_100%] animate-[gradient_3s_ease_infinite] shadow-lg shadow-primary/30"
          >
            Sign Up
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 px-4 py-16 text-center">
        <div className="relative inline-block mb-8">
          {/* Multiple glow layers */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/40 to-gaming-purple/40 rounded-full blur-3xl scale-[2] animate-pulse" />
          <div className="absolute inset-0 bg-gradient-to-r from-gaming-cyan/30 to-primary/30 rounded-full blur-2xl scale-150 animate-pulse" style={{ animationDelay: '0.5s' }} />
          
          {/* Orbiting rings */}
          <div className="absolute inset-[-20px] rounded-full border border-primary/20 animate-spin" style={{ animationDuration: '20s' }} />
          <div className="absolute inset-[-35px] rounded-full border border-gaming-purple/15 animate-spin" style={{ animationDuration: '25s', animationDirection: 'reverse' }} />
          <div className="absolute inset-[-50px] rounded-full border border-gaming-cyan/10 animate-spin" style={{ animationDuration: '30s' }} />
          
          <img 
            src={vyuhaLogo} 
            alt="Vyuha Esport" 
            className="relative h-32 w-32 rounded-full object-cover ring-4 ring-primary/40 shadow-2xl shadow-primary/30"
            style={{ animation: 'float 4s ease-in-out infinite' }}
          />
          
          {/* Sparkle decorations */}
          <Sparkles className="absolute -top-3 -right-3 h-7 w-7 text-warning animate-pulse" />
          <Star className="absolute -bottom-2 -left-2 h-5 w-5 text-gaming-cyan animate-pulse" style={{ animationDelay: '0.3s' }} />
        </div>
        
        <h1 
          className="text-4xl font-bold mb-4 text-foreground"
          style={{ animation: 'slideUp 0.8s ease-out forwards', opacity: 0 }}
        >
          <span className="bg-gradient-to-r from-primary via-gaming-cyan to-gaming-purple bg-clip-text text-transparent bg-[length:200%_100%] animate-[gradient_4s_ease_infinite]">
            VYUHA ESPORT
          </span>
        </h1>
        
        <p 
          className="text-muted-foreground text-sm mb-8 max-w-xs mx-auto leading-relaxed"
          style={{ animation: 'slideUp 0.8s ease-out 0.2s forwards', opacity: 0 }}
        >
          India's Premier Platform for School, College & Local Esports Tournaments
        </p>

        <div 
          className="flex justify-center gap-3"
          style={{ animation: 'slideUp 0.8s ease-out 0.4s forwards', opacity: 0 }}
        >
          <Button 
            size="lg" 
            onClick={() => setAuthDialog('signup')}
            className="relative overflow-hidden bg-gradient-to-r from-primary to-gaming-purple hover:opacity-90 shadow-xl shadow-primary/30 gap-2 group"
          >
            <span className="relative z-10 flex items-center gap-2">
              Start Playing <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-gaming-purple to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </Button>
        </div>
      </section>

      {/* Vision Section */}
      <section 
        id="vision" 
        data-animate
        className={`relative z-10 px-4 py-8 transition-all duration-700 ${
          isVisible('vision') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="relative glass-card rounded-2xl p-6 max-w-md mx-auto overflow-hidden group hover:shadow-xl hover:shadow-primary/10 transition-all duration-500">
          {/* Animated border gradient */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/20 via-gaming-purple/20 to-gaming-cyan/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ padding: '1px' }} />
          
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-gaming-purple/20">
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
      <section 
        id="features"
        data-animate
        className={`relative z-10 px-4 py-8 transition-all duration-700 delay-100 ${
          isVisible('features') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <h2 className="text-lg font-bold text-center mb-6 text-foreground">Why Vyuha?</h2>
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          {features.map((feature, i) => (
            <div 
              key={i} 
              className="relative glass-card rounded-xl p-4 group hover:shadow-xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-1"
              style={{ 
                animation: isVisible('features') ? `slideUp 0.6s ease-out ${i * 0.1}s forwards` : 'none',
                opacity: isVisible('features') ? undefined : 0,
              }}
            >
              {/* Icon glow */}
              <div className="relative mb-3">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <feature.icon className="relative h-8 w-8 text-primary group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="font-semibold text-xs text-foreground">{feature.title}</h3>
              <p className="text-[10px] text-muted-foreground mt-1">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Opportunities Section */}
      <section 
        id="opportunities"
        data-animate
        className={`relative z-10 px-4 py-8 transition-all duration-700 delay-200 ${
          isVisible('opportunities') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <h2 className="text-lg font-bold text-center mb-6 text-foreground">Opportunities</h2>
        <div className="space-y-4 max-w-md mx-auto">
          {opportunities.map((opp, i) => (
            <div 
              key={i} 
              className="relative glass-card rounded-xl p-5 group hover:shadow-xl hover:shadow-primary/10 transition-all duration-500"
              style={{ 
                animation: isVisible('opportunities') ? `slideUp 0.6s ease-out ${i * 0.15}s forwards` : 'none',
                opacity: isVisible('opportunities') ? undefined : 0,
              }}
            >
              {/* Gradient accent line */}
              <div className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-gradient-to-b from-primary via-gaming-purple to-gaming-cyan opacity-60" />
              
              <div className="flex items-center gap-3 mb-4 pl-2">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-gaming-purple/20 group-hover:scale-110 transition-transform duration-300">
                  <opp.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold text-foreground">{opp.title}</h3>
              </div>
              <ul className="space-y-2 pl-2">
                {opp.points.map((point, j) => (
                  <li 
                    key={j} 
                    className="flex items-center gap-2 text-xs text-muted-foreground group-hover:text-foreground transition-colors duration-300"
                    style={{ transitionDelay: `${j * 50}ms` }}
                  >
                    <Star className="h-3 w-3 text-warning flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* About Creator */}
      <section 
        id="about"
        data-animate
        className={`relative z-10 px-4 py-8 pb-28 transition-all duration-700 delay-300 ${
          isVisible('about') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="relative glass-card rounded-2xl p-6 max-w-md mx-auto overflow-hidden group">
          {/* Background gradient animation */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-gaming-purple/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          <div className="relative flex items-center gap-4 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <img 
                src="/abhishek-shukla.jpg" 
                alt="Abhishek Shukla" 
                className="relative h-16 w-16 rounded-full object-cover ring-2 ring-primary/40 shadow-lg"
              />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Abhishek Shukla</h3>
              <p className="text-[10px] text-primary font-medium">Founder & CEO</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed relative">
            An 18-year-old engineering student and tech enthusiast who built Vyuha to bridge the gap between casual gaming and professional esports. Passionate about creating opportunities for the next generation of Indian gamers.
          </p>
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/50 relative">
            <a href="https://instagram.com/abhishek.shhh" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors">
              @abhishek.shhh
            </a>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/60 backdrop-blur-2xl border-t border-border/30">
        <Button 
          className="w-full max-w-md mx-auto block relative overflow-hidden bg-gradient-to-r from-primary via-gaming-purple to-primary bg-[length:200%_100%] animate-[gradient_3s_ease_infinite] shadow-xl shadow-primary/30 group"
          onClick={() => setAuthDialog('signup')}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            Join Vyuha Now <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform" />
          </span>
        </Button>
      </div>

      {/* Auth Dialog */}
      <Dialog open={authDialog !== null} onOpenChange={(open) => !open && setAuthDialog(null)}>
        <DialogContent className="max-w-sm bg-background/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/30 rounded-full blur-md" />
                <img src={vyuhaLogo} alt="Vyuha" className="relative h-8 w-8 rounded-full" />
              </div>
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
                  className={`bg-background/50 ${errors.fullName ? 'border-destructive' : ''}`}
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
                className={`bg-background/50 ${errors.email ? 'border-destructive' : ''}`}
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
                  className={`bg-background/50 ${errors.password ? 'border-destructive' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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

            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-gradient-to-r from-primary via-gaming-purple to-primary bg-[length:200%_100%] animate-[gradient_3s_ease_infinite]"
            >
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

      <style>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
};

export default Landing;
