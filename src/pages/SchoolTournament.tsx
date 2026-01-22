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
  Upload,
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
  Eye
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
    schoolImage: null as File | null,
    schoolImageUrl: '',
    
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }
    
    setFormData(prev => ({ ...prev, schoolImage: file }));
    
    // Upload to storage
    const fileName = `school-images/${user!.id}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file);
    
    if (error) {
      toast.error('Failed to upload image');
      return;
    }
    
    const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(fileName);
    setFormData(prev => ({ ...prev, schoolImageUrl: publicUrl.publicUrl }));
    toast.success('Image uploaded!');
  };

  const validateStep = (stepNum: number): boolean => {
    switch (stepNum) {
      case 1:
        if (!formData.schoolName || !formData.schoolCity || !formData.schoolState || !formData.schoolDistrict) {
          toast.error('Please fill all school details');
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
        school_image_url: formData.schoolImageUrl || null,
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
      });

      if (error) throw error;

      toast.success('Application submitted! Admin will review shortly.');
      setStep(1);
      setFormData({
        schoolName: '',
        schoolCity: '',
        schoolState: '',
        schoolDistrict: '',
        schoolImage: null,
        schoolImageUrl: '',
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
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold">Private Tournament</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-10">
            Organize tournaments for schools, colleges & private events
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4 mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="apply">Apply</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
          </TabsList>

          {/* Apply Tab - Multi-Step Form */}
          <TabsContent value="apply" className="mt-4">
            {/* Progress */}
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Step {step} of 3</span>
                <span className="text-sm text-muted-foreground">
                  {step === 1 ? 'School Details' : step === 2 ? 'Organizer Info' : 'Tournament Config'}
                </span>
              </div>
              <Progress value={(step / 3) * 100} className="h-2" />
            </div>

            {/* Step 1: School Details */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <School className="h-5 w-5 text-primary" />
                    School/College Details
                  </CardTitle>
                  <CardDescription>Enter your institution information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Institution Name *</Label>
                    <Input
                      placeholder="ABC Public School"
                      value={formData.schoolName}
                      onChange={(e) => setFormData(prev => ({ ...prev, schoolName: e.target.value }))}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>City *</Label>
                      <Input
                        placeholder="Mumbai"
                        value={formData.schoolCity}
                        onChange={(e) => setFormData(prev => ({ ...prev, schoolCity: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>District *</Label>
                      <Input
                        placeholder="Mumbai Suburban"
                        value={formData.schoolDistrict}
                        onChange={(e) => setFormData(prev => ({ ...prev, schoolDistrict: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>State *</Label>
                    <Select
                      value={formData.schoolState}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, schoolState: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDIAN_STATES.map(state => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>School Photo (Optional)</Label>
                    <div className="mt-2">
                      {formData.schoolImageUrl ? (
                        <div className="relative">
                          <img 
                            src={formData.schoolImageUrl} 
                            alt="School" 
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-2 right-2"
                            onClick={() => setFormData(prev => ({ ...prev, schoolImage: null, schoolImageUrl: '' }))}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50">
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground mt-2">Upload Image</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                      )}
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={() => validateStep(1) && setStep(2)}
                  >
                    Next <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Organizer Info */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-primary" />
                    Organizer Information
                  </CardTitle>
                  <CardDescription>Your contact details for coordination</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Your Name *</Label>
                    <Input
                      placeholder="John Doe"
                      value={formData.organizerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, organizerName: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label>Primary Phone *</Label>
                    <Input
                      placeholder="9876543210"
                      maxLength={10}
                      value={formData.primaryPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, primaryPhone: e.target.value.replace(/\D/g, '') }))}
                    />
                  </div>
                  
                  <div>
                    <Label>Alternate Phone (Optional)</Label>
                    <Input
                      placeholder="9876543211"
                      maxLength={10}
                      value={formData.alternatePhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, alternatePhone: e.target.value.replace(/\D/g, '') }))}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                      <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                    <Button className="flex-1" onClick={() => validateStep(2) && setStep(3)}>
                      Next <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Tournament Config */}
            {step === 3 && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gamepad2 className="h-5 w-5 text-primary" />
                      Tournament Configuration
                    </CardTitle>
                    <CardDescription>Setup your tournament details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Tournament Name *</Label>
                      <Input
                        placeholder="Inter-School BGMI Championship 2026"
                        value={formData.tournamentName}
                        onChange={(e) => setFormData(prev => ({ ...prev, tournamentName: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label>Select Game *</Label>
                      <RadioGroup
                        value={formData.game}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, game: value as 'BGMI' | 'Free Fire' }))}
                        className="grid grid-cols-2 gap-4 mt-2"
                      >
                        <Label
                          className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer ${
                            formData.game === 'BGMI' ? 'border-primary bg-primary/10' : 'border-muted'
                          }`}
                        >
                          <RadioGroupItem value="BGMI" />
                          <div>
                            <p className="font-medium">BGMI</p>
                            <p className="text-xs text-muted-foreground">100 players/room</p>
                          </div>
                        </Label>
                        <Label
                          className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer ${
                            formData.game === 'Free Fire' ? 'border-primary bg-primary/10' : 'border-muted'
                          }`}
                        >
                          <RadioGroupItem value="Free Fire" />
                          <div>
                            <p className="font-medium">Free Fire</p>
                            <p className="text-xs text-muted-foreground">50 players/room</p>
                          </div>
                        </Label>
                      </RadioGroup>
                    </div>
                    
                    <div>
                      <Label>Maximum Players * (100 - 10,000)</Label>
                      <Input
                        type="number"
                        min={100}
                        max={10000}
                        step={100}
                        value={formData.maxPlayers}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxPlayers: parseInt(e.target.value) || 400 }))}
                      />
                    </div>

                    <div>
                      <Label>Entry Type *</Label>
                      <RadioGroup
                        value={formData.entryType}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, entryType: value as 'free' | 'paid' }))}
                        className="grid grid-cols-2 gap-4 mt-2"
                      >
                        <Label
                          className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer ${
                            formData.entryType === 'free' ? 'border-primary bg-primary/10' : 'border-muted'
                          }`}
                        >
                          <RadioGroupItem value="free" />
                          <div>
                            <p className="font-medium">Free Entry</p>
                            <p className="text-xs text-muted-foreground">No registration fee</p>
                          </div>
                        </Label>
                        <Label
                          className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer ${
                            formData.entryType === 'paid' ? 'border-primary bg-primary/10' : 'border-muted'
                          }`}
                        >
                          <RadioGroupItem value="paid" />
                          <div>
                            <p className="font-medium">Paid Entry</p>
                            <p className="text-xs text-muted-foreground">Per team fee</p>
                          </div>
                        </Label>
                      </RadioGroup>
                    </div>

                    {formData.entryType === 'paid' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Entry Fee (₹/team) *</Label>
                          <Input
                            type="number"
                            min={10}
                            value={formData.entryFee}
                            onChange={(e) => setFormData(prev => ({ ...prev, entryFee: parseInt(e.target.value) || 0 }))}
                          />
                        </div>
                        <div>
                          <Label>Prize Pool (₹)</Label>
                          <Input
                            type="number"
                            value={formData.prizePool}
                            onChange={(e) => setFormData(prev => ({ ...prev, prizePool: parseInt(e.target.value) || 0 }))}
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Tournament Date *</Label>
                        <Input
                          type="datetime-local"
                          value={formData.tournamentDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, tournamentDate: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Registration Deadline *</Label>
                        <Input
                          type="datetime-local"
                          value={formData.registrationDeadline}
                          onChange={(e) => setFormData(prev => ({ ...prev, registrationDeadline: e.target.value }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tournament Structure Preview */}
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Auto-Calculated Structure
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-card p-3 rounded-lg">
                        <p className="text-muted-foreground">Total Teams</p>
                        <p className="font-bold text-lg">{structure.totalTeams}</p>
                      </div>
                      <div className="bg-card p-3 rounded-lg">
                        <p className="text-muted-foreground">Initial Rooms</p>
                        <p className="font-bold text-lg">{structure.initialRooms}</p>
                      </div>
                      <div className="bg-card p-3 rounded-lg">
                        <p className="text-muted-foreground">Total Rounds</p>
                        <p className="font-bold text-lg">{structure.totalRounds}</p>
                      </div>
                      <div className="bg-card p-3 rounded-lg">
                        <p className="text-muted-foreground">Finale Teams</p>
                        <p className="font-bold text-lg">{structure.finaleTeams}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      <Trophy className="h-3 w-3 inline mr-1" />
                      Top 1 team from each room advances to next round
                    </p>
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
                    ) : (
                      <><CheckCircle className="h-4 w-4 mr-2" /> Submit for Approval</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="mt-4">
            {applications.length === 0 ? (
              <Card className="text-center py-8">
                <CardContent>
                  <School className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No applications yet</p>
                  <Button className="mt-4" onClick={() => setActiveTab('apply')}>
                    Apply Now
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => (
                  <Card key={app.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{app.tournament_name}</h3>
                          <p className="text-sm text-muted-foreground">{app.school_name}</p>
                        </div>
                        <Badge variant={
                          app.status === 'approved' ? 'default' :
                          app.status === 'rejected' ? 'destructive' : 'secondary'
                        }>
                          {app.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {app.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                          {app.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                          {app.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Gamepad2 className="h-3 w-3" /> {app.game}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {app.max_players} players
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> 
                          {new Date(app.tournament_date).toLocaleDateString()}
                        </span>
                      </div>

                      {app.rejection_reason && (
                        <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
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
          <TabsContent value="tournaments" className="mt-4">
            {tournaments.length === 0 ? (
              <Card className="text-center py-8">
                <CardContent>
                  <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No active tournaments</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Submit an application and wait for approval
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {tournaments.map((tournament) => (
                  <Card key={tournament.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold">{tournament.tournament_name}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {tournament.school_name}
                          </p>
                        </div>
                        <Badge variant={
                          tournament.status === 'registration' ? 'secondary' :
                          tournament.status === 'completed' ? 'default' :
                          tournament.status === 'cancelled' ? 'destructive' : 'default'
                        }>
                          {tournament.status}
                        </Badge>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="text-center p-2 bg-muted rounded">
                          <p className="text-lg font-bold">{tournament.current_players}</p>
                          <p className="text-xs text-muted-foreground">Players</p>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <p className="text-lg font-bold">{tournament.total_rooms}</p>
                          <p className="text-xs text-muted-foreground">Rooms</p>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <p className="text-lg font-bold">{tournament.current_round}/{tournament.total_rounds}</p>
                          <p className="text-xs text-muted-foreground">Round</p>
                        </div>
                      </div>

                      {/* Private Code */}
                      <div className="flex items-center justify-between p-2 bg-primary/10 rounded-lg mb-3">
                        <div className="flex items-center gap-2">
                          <QrCode className="h-4 w-4 text-primary" />
                          <span className="text-sm font-mono font-bold">{tournament.private_code}</span>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => {
                          navigator.clipboard.writeText(`Join Code: ${tournament.private_code}`);
                          toast.success('Code copied!');
                        }}>
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {tournament.entry_type === 'paid' && (
                        <div className="flex items-center justify-between text-sm mb-3">
                          <span className="text-muted-foreground">Collected</span>
                          <span className="font-bold text-green-500">
                            <IndianRupee className="h-3 w-3 inline" />
                            {tournament.total_collected}
                          </span>
                        </div>
                      )}

                      <Button 
                        className="w-full" 
                        onClick={() => navigate(`/school-tournament/${tournament.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" /> Manage Tournament
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
