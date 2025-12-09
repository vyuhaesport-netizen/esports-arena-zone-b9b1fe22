import { Link } from 'react-router-dom';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import { Trophy, Users, Mail, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src={vyuhaLogo} alt="Vyuha Esport" className="h-12 w-12 object-contain" />
              <span className="font-gaming text-xl font-bold">Vyuha Esport</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Join the ultimate gaming tournaments and compete with the best players worldwide.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-gaming font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/tournaments" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Tournaments
                </Link>
              </li>
              <li>
                <Link to="/auth" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Join Now
                </Link>
              </li>
            </ul>
          </div>

          {/* Features */}
          <div>
            <h4 className="font-gaming font-semibold mb-4">Features</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-muted-foreground text-sm">
                <Trophy className="h-4 w-4 text-primary" />
                Competitive Tournaments
              </li>
              <li className="flex items-center gap-2 text-muted-foreground text-sm">
                <Users className="h-4 w-4 text-primary" />
                Team Management
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-gaming font-semibold mb-4">Contact</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-muted-foreground text-sm">
                <Mail className="h-4 w-4 text-primary" />
                vyuhaesport@gmail.com
              </li>
              <li className="flex items-center gap-2 text-muted-foreground text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                India
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Vyuha Esport. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
