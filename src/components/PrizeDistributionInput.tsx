import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Trophy, AlertCircle } from 'lucide-react';

interface PrizeDistributionInputProps {
  value: string;
  onChange: (value: string) => void;
  prizePool: number;
}

interface PrizeEntry {
  position: number;
  amount: number;
}

const MAX_POSITIONS = 10;

const PrizeDistributionInput = ({ value, onChange, prizePool }: PrizeDistributionInputProps) => {
  const [prizes, setPrizes] = useState<PrizeEntry[]>([
    { position: 1, amount: 0 },
    { position: 2, amount: 0 },
    { position: 3, amount: 0 },
    { position: 4, amount: 0 },
    { position: 5, amount: 0 },
  ]);

  // Parse initial value - handle both old percentage format and new amount format
  useEffect(() => {
    if (value) {
      try {
        const parsed = JSON.parse(value);
        const entries: PrizeEntry[] = Object.entries(parsed).map(([pos, amt]) => ({
          position: parseInt(pos),
          amount: typeof amt === 'number' ? amt : parseFloat(amt as string) || 0,
        })).sort((a, b) => a.position - b.position);
        
        if (entries.length > 0) {
          setPrizes(entries);
        }
      } catch {
        // Keep default values if parsing fails
      }
    }
  }, []);

  // Update parent value when prizes change
  const updateValue = (newPrizes: PrizeEntry[]) => {
    setPrizes(newPrizes);
    const obj: Record<string, number> = {};
    newPrizes.forEach(p => {
      obj[p.position.toString()] = p.amount;
    });
    onChange(JSON.stringify(obj));
  };

  const handleAmountChange = (index: number, amount: string) => {
    const newPrizes = [...prizes];
    newPrizes[index].amount = parseFloat(amount) || 0;
    updateValue(newPrizes);
  };

  const addPosition = () => {
    if (prizes.length >= MAX_POSITIONS) return;
    const nextPosition = prizes.length > 0 ? Math.max(...prizes.map(p => p.position)) + 1 : 1;
    updateValue([...prizes, { position: nextPosition, amount: 0 }]);
  };

  const removePosition = (index: number) => {
    if (prizes.length <= 1) return;
    const newPrizes = prizes.filter((_, i) => i !== index);
    updateValue(newPrizes);
  };

  const totalAmount = prizes.reduce((sum, p) => sum + p.amount, 0);
  const isExactMatch = totalAmount === prizePool;
  const isExceeding = totalAmount > prizePool;
  const isUnder = totalAmount < prizePool && totalAmount > 0;

  const getPositionLabel = (pos: number) => {
    if (pos === 1) return '1st';
    if (pos === 2) return '2nd';
    if (pos === 3) return '3rd';
    return `${pos}th`;
  };

  const getPositionEmoji = (pos: number) => {
    if (pos === 1) return '🥇';
    if (pos === 2) return '🥈';
    if (pos === 3) return '🥉';
    return '🏅';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          Prize Distribution (₹ amounts)
        </Label>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={addPosition}
          disabled={prizes.length >= MAX_POSITIONS}
        >
          <Plus className="h-3 w-3 mr-1" /> Add Position
        </Button>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {prizes.map((prize, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-20 text-sm font-medium text-muted-foreground flex items-center gap-1">
              <span>{getPositionEmoji(prize.position)}</span>
              <span>{getPositionLabel(prize.position)}</span>
            </div>
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
              <Input
                type="number"
                value={prize.amount || ''}
                onChange={(e) => handleAmountChange(index, e.target.value)}
                placeholder="0"
                className="pl-7"
                min="0"
              />
            </div>
            {prizes.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removePosition(index)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Validation Status */}
      <div className={`flex items-center justify-between p-2 rounded-lg ${
        isExactMatch 
          ? 'bg-green-500/10' 
          : isExceeding 
            ? 'bg-destructive/10' 
            : isUnder
              ? 'bg-amber-500/10'
              : 'bg-muted'
      }`}>
        <span className="text-sm font-medium">Total Distribution</span>
        <span className={`text-sm font-bold ${
          isExactMatch 
            ? 'text-green-600' 
            : isExceeding 
              ? 'text-destructive' 
              : isUnder
                ? 'text-amber-600'
                : 'text-muted-foreground'
        }`}>
          ₹{totalAmount.toLocaleString()} / ₹{prizePool.toLocaleString()}
          {isExactMatch && ' ✓'}
          {isExceeding && ' (Exceeds prize pool!)'}
          {isUnder && ` (₹${(prizePool - totalAmount).toLocaleString()} remaining)`}
        </span>
      </div>

      {!isExactMatch && totalAmount > 0 && (
        <div className="flex items-start gap-2 p-2 bg-amber-500/10 rounded-lg">
          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Total distribution should equal the prize pool (₹{prizePool.toLocaleString()}). 
            {isExceeding ? ' Please reduce the amounts.' : ` Add ₹${(prizePool - totalAmount).toLocaleString()} more.`}
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground bg-blue-500/5 p-2 rounded border border-blue-500/20">
        ⓘ Note: Prize amounts may be adjusted automatically if maximum players don't join. 
        The system recalculates 2 minutes before tournament start based on actual participants.
      </p>
    </div>
  );
};

export default PrizeDistributionInput;
