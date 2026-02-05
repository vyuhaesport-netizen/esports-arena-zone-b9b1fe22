import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import AppLayout from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  School,
  Phone,
  Gamepad2,
  Users,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
  Trophy,
  MapPin,
  Calendar,
  IndianRupee,
  Info,
  Loader2,
  QrCode,
  Share2,
  Eye,
  Globe,
  UserCheck,
   ClipboardCheck,
   Youtube,
   MessageCircle,
   Wallet
} from 'lucide-react';

// Discord icon component
const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
  </svg>
);

interface Application {
  id: string;
  school_name: string;
  school_city: string;
  school_state: string;
  tournament_name: string;
  game: string;
  max_players: number;
  entry_type: string;
  entry_fee: number;
  status: string;
  tournament_date: string;
  created_at: string;
  rejection_reason?: string;
}

interface Tournament {
  id: string;
  tournament_name: string;
  school_name: string;
  game: string;
  max_players: number;
  current_players: number;
  status: string;
  tournament_date: string;
  private_code: string;
  total_rooms: number;
  current_round: number;
  total_rounds: number;
  entry_type: string;
  entry_fee: number;
  total_collected: number;
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh'
];

const SchoolTournament = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('apply');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  
  // Multi-step form state
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // School Details (Step 1)
    schoolName: '',
    schoolCity: '',
    schoolState: '',
    schoolDistrict: '',
    verificationType: 'online' as 'online' | 'spot',
     // Structured address for spot verification
     addressLine1: '',
     addressLine2: '',
     pincode: '',
    
    // Organizer Info (Step 2)
    organizerName: '',
    primaryPhone: '',
    alternatePhone: '',
    
    // Tournament Config (Step 3)
    tournamentName: '',
    game: 'BGMI' as 'BGMI' | 'Free Fire',
    maxPlayers: 400,
    entryType: 'paid' as 'paid',
    entryFee: 25,
    prizePool: 0,
    tournamentDate: '',
    registrationDeadline: '',
    
    // Social Links (Step 3)
    youtubeLink: '',
    instagramLink: '',
    whatsappLink: '',
    discordLink: '',
    
    // Prize Distribution
    prizeDistributionMode: 'online' as 'online' | 'local_venue',
    winnersPerRoom: 1,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      fetchData();
    }
  }, [user, authLoading]);

  const fetchData = async () => {
    try {
      const [appsResult, tournamentsResult] = await Promise.all([
        supabase
          .from('school_tournament_applications')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('school_tournaments')
          .select('*')
          .eq('organizer_id', user!.id)
          .order('created_at', { ascending: false })
      ]);

      if (appsResult.data) setApplications(appsResult.data);
      if (tournamentsResult.data) setTournaments(tournamentsResult.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStructure = () => {
    const { game, maxPlayers, winnersPerRoom } = formData;
    const playersPerRoom = game === 'BGMI' ? 100 : 50;
    const teamsPerRoom = game === 'BGMI' ? 25 : 12;
    const totalTeams = Math.ceil(maxPlayers / 4);
    const finaleTeams = teamsPerRoom;
    
    let currentTeams = totalTeams;
    let rounds = 0;
    
    while (currentTeams > finaleTeams) {
      const rooms = Math.ceil(currentTeams / teamsPerRoom);
      currentTeams = rooms * winnersPerRoom; // Winners from each room advance
      rounds++;
    }
    rounds++; // Add finale round
    
    return {
      playersPerRoom,
      teamsPerRoom,
      totalTeams,
      initialRooms: Math.ceil(totalTeams / teamsPerRoom),
      totalRounds: rounds,
      finaleTeams,
      winnersPerRoom
    };
  };

  const validateStep = (stepNum: number): boolean => {
    switch (stepNum) {
      case 1:
        if (!formData.schoolName || !formData.schoolCity || !formData.schoolState || !formData.schoolDistrict) {
          toast.error('Please fill all school details');
          return false;
        }
         if (formData.verificationType === 'spot') {
           if (!formData.addressLine1.trim() || !formData.pincode.trim()) {
             toast.error('Address Line 1 and Pincode are required for spot verification');
             return false;
           }
           if (!/^\d{6}$/.test(formData.pincode)) {
             toast.error('Please enter valid 6-digit pincode');
          return false;
        }
         }
        break;
      case 2:
        if (!formData.organizerName || !formData.primaryPhone) {
          toast.error('Please fill organizer details');
          return false;
        }
        if (!/^[6-9]\d{9}$/.test(formData.primaryPhone)) {
          toast.error('Invalid phone number');
          return false;
        }
        break;
      case 3:
        if (!formData.tournamentName || !formData.tournamentDate || !formData.registrationDeadline) {
          toast.error('Please fill all tournament details');
          return false;
        }
        if (formData.maxPlayers < 100 || formData.maxPlayers > 10000) {
          toast.error('Max players must be between 100 and 10,000');
          return false;
        }
        if (formData.entryFee < 25) {
          toast.error('Minimum entry fee is ₹25 per player');
          return false;
        }
        break;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    
    setSubmitting(true);
    try {
       const fullAddress = formData.verificationType === 'spot' 
         ? `${formData.addressLine1}${formData.addressLine2 ? ', ' + formData.addressLine2 : ''}, ${formData.schoolCity}, ${formData.schoolState} - ${formData.pincode}`
         : null;
       
      const { error } = await supabase.from('school_tournament_applications').insert({
        user_id: user!.id,
        school_name: formData.schoolName,
        school_city: formData.schoolCity,
        school_state: formData.schoolState,
        school_district: formData.schoolDistrict,
        school_image_url: null,
        organizer_name: formData.organizerName,
        primary_phone: formData.primaryPhone,
        alternate_phone: formData.alternatePhone || null,
        tournament_name: formData.tournamentName,
        game: formData.game,
        max_players: formData.maxPlayers,
        entry_type: 'paid',
        entry_fee: formData.entryFee,
        prize_pool: formData.prizePool,
        tournament_date: formData.tournamentDate,
        registration_deadline: formData.registrationDeadline,
        verification_type: formData.verificationType,
         full_address: fullAddress,
         address_line_1: formData.verificationType === 'spot' ? formData.addressLine1 : null,
         address_line_2: formData.verificationType === 'spot' ? formData.addressLine2 : null,
         pincode: formData.verificationType === 'spot' ? formData.pincode : null,
         youtube_link: formData.youtubeLink || null,
         instagram_link: formData.instagramLink || null,
         whatsapp_link: formData.whatsappLink || null,
         discord_link: formData.discordLink || null,
         prize_distribution_mode: formData.prizeDistributionMode,
         winners_per_room: formData.winnersPerRoom,
      });

      if (error) throw error;

      toast.success('Application submitted! Admin will review shortly.');
      setStep(1);
      setFormData({
        schoolName: '',
        schoolCity: '',
        schoolState: '',
        schoolDistrict: '',
        verificationType: 'online',
         addressLine1: '',
         addressLine2: '',
         pincode: '',
        organizerName: '',
        primaryPhone: '',
        alternatePhone: '',
        tournamentName: '',
        game: 'BGMI',
        maxPlayers: 400,
        entryType: 'paid',
        entryFee: 25,
        prizePool: 0,
        tournamentDate: '',
        registrationDeadline: '',
         youtubeLink: '',
         instagramLink: '',
         whatsappLink: '',
         discordLink: '',
         prizeDistributionMode: 'online',
         winnersPerRoom: 1,
      });
      setActiveTab('applications');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const structure = calculateStructure();

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="pb-20 overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/20 to-primary/5 px-3 py-3">
          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-sm font-bold">Private Tournament</h1>
              <p className="text-xs text-muted-foreground">
                Organize for schools, colleges & private events
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-3 mt-3">
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="apply" className="text-sm">Apply</TabsTrigger>
            <TabsTrigger value="applications" className="text-sm">Applications</TabsTrigger>
            <TabsTrigger value="tournaments" className="text-sm">Tournaments</TabsTrigger>
          </TabsList>

          {/* Apply Tab - Multi-Step Form */}
          <TabsContent value="apply" className="mt-3">
            {/* Progress */}
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Step {step} of 3</span>
                <span className="text-xs text-muted-foreground">
                  {step === 1 ? 'School Details' : step === 2 ? 'Organizer Info' : 'Tournament Config'}
                </span>
              </div>
              <Progress value={(step / 3) * 100} className="h-2" />
            </div>

            {/* Step 1: School Details */}
            {step === 1 && (
              <Card className="glass-card border-2 border-white/30">
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <School className="h-4 w-4 text-primary" />
                    School/College Details
                  </CardTitle>
                  <CardDescription className="text-xs">Enter your institution information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 px-3 pb-3">
                  <div>
                    <Label className="text-xs">Institution Name *</Label>
                    <Input
                      placeholder="ABC Public School"
                      value={formData.schoolName}
                      onChange={(e) => setFormData(prev => ({ ...prev, schoolName: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">City *</Label>
                      <Input
                        placeholder="Mumbai"
                        value={formData.schoolCity}
                        onChange={(e) => setFormData(prev => ({ ...prev, schoolCity: e.target.value }))}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">District *</Label>
                      <Input
                        placeholder="Mumbai Suburban"
                        value={formData.schoolDistrict}
                        onChange={(e) => setFormData(prev => ({ ...prev, schoolDistrict: e.target.value }))}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs">State *</Label>
                    <Select
                      value={formData.schoolState}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, schoolState: value }))}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDIAN_STATES.map(state => (
                          <SelectItem key={state} value={state} className="text-sm">{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Verification Type */}
                  <div>
                    <Label className="text-xs mb-2 block">Registration Type *</Label>
                    <RadioGroup
                      value={formData.verificationType}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, verificationType: value as 'online' | 'spot' }))}
                      className="grid grid-cols-1 gap-2"
                    >
                      <div
                        onClick={() => setFormData(prev => ({ ...prev, verificationType: 'online' }))}
                        className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          formData.verificationType === 'online' 
                            ? 'border-primary bg-primary/10' 
                            : 'border-white/20 bg-transparent'
                        }`}
                      >
                        <div className={`h-4 w-4 mt-0.5 rounded-full border-2 flex items-center justify-center ${
                          formData.verificationType === 'online' ? 'border-primary' : 'border-muted-foreground'
                        }`}>
                          {formData.verificationType === 'online' && (
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-primary" />
                            <span className="text-sm font-semibold">Online Only</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Teams register online. No physical verification needed.
                          </p>
                        </div>
                      </div>
                      <div
                        onClick={() => setFormData(prev => ({ ...prev, verificationType: 'spot' }))}
                        className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          formData.verificationType === 'spot' 
                            ? 'border-orange-500 bg-orange-500/10' 
                            : 'border-white/20 bg-transparent'
                        }`}
                      >
                        <div className={`h-4 w-4 mt-0.5 rounded-full border-2 flex items-center justify-center ${
                          formData.verificationType === 'spot' ? 'border-orange-500' : 'border-muted-foreground'
                        }`}>
                          {formData.verificationType === 'spot' && (
                            <div className="h-2 w-2 rounded-full bg-orange-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-orange-500" />
                            <span className="text-sm font-semibold">Spot Verification</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            After online registration, teams must visit institution for physical ID verification. Teams not verified by deadline will be auto-eliminated (NO REFUND).
                          </p>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  {/* Full Address for Spot Verification */}
                  {formData.verificationType === 'spot' && (
                     <div className="space-y-3">
                      <Label className="text-xs flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-orange-500" />
                         Verification Address *
                      </Label>
                       <Input
                         placeholder="Address Line 1 (Building, Street) *"
                         value={formData.addressLine1}
                         onChange={(e) => setFormData(prev => ({ ...prev, addressLine1: e.target.value }))}
                         className="h-9 text-sm"
                      />
                       <Input
                         placeholder="Address Line 2 (Landmark, Area)"
                         value={formData.addressLine2}
                         onChange={(e) => setFormData(prev => ({ ...prev, addressLine2: e.target.value }))}
                         className="h-9 text-sm"
                       />
                       <Input
                         placeholder="Pincode (6 digits) *"
                         maxLength={6}
                         value={formData.pincode}
                         onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value.replace(/\D/g, '') }))}
                         className="h-9 text-sm"
                       />
                      <p className="text-xs text-orange-400">
                        ⚠️ Teams that fail to verify by registration deadline will be automatically eliminated. No refunds for unverified teams.
                      </p>
                    </div>
                  )}
                  
                  <Button
                    className="w-full h-9 text-sm" 
                    onClick={() => validateStep(1) && setStep(2)}
                  >
                    Next <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Organizer Info */}
            {step === 2 && (
              <Card className="glass-card border-2 border-white/30">
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-primary" />
                    Organizer Information
                  </CardTitle>
                  <CardDescription className="text-xs">Your contact details for coordination</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 px-3 pb-3">
                  <div>
                    <Label className="text-xs">Your Name *</Label>
                    <Input
                      placeholder="John Doe"
                      value={formData.organizerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, organizerName: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs">Primary Phone *</Label>
                    <Input
                      placeholder="9876543210"
                      maxLength={10}
                      value={formData.primaryPhone}
                         onChange={(e) => {
                           const val = e.target.value.replace(/\D/g, '');
                           setFormData(prev => ({ ...prev, primaryPhone: val }));
                         }}
                      className="h-9 text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs">Alternate Phone (Optional)</Label>
                    <Input
                      placeholder="9876543211"
                      maxLength={10}
                      value={formData.alternatePhone}
                         onChange={(e) => {
                           const val = e.target.value.replace(/\D/g, '');
                           setFormData(prev => ({ ...prev, alternatePhone: val }));
                         }}
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 h-9 text-sm" onClick={() => setStep(1)}>
                      <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
                    </Button>
                    <Button className="flex-1 h-9 text-sm" onClick={() => validateStep(2) && setStep(3)}>
                      Next <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Tournament Config */}
            {step === 3 && (
              <div className="space-y-3">
                <Card className="glass-card border-2 border-white/30">
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Gamepad2 className="h-4 w-4 text-primary" />
                      Tournament Configuration
                    </CardTitle>
                    <CardDescription className="text-xs">Setup your tournament details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 px-3 pb-3">
                    <div>
                      <Label className="text-xs">Tournament Name *</Label>
                      <Input
                        placeholder="Inter-School BGMI Championship 2026"
                        value={formData.tournamentName}
                        onChange={(e) => setFormData(prev => ({ ...prev, tournamentName: e.target.value }))}
                        className="h-9 text-sm"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs">Select Game *</Label>
                      <RadioGroup
                        value={formData.game}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, game: value as 'BGMI' | 'Free Fire' }))}
                        className="grid grid-cols-2 gap-3 mt-2"
                      >
                        <Label
                          className={`flex items-center gap-2.5 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                            formData.game === 'BGMI' ? 'border-primary bg-primary/10' : 'border-white/20'
                          }`}
                        >
                          <RadioGroupItem value="BGMI" className="h-4 w-4" />
                          <div>
                            <p className="text-sm font-medium">BGMI</p>
                            <p className="text-xs text-muted-foreground">100 players/room</p>
                          </div>
                        </Label>
                        <Label
                          className={`flex items-center gap-2.5 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                            formData.game === 'Free Fire' ? 'border-primary bg-primary/10' : 'border-white/20'
                          }`}
                        >
                          <RadioGroupItem value="Free Fire" className="h-4 w-4" />
                          <div>
                            <p className="text-sm font-medium">Free Fire</p>
                            <p className="text-xs text-muted-foreground">50 players/room</p>
                          </div>
                        </Label>
                      </RadioGroup>
                    </div>
                    
                    <div>
                      <Label className="text-xs">Maximum Players * (100 - 10,000)</Label>
                      <Input
                        type="number"
                        min={100}
                        max={10000}
                        step={100}
                         value={formData.maxPlayers || ''}
                         onChange={(e) => setFormData(prev => ({ ...prev, maxPlayers: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 }))}
                        className="h-9 text-sm"
                      />
                    </div>

                    {/* Entry Fee - Now always paid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Entry Fee (₹/player) *</Label>
                        <Input
                          type="number"
                          min={25}
                          value={formData.entryFee || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, entryFee: Math.max(25, e.target.value === '' ? 25 : parseInt(e.target.value) || 25) }))}
                          className="h-9 text-sm"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">Min ₹25 per player</p>
                      </div>
                      <div>
                        <Label className="text-xs">Prize Pool (₹)</Label>
                        <Input
                          type="number"
                          value={formData.prizePool || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, prizePool: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 }))}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                     
                     {/* Prize Distribution Mode */}
                     <div>
                       <Label className="text-xs mb-2 block">Prize Distribution Mode *</Label>
                       <RadioGroup
                         value={formData.prizeDistributionMode}
                         onValueChange={(value) => setFormData(prev => ({ ...prev, prizeDistributionMode: value as 'online' | 'local_venue' }))}
                         className="grid grid-cols-2 gap-3"
                       >
                         <Label
                           className={`flex items-center gap-2.5 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                             formData.prizeDistributionMode === 'online' ? 'border-primary bg-primary/10' : 'border-white/20'
                           }`}
                         >
                           <RadioGroupItem value="online" className="h-4 w-4" />
                           <div>
                             <p className="text-sm font-medium flex items-center gap-1.5">
                               <Wallet className="h-3.5 w-3.5" /> Online
                             </p>
                             <p className="text-[10px] text-muted-foreground">Vyuha Wallet Credit</p>
                           </div>
                         </Label>
                         <Label
                           className={`flex items-center gap-2.5 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                             formData.prizeDistributionMode === 'local_venue' ? 'border-orange-500 bg-orange-500/10' : 'border-white/20'
                           }`}
                         >
                           <RadioGroupItem value="local_venue" className="h-4 w-4" />
                           <div>
                             <p className="text-sm font-medium flex items-center gap-1.5">
                               <MapPin className="h-3.5 w-3.5" /> Local Venue
                             </p>
                             <p className="text-[10px] text-muted-foreground">Physical cash payout</p>
                           </div>
                         </Label>
                       </RadioGroup>
                     </div>
                     
                     {/* Winners Per Room */}
                     <div>
                       <Label className="text-xs">Winners Per Room (1-5)</Label>
                       <Select
                         value={formData.winnersPerRoom.toString()}
                         onValueChange={(value) => setFormData(prev => ({ ...prev, winnersPerRoom: parseInt(value) }))}
                       >
                         <SelectTrigger className="h-9 text-sm">
                           <SelectValue placeholder="Select winners per room" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="1">1 Winner (Single)</SelectItem>
                           <SelectItem value="2">2 Winners (Double)</SelectItem>
                           <SelectItem value="3">3 Winners (Triple)</SelectItem>
                           <SelectItem value="4">4 Winners</SelectItem>
                           <SelectItem value="5">5 Winners</SelectItem>
                         </SelectContent>
                       </Select>
                       <p className="text-[10px] text-muted-foreground mt-1">
                         Number of teams that advance from each room per round
                       </p>
                     </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Tournament Date *</Label>
                        <Input
                          type="datetime-local"
                          value={formData.tournamentDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, tournamentDate: e.target.value }))}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Registration Deadline *</Label>
                        <Input
                          type="datetime-local"
                          value={formData.registrationDeadline}
                          onChange={(e) => setFormData(prev => ({ ...prev, registrationDeadline: e.target.value }))}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tournament Structure Preview */}
                <Card className="glass-card border-2 border-primary/40 bg-primary/5">
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Auto-Calculated Structure
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <div className="grid grid-cols-4 gap-2">
                      <div className="bg-card p-2.5 rounded-lg text-center border border-white/20">
                        <p className="text-xs text-muted-foreground">Teams</p>
                        <p className="font-bold text-sm">{structure.totalTeams}</p>
                      </div>
                      <div className="bg-card p-2.5 rounded-lg text-center border border-white/20">
                        <p className="text-xs text-muted-foreground">Rooms</p>
                        <p className="font-bold text-sm">{structure.initialRooms}</p>
                      </div>
                      <div className="bg-card p-2.5 rounded-lg text-center border border-white/20">
                        <p className="text-xs text-muted-foreground">Rounds</p>
                        <p className="font-bold text-sm">{structure.totalRounds}</p>
                      </div>
                      <div className="bg-card p-2.5 rounded-lg text-center border border-white/20">
                        <p className="text-xs text-muted-foreground">Finale</p>
                        <p className="font-bold text-sm">{structure.finaleTeams}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2.5">
                      <Trophy className="h-3 w-3 inline mr-1" />
                       Top {formData.winnersPerRoom} team{formData.winnersPerRoom > 1 ? 's' : ''} from each room advances
                    </p>
                  </CardContent>
                </Card>

                 {/* Social Links Card */}
                 <Card className="glass-card border-2 border-white/30">
                   <CardHeader className="pb-2 pt-3 px-3">
                     <CardTitle className="flex items-center gap-2 text-sm">
                       <Share2 className="h-4 w-4 text-primary" />
                       Social Links (Optional)
                     </CardTitle>
                     <CardDescription className="text-xs">Add links for players to join after registration</CardDescription>
                   </CardHeader>
                   <CardContent className="space-y-3 px-3 pb-3">
                     <div className="grid grid-cols-2 gap-3">
                       <div>
                         <Label className="text-xs flex items-center gap-1.5">
                           <Youtube className="h-3.5 w-3.5 text-red-500" /> YouTube
                         </Label>
                         <Input
                           placeholder="https://youtube.com/..."
                           value={formData.youtubeLink}
                           onChange={(e) => setFormData(prev => ({ ...prev, youtubeLink: e.target.value }))}
                           className="h-9 text-sm"
                         />
                       </div>
                       <div>
                         <Label className="text-xs flex items-center gap-1.5">
                           <svg className="h-3.5 w-3.5 text-pink-500" viewBox="0 0 24 24" fill="currentColor">
                             <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                           </svg> Instagram
                         </Label>
                         <Input
                           placeholder="https://instagram.com/..."
                           value={formData.instagramLink}
                           onChange={(e) => setFormData(prev => ({ ...prev, instagramLink: e.target.value }))}
                           className="h-9 text-sm"
                         />
                       </div>
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                       <div>
                         <Label className="text-xs flex items-center gap-1.5">
                           <MessageCircle className="h-3.5 w-3.5 text-green-500" /> WhatsApp
                         </Label>
                         <Input
                           placeholder="https://chat.whatsapp.com/..."
                           value={formData.whatsappLink}
                           onChange={(e) => setFormData(prev => ({ ...prev, whatsappLink: e.target.value }))}
                           className="h-9 text-sm"
                         />
                       </div>
                       <div>
                         <Label className="text-xs flex items-center gap-1.5">
                           <DiscordIcon className="h-3.5 w-3.5 text-indigo-400" /> Discord
                         </Label>
                         <Input
                           placeholder="https://discord.gg/..."
                           value={formData.discordLink}
                           onChange={(e) => setFormData(prev => ({ ...prev, discordLink: e.target.value }))}
                           className="h-9 text-sm"
                         />
                       </div>
                     </div>
                     <p className="text-[10px] text-muted-foreground bg-blue-500/10 p-2 rounded border border-blue-500/20">
                       ℹ️ Players will be shown these links after registration to join your community/group for updates.
                     </p>
                   </CardContent>
                 </Card>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-9 text-sm" onClick={() => setStep(2)}>
                    <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
                  </Button>
                  <Button 
                    className="flex-1 h-9 text-sm" 
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Submitting...</>
                    ) : (
                      <><CheckCircle className="h-4 w-4 mr-1.5" /> Submit</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="mt-3">
            {applications.length === 0 ? (
              <Card className="glass-card border-2 border-white/30 text-center py-8">
                <CardContent className="pt-0">
                  <School className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No applications yet</p>
                  <Button className="mt-4 h-9 text-sm" onClick={() => setActiveTab('apply')}>
                    Apply Now
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => (
                  <Card key={app.id} className="glass-card border-2 border-white/30">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-sm font-bold">{app.tournament_name}</h3>
                          <p className="text-xs text-muted-foreground">{app.school_name}</p>
                        </div>
                        <Badge variant={
                          app.status === 'approved' ? 'default' :
                          app.status === 'rejected' ? 'destructive' : 'secondary'
                        } className="text-xs px-2 py-0.5">
                          {app.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {app.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                          {app.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                          {app.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Gamepad2 className="h-3 w-3" /> {app.game}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {app.max_players}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> 
                          {new Date(app.tournament_date).toLocaleDateString()}
                        </span>
                      </div>

                      {app.rejection_reason && (
                        <div className="mt-2 p-2 bg-destructive/10 border border-destructive/30 rounded-lg text-xs text-destructive">
                          <strong>Reason:</strong> {app.rejection_reason}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tournaments Tab */}
          <TabsContent value="tournaments" className="mt-3">
            {tournaments.length === 0 ? (
              <Card className="glass-card border-2 border-white/30 text-center py-8">
                <CardContent className="pt-0">
                  <Trophy className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No active tournaments</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Submit an application and wait for approval
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {tournaments.map((tournament) => (
                  <Card key={tournament.id} className="glass-card border-2 border-white/30 overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2.5">
                        <div>
                          <h3 className="font-bold text-sm">{tournament.tournament_name}</h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" /> {tournament.school_name}
                          </p>
                        </div>
                        <Badge variant={
                          tournament.status === 'registration' ? 'secondary' :
                          tournament.status === 'completed' ? 'default' :
                          tournament.status === 'cancelled' ? 'destructive' : 'default'
                        } className="text-xs px-2 py-0.5">
                          {tournament.status}
                        </Badge>
                      </div>

                      {/* Stats Grid - matching TournamentCard style */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="bg-primary/10 rounded-lg p-2.5 text-center border border-primary/25">
                          <Users className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
                          <p className="text-sm font-bold">{tournament.current_players}</p>
                          <p className="text-[10px] text-muted-foreground">Players</p>
                        </div>
                        <div className="bg-warning/10 rounded-lg p-2.5 text-center border border-warning/25">
                          <Trophy className="h-3.5 w-3.5 text-warning mx-auto mb-1" />
                          <p className="text-sm font-bold">{tournament.total_rooms}</p>
                          <p className="text-[10px] text-muted-foreground">Rooms</p>
                        </div>
                        <div className="bg-success/10 rounded-lg p-2.5 text-center border border-success/25">
                          <Calendar className="h-3.5 w-3.5 text-success mx-auto mb-1" />
                          <p className="text-sm font-bold">R{tournament.current_round}/{tournament.total_rounds}</p>
                          <p className="text-[10px] text-muted-foreground">Round</p>
                        </div>
                      </div>

                      {/* Private Code */}
                      <div className="flex items-center justify-between p-2 bg-primary/10 rounded-lg border border-primary/25 mb-3">
                        <div className="flex items-center gap-2">
                          <QrCode className="h-4 w-4 text-primary" />
                          <span className="text-sm font-mono font-bold">{tournament.private_code}</span>
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                          navigator.clipboard.writeText(`Join Code: ${tournament.private_code}`);
                          toast.success('Code copied!');
                        }}>
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {tournament.entry_type === 'paid' && (
                        <div className="flex items-center justify-between text-sm mb-3 px-1">
                          <span className="text-muted-foreground">Collected</span>
                          <span className="font-bold text-success">
                            <IndianRupee className="h-3 w-3 inline" />
                            {tournament.total_collected}
                          </span>
                        </div>
                      )}

                      {/* Manage Button */}
                      <Button 
                        className="w-full h-9 text-sm" 
                        onClick={() => navigate(`/school-tournament/${tournament.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1.5" /> Manage Tournament
                      </Button>

                      {/* Verification Section - only for spot verification tournaments */}
                      {(tournament as any).verification_type === 'spot' && (
                        <div className="mt-3 p-2.5 bg-orange-500/10 rounded-lg border border-orange-500/30">
                          <div className="flex items-center gap-2 mb-2">
                            <UserCheck className="h-4 w-4 text-orange-500" />
                            <span className="text-xs font-semibold text-orange-500">Spot Verification Required</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mb-2">
                            Teams must visit your institution for physical ID verification before tournament starts.
                          </p>
                          <Button 
                            variant="outline"
                            size="sm"
                            className="w-full h-8 text-xs border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
                            onClick={() => navigate(`/school-tournament/${tournament.id}?tab=verify`)}
                          >
                            <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" /> Open Verification Panel
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default SchoolTournament;
