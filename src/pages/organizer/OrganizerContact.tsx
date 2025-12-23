import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import {
  ArrowLeft,
  Loader2,
  MessageCircle,
  Phone,
  Instagram,
  ExternalLink,
  Heart,
  Users
} from 'lucide-react';

interface OwnerContact {
  whatsapp: string;
  instagram: string;
  note: string;
}

const OrganizerContact = () => {
  const [contact, setContact] = useState<OwnerContact>({
    whatsapp: '',
    instagram: '',
    note: ''
  });
  const [loading, setLoading] = useState(true);

  const { user, isOrganizer, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (!isOrganizer) {
        navigate('/profile');
        toast({ title: 'Access Denied', description: 'You are not an approved organizer.', variant: 'destructive' });
      }
    }
  }, [user, isOrganizer, authLoading, navigate, toast]);

  useEffect(() => {
    if (isOrganizer && user) {
      fetchContactDetails();
    }
  }, [isOrganizer, user]);

  const fetchContactDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['owner_whatsapp', 'owner_instagram', 'owner_contact_note']);

      if (error) throw error;

      const contactData: OwnerContact = {
        whatsapp: '',
        instagram: '',
        note: ''
      };

      data?.forEach(setting => {
        if (setting.setting_key === 'owner_whatsapp') contactData.whatsapp = setting.setting_value;
        if (setting.setting_key === 'owner_instagram') contactData.instagram = setting.setting_value;
        if (setting.setting_key === 'owner_contact_note') contactData.note = setting.setting_value;
      });

      setContact(contactData);
    } catch (error) {
      console.error('Error fetching contact details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppClick = () => {
    if (contact.whatsapp) {
      // Format WhatsApp URL
      const phoneNumber = contact.whatsapp.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${phoneNumber}`, '_blank');
    }
  };

  const handleInstagramClick = () => {
    if (contact.instagram) {
      // Handle both username and full URL
      let url = contact.instagram;
      if (!url.startsWith('http')) {
        url = `https://instagram.com/${url.replace('@', '')}`;
      }
      window.open(url, '_blank');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/organizer')} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <MessageCircle className="h-8 w-8" />
          <div>
            <h1 className="text-xl font-bold">Connect With Owner</h1>
            <p className="text-sm text-white/80">Get support & guidance</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Welcome Card */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-full bg-blue-500 text-white">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-700 dark:text-blue-400">Welcome, Organizer!</h3>
                <p className="text-sm text-blue-600/80 dark:text-blue-500/80">We're here to support you</p>
              </div>
            </div>
            {contact.note ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-foreground whitespace-pre-wrap">{contact.note}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No special message from the owner at this time.</p>
            )}
          </CardContent>
        </Card>

        {/* Contact Options */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Contact Options</h3>

          {/* WhatsApp */}
          <Card 
            className={`overflow-hidden ${contact.whatsapp ? 'cursor-pointer hover:shadow-lg transition-shadow' : 'opacity-50'}`}
            onClick={contact.whatsapp ? handleWhatsAppClick : undefined}
          >
            <div className="h-1 bg-gradient-to-r from-green-400 to-green-600" />
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-400 to-green-600 text-white">
                  <Phone className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">WhatsApp</h4>
                  <p className="text-sm text-muted-foreground">
                    {contact.whatsapp || 'Not configured'}
                  </p>
                </div>
                {contact.whatsapp && (
                  <Button size="sm" className="bg-green-500 hover:bg-green-600">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Open
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Instagram */}
          <Card 
            className={`overflow-hidden ${contact.instagram ? 'cursor-pointer hover:shadow-lg transition-shadow' : 'opacity-50'}`}
            onClick={contact.instagram ? handleInstagramClick : undefined}
          >
            <div className="h-1 bg-gradient-to-r from-pink-400 via-purple-500 to-indigo-500" />
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-500 text-white">
                  <Instagram className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">Instagram</h4>
                  <p className="text-sm text-muted-foreground">
                    {contact.instagram || 'Not configured'}
                  </p>
                </div>
                {contact.instagram && (
                  <Button size="sm" className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Open
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Support Info */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Heart className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-foreground text-sm">Need Help?</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Feel free to reach out to the platform owner for any questions about:
                </p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                  <li>Tournament management guidance</li>
                  <li>Commission and payment queries</li>
                  <li>Technical issues</li>
                  <li>Feature requests</li>
                  <li>Partnership opportunities</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* No Contact Setup Message */}
        {!contact.whatsapp && !contact.instagram && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
            <CardContent className="p-4 text-center">
              <MessageCircle className="h-10 w-10 mx-auto text-amber-500 mb-2" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Contact details have not been set up yet.
              </p>
              <p className="text-xs text-amber-600/80 dark:text-amber-500/80 mt-1">
                Please check back later or contact support through other channels.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default OrganizerContact;
