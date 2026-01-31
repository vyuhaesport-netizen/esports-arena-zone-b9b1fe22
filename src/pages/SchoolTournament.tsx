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
  UserCheck
} from 'lucide-react';

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
    fullAddress: '', // Full address for spot verification
    
    // Organizer Info (Step 2)
    organizerName: '',
    primaryPhone: '',
    alternatePhone: '',
    
    // Tournament Config (Step 3)
    tournamentName: '',
    game: 'BGMI' as 'BGMI' | 'Free Fire',
    maxPlayers: 400,
    entryType: 'free' as 'free' | 'paid',
    entryFee: 0,
    prizePool: 0,
    tournamentDate: '',
    registrationDeadline: '',
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
    const { game, maxPlayers } = formData;
    const playersPerRoom = game === 'BGMI' ? 100 : 50;
    const teamsPerRoom = game === 'BGMI' ? 25 : 12;
    const totalTeams = Math.ceil(maxPlayers / 4);
    const finaleTeams = teamsPerRoom;
    
    let currentTeams = totalTeams;
    let rounds = 0;
    
    while (currentTeams > finaleTeams) {
      const rooms = Math.ceil(currentTeams / teamsPerRoom);
      currentTeams = rooms; // Top 1 from each room
      rounds++;
    }
    rounds++; // Add finale round
    
    return {
      playersPerRoom,
      teamsPerRoom,
      totalTeams,
      initialRooms: Math.ceil(totalTeams / teamsPerRoom),
      totalRounds: rounds,
      finaleTeams
    };
  };

  const validateStep = (stepNum: number): boolean => {
    switch (stepNum) {
      case 1:
        if (!formData.schoolName || !formData.schoolCity || !formData.schoolState || !formData.schoolDistrict) {
          toast.error('Please fill all school details');
          return false;
        }
        if (formData.verificationType === 'spot' && !formData.fullAddress.trim()) {
          toast.error('Full address is required for spot verification');
          return false;
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
        if (formData.entryType === 'paid' && formData.entryFee <= 0) {
          toast.error('Please set entry fee');
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
        entry_type: formData.entryType,
        entry_fee: formData.entryType === 'paid' ? formData.entryFee : 0,
        prize_pool: formData.prizePool,
        tournament_date: formData.tournamentDate,
        registration_deadline: formData.registrationDeadline,
        verification_type: formData.verificationType,
        full_address: formData.verificationType === 'spot' ? formData.fullAddress : null,
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
        fullAddress: '',
        organizerName: '',
        primaryPhone: '',
        alternatePhone: '',
        tournamentName: '',
        game: 'BGMI',
        maxPlayers: 400,
        entryType: 'free',
        entryFee: 0,
        prizePool: 0,
        tournamentDate: '',
        registrationDeadline: '',
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
        {/* Compact Header */}
        <div className="bg-gradient-to-r from-primary/20 to-primary/5 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-sm font-semibold">Private Tournament</h1>
              <p className="text-[10px] text-muted-foreground">
                Organize for schools, colleges & private events
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-3 mt-3">
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="apply" className="text-xs">Apply</TabsTrigger>
            <TabsTrigger value="applications" className="text-xs">Applications</TabsTrigger>
            <TabsTrigger value="tournaments" className="text-xs">Tournaments</TabsTrigger>
          </TabsList>

          {/* Apply Tab - Multi-Step Form */}
          <TabsContent value="apply" className="mt-3">
            {/* Progress */}
            <div className="mb-4">
              <div className="flex justify-between mb-1.5">
                <span className="text-xs font-medium">Step {step} of 3</span>
                <span className="text-[10px] text-muted-foreground">
                  {step === 1 ? 'School Details' : step === 2 ? 'Organizer Info' : 'Tournament Config'}
                </span>
              </div>
              <Progress value={(step / 3) * 100} className="h-1.5" />
            </div>

            {/* Step 1: School Details */}
            {step === 1 && (
              <Card className="border-border/40">
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="flex items-center gap-1.5 text-xs">
                    <School className="h-3.5 w-3.5 text-primary" />
                    School/College Details
                  </CardTitle>
                  <CardDescription className="text-[10px]">Enter your institution information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 px-3 pb-3">
                  <div>
                    <Label className="text-xs">Institution Name *</Label>
                    <Input
                      placeholder="ABC Public School"
                      value={formData.schoolName}
                      onChange={(e) => setFormData(prev => ({ ...prev, schoolName: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">City *</Label>
                      <Input
                        placeholder="Mumbai"
                        value={formData.schoolCity}
                        onChange={(e) => setFormData(prev => ({ ...prev, schoolCity: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">District *</Label>
                      <Input
                        placeholder="Mumbai Suburban"
                        value={formData.schoolDistrict}
                        onChange={(e) => setFormData(prev => ({ ...prev, schoolDistrict: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs">State *</Label>
                    <Select
                      value={formData.schoolState}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, schoolState: value }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDIAN_STATES.map(state => (
                          <SelectItem key={state} value={state} className="text-xs">{state}</SelectItem>
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
                        className={`flex items-start gap-2.5 p-2.5 border-2 rounded-lg cursor-pointer transition-all ${
                          formData.verificationType === 'online' 
                            ? 'border-primary bg-primary/10' 
                            : 'border-white/20 bg-transparent'
                        }`}
                      >
                        <div className={`h-3.5 w-3.5 mt-0.5 rounded-full border-2 flex items-center justify-center ${
                          formData.verificationType === 'online' ? 'border-primary' : 'border-muted-foreground'
                        }`}>
                          {formData.verificationType === 'online' && (
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5 text-primary" />
                            <span className="text-xs font-semibold">Online Only</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Teams register online. No physical verification needed.
                          </p>
                        </div>
                      </div>
                      <div
                        onClick={() => setFormData(prev => ({ ...prev, verificationType: 'spot' }))}
                        className={`flex items-start gap-2.5 p-2.5 border-2 rounded-lg cursor-pointer transition-all ${
                          formData.verificationType === 'spot' 
                            ? 'border-orange-500 bg-orange-500/10' 
                            : 'border-white/20 bg-transparent'
                        }`}
                      >
                        <div className={`h-3.5 w-3.5 mt-0.5 rounded-full border-2 flex items-center justify-center ${
                          formData.verificationType === 'spot' ? 'border-orange-500' : 'border-muted-foreground'
                        }`}>
                          {formData.verificationType === 'spot' && (
                            <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="h-3.5 w-3.5 text-orange-500" />
                            <span className="text-xs font-semibold">Spot Verification</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            After online registration, teams must visit institution for physical ID verification. Teams not verified by deadline will be auto-eliminated (NO REFUND).
                          </p>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  {/* Full Address for Spot Verification */}
                  {formData.verificationType === 'spot' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-orange-500" />
                        Full Verification Address *
                      </Label>
                      <Textarea
                        placeholder="Enter complete address where teams will come for physical verification (e.g., Building Name, Street, Landmark, City, Pincode)"
                        value={formData.fullAddress}
                        onChange={(e) => setFormData(prev => ({ ...prev, fullAddress: e.target.value }))}
                        className="text-xs min-h-[70px] resize-none"
                      />
                      <p className="text-[9px] text-orange-400">
                        ⚠️ Teams that fail to verify by registration deadline will be automatically eliminated. No refunds for unverified teams.
                      </p>
                    </div>
                  )}
                  
                  <Button
                    className="w-full h-8 text-xs" 
                    onClick={() => validateStep(1) && setStep(2)}
                  >
                    Next <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Organizer Info */}
            {step === 2 && (
              <Card className="border-border/40">
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="flex items-center gap-1.5 text-xs">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    Organizer Information
                  </CardTitle>
                  <CardDescription className="text-[10px]">Your contact details for coordination</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 px-3 pb-3">
                  <div>
                    <Label className="text-xs">Your Name *</Label>
                    <Input
                      placeholder="John Doe"
                      value={formData.organizerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, organizerName: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs">Primary Phone *</Label>
                    <Input
                      placeholder="9876543210"
                      maxLength={10}
                      value={formData.primaryPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, primaryPhone: e.target.value.replace(/\D/g, '') }))}
                      className="h-8 text-xs"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs">Alternate Phone (Optional)</Label>
                    <Input
                      placeholder="9876543211"
                      maxLength={10}
                      value={formData.alternatePhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, alternatePhone: e.target.value.replace(/\D/g, '') }))}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 h-8 text-xs" onClick={() => setStep(1)}>
                      <ArrowLeft className="h-3 w-3 mr-1" /> Back
                    </Button>
                    <Button className="flex-1 h-8 text-xs" onClick={() => validateStep(2) && setStep(3)}>
                      Next <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Tournament Config */}
            {step === 3 && (
              <div className="space-y-3">
                <Card className="border-border/40">
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="flex items-center gap-1.5 text-xs">
                      <Gamepad2 className="h-3.5 w-3.5 text-primary" />
                      Tournament Configuration
                    </CardTitle>
                    <CardDescription className="text-[10px]">Setup your tournament details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 px-3 pb-3">
                    <div>
                      <Label className="text-xs">Tournament Name *</Label>
                      <Input
                        placeholder="Inter-School BGMI Championship 2026"
                        value={formData.tournamentName}
                        onChange={(e) => setFormData(prev => ({ ...prev, tournamentName: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs">Select Game *</Label>
                      <RadioGroup
                        value={formData.game}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, game: value as 'BGMI' | 'Free Fire' }))}
                        className="grid grid-cols-2 gap-2 mt-1.5"
                      >
                        <Label
                          className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer ${
                            formData.game === 'BGMI' ? 'border-primary bg-primary/10' : 'border-muted'
                          }`}
                        >
                          <RadioGroupItem value="BGMI" className="h-3 w-3" />
                          <div>
                            <p className="text-xs font-medium">BGMI</p>
                            <p className="text-[10px] text-muted-foreground">100 players/room</p>
                          </div>
                        </Label>
                        <Label
                          className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer ${
                            formData.game === 'Free Fire' ? 'border-primary bg-primary/10' : 'border-muted'
                          }`}
                        >
                          <RadioGroupItem value="Free Fire" className="h-3 w-3" />
                          <div>
                            <p className="text-xs font-medium">Free Fire</p>
                            <p className="text-[10px] text-muted-foreground">50 players/room</p>
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
                        value={formData.maxPlayers}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxPlayers: parseInt(e.target.value) || 400 }))}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Entry Type *</Label>
                      <RadioGroup
                        value={formData.entryType}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, entryType: value as 'free' | 'paid' }))}
                        className="grid grid-cols-2 gap-2 mt-1.5"
                      >
                        <Label
                          className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer ${
                            formData.entryType === 'free' ? 'border-primary bg-primary/10' : 'border-muted'
                          }`}
                        >
                          <RadioGroupItem value="free" className="h-3 w-3" />
                          <div>
                            <p className="text-xs font-medium">Free Entry</p>
                            <p className="text-[10px] text-muted-foreground">No registration fee</p>
                          </div>
                        </Label>
                        <Label
                          className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer ${
                            formData.entryType === 'paid' ? 'border-primary bg-primary/10' : 'border-muted'
                          }`}
                        >
                          <RadioGroupItem value="paid" className="h-3 w-3" />
                          <div>
                            <p className="text-xs font-medium">Paid Entry</p>
                            <p className="text-[10px] text-muted-foreground">Per team fee</p>
                          </div>
                        </Label>
                      </RadioGroup>
                    </div>

                    {formData.entryType === 'paid' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Entry Fee (₹/team) *</Label>
                          <Input
                            type="number"
                            min={10}
                            value={formData.entryFee}
                            onChange={(e) => setFormData(prev => ({ ...prev, entryFee: parseInt(e.target.value) || 0 }))}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Prize Pool (₹)</Label>
                          <Input
                            type="number"
                            value={formData.prizePool}
                            onChange={(e) => setFormData(prev => ({ ...prev, prizePool: parseInt(e.target.value) || 0 }))}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Tournament Date *</Label>
                        <Input
                          type="datetime-local"
                          value={formData.tournamentDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, tournamentDate: e.target.value }))}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Registration Deadline *</Label>
                        <Input
                          type="datetime-local"
                          value={formData.registrationDeadline}
                          onChange={(e) => setFormData(prev => ({ ...prev, registrationDeadline: e.target.value }))}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tournament Structure Preview */}
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="pb-1.5 pt-2.5 px-3">
                    <CardTitle className="text-[10px] flex items-center gap-1.5">
                      <Info className="h-3 w-3" />
                      Auto-Calculated Structure
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-2.5">
                    <div className="grid grid-cols-4 gap-2">
                      <div className="bg-card p-2 rounded-lg text-center">
                        <p className="text-[10px] text-muted-foreground">Teams</p>
                        <p className="font-bold text-sm">{structure.totalTeams}</p>
                      </div>
                      <div className="bg-card p-2 rounded-lg text-center">
                        <p className="text-[10px] text-muted-foreground">Rooms</p>
                        <p className="font-bold text-sm">{structure.initialRooms}</p>
                      </div>
                      <div className="bg-card p-2 rounded-lg text-center">
                        <p className="text-[10px] text-muted-foreground">Rounds</p>
                        <p className="font-bold text-sm">{structure.totalRounds}</p>
                      </div>
                      <div className="bg-card p-2 rounded-lg text-center">
                        <p className="text-[10px] text-muted-foreground">Finale</p>
                        <p className="font-bold text-sm">{structure.finaleTeams}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      <Trophy className="h-2.5 w-2.5 inline mr-0.5" />
                      Top 1 team from each room advances
                    </p>
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 h-8 text-xs" onClick={() => setStep(2)}>
                    <ArrowLeft className="h-3 w-3 mr-1" /> Back
                  </Button>
                  <Button 
                    className="flex-1 h-8 text-xs" 
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Submitting...</>
                    ) : (
                      <><CheckCircle className="h-3 w-3 mr-1" /> Submit</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="mt-3">
            {applications.length === 0 ? (
              <Card className="text-center py-6">
                <CardContent>
                  <School className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">No applications yet</p>
                  <Button className="mt-3 h-7 text-xs" onClick={() => setActiveTab('apply')}>
                    Apply Now
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {applications.map((app) => (
                  <Card key={app.id} className="border-border/40">
                    <CardContent className="p-2.5">
                      <div className="flex justify-between items-start mb-1.5">
                        <div>
                          <h3 className="text-xs font-semibold">{app.tournament_name}</h3>
                          <p className="text-[10px] text-muted-foreground">{app.school_name}</p>
                        </div>
                        <Badge variant={
                          app.status === 'approved' ? 'default' :
                          app.status === 'rejected' ? 'destructive' : 'secondary'
                        } className="text-[10px] px-1.5 py-0">
                          {app.status === 'approved' && <CheckCircle className="h-2.5 w-2.5 mr-0.5" />}
                          {app.status === 'rejected' && <XCircle className="h-2.5 w-2.5 mr-0.5" />}
                          {app.status === 'pending' && <Clock className="h-2.5 w-2.5 mr-0.5" />}
                          {app.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Gamepad2 className="h-2.5 w-2.5" /> {app.game}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Users className="h-2.5 w-2.5" /> {app.max_players}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Calendar className="h-2.5 w-2.5" /> 
                          {new Date(app.tournament_date).toLocaleDateString()}
                        </span>
                      </div>

                      {app.rejection_reason && (
                        <div className="mt-1.5 p-1.5 bg-destructive/10 border border-destructive/20 rounded text-[10px] text-destructive">
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
              <Card className="text-center py-6">
                <CardContent>
                  <Trophy className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">No active tournaments</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Submit an application and wait for approval
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {tournaments.map((tournament) => (
                  <Card key={tournament.id} className="overflow-hidden border-border/40">
                    <CardContent className="p-2.5">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-xs font-semibold">{tournament.tournament_name}</h3>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5" /> {tournament.school_name}
                          </p>
                        </div>
                        <Badge variant={
                          tournament.status === 'registration' ? 'secondary' :
                          tournament.status === 'completed' ? 'default' :
                          tournament.status === 'cancelled' ? 'destructive' : 'default'
                        } className="text-[10px] px-1.5 py-0">
                          {tournament.status}
                        </Badge>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-1.5 mb-2">
                        <div className="text-center p-1.5 bg-muted rounded">
                          <p className="text-sm font-bold">{tournament.current_players}</p>
                          <p className="text-[10px] text-muted-foreground">Players</p>
                        </div>
                        <div className="text-center p-1.5 bg-muted rounded">
                          <p className="text-sm font-bold">{tournament.total_rooms}</p>
                          <p className="text-[10px] text-muted-foreground">Rooms</p>
                        </div>
                        <div className="text-center p-1.5 bg-muted rounded">
                          <p className="text-sm font-bold">{tournament.current_round}/{tournament.total_rounds}</p>
                          <p className="text-[10px] text-muted-foreground">Round</p>
                        </div>
                      </div>

                      {/* Private Code */}
                      <div className="flex items-center justify-between p-1.5 bg-primary/10 rounded-lg mb-2">
                        <div className="flex items-center gap-1.5">
                          <QrCode className="h-3 w-3 text-primary" />
                          <span className="text-xs font-mono font-bold">{tournament.private_code}</span>
                        </div>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => {
                          navigator.clipboard.writeText(`Join Code: ${tournament.private_code}`);
                          toast.success('Code copied!');
                        }}>
                          <Share2 className="h-3 w-3" />
                        </Button>
                      </div>

                      {tournament.entry_type === 'paid' && (
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="text-muted-foreground">Collected</span>
                          <span className="font-bold text-green-500">
                            <IndianRupee className="h-2.5 w-2.5 inline" />
                            {tournament.total_collected}
                          </span>
                        </div>
                      )}

                      <Button 
                        className="w-full h-7 text-xs" 
                        onClick={() => navigate(`/school-tournament/${tournament.id}`)}
                      >
                        <Eye className="h-3 w-3 mr-1" /> Manage Tournament
                      </Button>
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
