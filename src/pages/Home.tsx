import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { Trophy, Users, Target, Gamepad2, ArrowRight, Star } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const features = [
    {
      icon: Trophy,
      title: 'Competitive Tournaments',
      description: 'Join daily, weekly, and monthly tournaments with amazing prize pools.',
    },
    {
      icon: Users,
      title: 'Team Management',
      description: 'Create and manage your esports team with our intuitive tools.',
    },
    {
      icon: Target,
      title: 'Fair Matchmaking',
      description: 'Advanced matchmaking system ensures balanced and exciting matches.',
    },
    {
      icon: Gamepad2,
      title: 'Multiple Games',
      description: 'Support for BGMI, Free Fire, COD Mobile, and many more games.',
    },
  ];

  const games = [
    { name: 'BGMI', players: '10K+' },
    { name: 'Free Fire', players: '8K+' },
    { name: 'COD Mobile', players: '5K+' },
    { name: 'Valorant', players: '3K+' },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 py-20 lg:py-32">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmNTc0MjIiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6 animate-fade-in">
              <Star className="h-4 w-4" />
              #1 Esports Platform in India
            </div>
            
            <h1 className="font-gaming text-4xl md:text-5xl lg:text-6xl font-bold mb-6 animate-slide-up">
              Join the Ultimate{' '}
              <span className="gaming-text-gradient">Gaming Tournaments</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Compete with the best players, win amazing prizes, and become a champion. 
              Start your esports journey today.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Button 
                variant="gaming" 
                size="xl"
                onClick={() => navigate(user ? '/tournaments' : '/auth?mode=signup')}
              >
                {user ? 'Browse Tournaments' : 'Get Started'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="xl"
                onClick={() => navigate('/tournaments')}
              >
                View Tournaments
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="font-gaming text-3xl md:text-4xl font-bold text-primary">50K+</div>
              <div className="text-muted-foreground text-sm mt-1">Active Players</div>
            </div>
            <div className="text-center">
              <div className="font-gaming text-3xl md:text-4xl font-bold text-primary">1000+</div>
              <div className="text-muted-foreground text-sm mt-1">Tournaments</div>
            </div>
            <div className="text-center">
              <div className="font-gaming text-3xl md:text-4xl font-bold text-primary">₹10L+</div>
              <div className="text-muted-foreground text-sm mt-1">Prize Distributed</div>
            </div>
            <div className="text-center">
              <div className="font-gaming text-3xl md:text-4xl font-bold text-primary">4.9</div>
              <div className="text-muted-foreground text-sm mt-1">User Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-gaming text-3xl md:text-4xl font-bold mb-4">
              Why Choose <span className="gaming-text-gradient">Vyuha Esport</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We provide the best platform for competitive gaming with amazing features
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="bg-card rounded-xl p-6 border border-border card-hover animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-lg gaming-gradient flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-gaming font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Games Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-gaming text-3xl md:text-4xl font-bold mb-4">
              Popular <span className="gaming-text-gradient">Games</span>
            </h2>
            <p className="text-muted-foreground">
              Compete in your favorite mobile games
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {games.map((game) => (
              <div
                key={game.name}
                className="bg-card rounded-xl p-6 border border-border text-center card-hover"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Gamepad2 className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-gaming font-semibold text-lg">{game.name}</h3>
                <p className="text-muted-foreground text-sm mt-1">{game.players} Players</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="bg-card rounded-2xl p-8 md:p-12 border border-border text-center relative overflow-hidden">
            <div className="absolute inset-0 gaming-gradient opacity-5" />
            <div className="relative">
              <h2 className="font-gaming text-3xl md:text-4xl font-bold mb-4">
                Ready to Compete?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Join thousands of players and start your esports journey today. 
                Register now and get access to exclusive tournaments.
              </p>
              <Button 
                variant="gaming" 
                size="xl"
                onClick={() => navigate(user ? '/tournaments' : '/auth?mode=signup')}
              >
                {user ? 'Browse Tournaments' : 'Join Now - It\'s Free'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Home;
