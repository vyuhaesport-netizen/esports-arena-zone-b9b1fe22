import AppLayout from '@/components/layout/AppLayout';
import { Trophy, Target, Gamepad2, Users, Shield, Star, MessageSquare } from 'lucide-react';

const AboutUs = () => {
  return (
    <AppLayout title="About Us">
      <div className="p-4 pb-8 space-y-4">
        {/* Welcome Section */}
        <div className="bg-gradient-to-b from-primary/10 to-card rounded-xl border border-border p-6 text-center">
          <div className="flex justify-center mb-4">
            <Trophy className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to Vyuha Esport</h1>
          <p className="text-muted-foreground">
            India's premier esports tournament platform, bringing competitive gaming to every player.
          </p>
        </div>

        {/* Our Mission */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-border">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Our Mission</h2>
          </div>
          <div className="p-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              At Vyuha Esport, we are dedicated to creating an inclusive and competitive gaming ecosystem where players of all skill levels can participate, compete, and win. Our platform bridges the gap between casual gaming and professional esports, offering fair, transparent, and exciting tournament experiences.
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gamepad2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-sm">Multiple Games</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We support popular mobile games including Free Fire and BGMI, with more titles coming soon.
            </p>
          </div>

          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-sm">Community First</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Join thousands of players in our growing community. Compete in solo, duo, or squad tournaments.
            </p>
          </div>

          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-sm">Fair Play</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We ensure fair competition with strict anti-cheat measures and transparent prize distribution.
            </p>
          </div>

          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-sm">Real Prizes</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Win real cash prizes that are instantly credited to your wallet. Easy withdrawal to your bank.
            </p>
          </div>
        </div>

        {/* Get in Touch */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-border">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Get in Touch</h2>
          </div>
          <div className="p-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Have questions or need support? We're here to help!
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Use the support button in the app to reach our team, or contact us through our social media channels.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AboutUs;
