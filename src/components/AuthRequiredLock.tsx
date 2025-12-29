import { Lock, LogIn, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AuthRequiredLockProps {
  title?: string;
  description?: string;
}

const AuthRequiredLock = ({ 
  title = "Login Required", 
  description = "Please login or create an account to access this feature" 
}: AuthRequiredLockProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10 border border-primary/20">
            <Lock className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => navigate('/')} 
              className="w-full gap-2"
              size="lg"
            >
              <LogIn className="h-4 w-4" />
              Login
            </Button>
            <Button 
              onClick={() => navigate('/')} 
              variant="outline" 
              className="w-full gap-2"
              size="lg"
            >
              <UserPlus className="h-4 w-4" />
              Sign Up
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Join Vyuha Esport to participate in tournaments, compete with players, and win amazing prizes!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthRequiredLock;
