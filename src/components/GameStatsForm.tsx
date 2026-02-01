import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Gamepad2, Target, Swords, Shield, Trophy, Timer } from 'lucide-react';
import { 
  PlayerGameStats, 
  StatsFormData, 
  TIERS, 
  MAPS, 
  MODES,
  usePlayerGameStats 
} from '@/hooks/usePlayerGameStats';

interface GameStatsFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingStats: PlayerGameStats | null;
}

const GameStatsForm = ({ open, onOpenChange, existingStats }: GameStatsFormProps) => {
  const { saveStats, saving } = usePlayerGameStats();
  const [activeTab, setActiveTab] = useState('basic');
  
  const [formData, setFormData] = useState<StatsFormData>({
    game_uid: '',
    in_game_name: '',
    current_tier: 'Bronze V',
    current_level: 1,
    total_kills: 0,
    total_deaths: 0,
    total_matches: 0,
    wins: 0,
    top_10_finishes: 0,
    total_damage: 0,
    highest_damage_single_match: 0,
    headshot_kills: 0,
    accuracy: 0,
    total_survival_time_seconds: 0,
    longest_kill_distance: 0,
    most_kills_single_match: 0,
    preferred_mode: 'squad',
    preferred_map: 'Erangel',
  });

  useEffect(() => {
    if (existingStats) {
      setFormData({
        game_uid: existingStats.game_uid || '',
        in_game_name: existingStats.in_game_name || '',
        current_tier: existingStats.current_tier || 'Bronze V',
        current_level: existingStats.current_level || 1,
        total_kills: existingStats.total_kills || 0,
        total_deaths: existingStats.total_deaths || 0,
        total_matches: existingStats.total_matches || 0,
        wins: existingStats.wins || 0,
        top_10_finishes: existingStats.top_10_finishes || 0,
        total_damage: Number(existingStats.total_damage) || 0,
        highest_damage_single_match: existingStats.highest_damage_single_match || 0,
        headshot_kills: existingStats.headshot_kills || 0,
        accuracy: existingStats.accuracy || 0,
        total_survival_time_seconds: Number(existingStats.total_survival_time_seconds) || 0,
        longest_kill_distance: existingStats.longest_kill_distance || 0,
        most_kills_single_match: existingStats.most_kills_single_match || 0,
        preferred_mode: existingStats.preferred_mode || 'squad',
        preferred_map: existingStats.preferred_map || 'Erangel',
      });
    }
  }, [existingStats]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await saveStats(formData);
    if (success) {
      onOpenChange(false);
    }
  };

  const updateField = (field: keyof StatsFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Glass style for tabs
  const glassStyle = {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.1)',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-primary" />
            Update Game Stats
          </DialogTitle>
          <DialogDescription className="text-xs">
            Enter your latest BGMI stats. Update weekly for accurate growth tracking.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 h-9">
              <TabsTrigger value="basic" className="text-xs gap-1">
                <Gamepad2 className="h-3 w-3" />
                Basic
              </TabsTrigger>
              <TabsTrigger value="combat" className="text-xs gap-1">
                <Swords className="h-3 w-3" />
                Combat
              </TabsTrigger>
              <TabsTrigger value="advanced" className="text-xs gap-1">
                <Trophy className="h-3 w-3" />
                Advanced
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Game UID</Label>
                  <Input
                    placeholder="Your BGMI UID"
                    value={formData.game_uid}
                    onChange={(e) => updateField('game_uid', e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">In-Game Name</Label>
                  <Input
                    placeholder="IGN"
                    value={formData.in_game_name}
                    onChange={(e) => updateField('in_game_name', e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Current Tier</Label>
                  <Select value={formData.current_tier} onValueChange={(v) => updateField('current_tier', v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      {TIERS.map((tier) => (
                        <SelectItem key={tier} value={tier} className="text-sm">
                          {tier}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Account Level</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={formData.current_level}
                    onChange={(e) => updateField('current_level', parseInt(e.target.value) || 1)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Preferred Mode</Label>
                  <Select value={formData.preferred_mode} onValueChange={(v) => updateField('preferred_mode', v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODES.map((mode) => (
                        <SelectItem key={mode} value={mode} className="text-sm capitalize">
                          {mode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Preferred Map</Label>
                  <Select value={formData.preferred_map} onValueChange={(v) => updateField('preferred_map', v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MAPS.map((map) => (
                        <SelectItem key={map} value={map} className="text-sm">
                          {map}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="combat" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Total Kills</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.total_kills}
                    onChange={(e) => updateField('total_kills', parseInt(e.target.value) || 0)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Total Deaths</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.total_deaths}
                    onChange={(e) => updateField('total_deaths', parseInt(e.target.value) || 0)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Total Matches</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.total_matches}
                    onChange={(e) => updateField('total_matches', parseInt(e.target.value) || 0)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Wins (Chicken Dinners)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.wins}
                    onChange={(e) => updateField('wins', parseInt(e.target.value) || 0)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Headshot Kills</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.headshot_kills}
                    onChange={(e) => updateField('headshot_kills', parseInt(e.target.value) || 0)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Top 10 Finishes</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.top_10_finishes}
                    onChange={(e) => updateField('top_10_finishes', parseInt(e.target.value) || 0)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Total Damage</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.total_damage}
                    onChange={(e) => updateField('total_damage', parseInt(e.target.value) || 0)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Highest Damage (Single Match)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.highest_damage_single_match}
                    onChange={(e) => updateField('highest_damage_single_match', parseInt(e.target.value) || 0)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Most Kills (Single Match)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.most_kills_single_match}
                    onChange={(e) => updateField('most_kills_single_match', parseInt(e.target.value) || 0)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Longest Kill (meters)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.longest_kill_distance}
                    onChange={(e) => updateField('longest_kill_distance', parseInt(e.target.value) || 0)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Accuracy %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={formData.accuracy}
                    onChange={(e) => updateField('accuracy', parseFloat(e.target.value) || 0)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Total Survival Time (hours)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    value={(formData.total_survival_time_seconds / 3600).toFixed(1)}
                    onChange={(e) => updateField('total_survival_time_seconds', Math.round(parseFloat(e.target.value || '0') * 3600))}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Stats'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GameStatsForm;
