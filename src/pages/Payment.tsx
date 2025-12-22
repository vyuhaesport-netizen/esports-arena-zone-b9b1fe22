import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Upload, Loader2, Clock, QrCode, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Audio context for countdown sounds
const createBeepSound = (frequency: number, duration: number, volume: number = 0.3) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gainNode.gain.value = volume;
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration / 1000);
    
    return true;
  } catch (e) {
    return false;
  }
};

const Payment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const amount = parseFloat(searchParams.get('amount') || '0');
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [timeLeft, setTimeLeft] = useState(7 * 60);
  const [copied, setCopied] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [adminUpiId, setAdminUpiId] = useState('abbishekvyuha@fam');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastBeepTimeRef = useRef<number>(0);

  // Play urgency sounds based on time remaining
  const playUrgencySound = useCallback((seconds: number) => {
    if (!soundEnabled) return;
    
    const now = Date.now();
    if (now - lastBeepTimeRef.current < 900) return; // Prevent overlapping sounds
    
    // Critical: Last 10 seconds - rapid beeps
    if (seconds <= 10 && seconds > 0) {
      createBeepSound(880, 100, 0.4); // High pitch, short
      lastBeepTimeRef.current = now;
    }
    // Warning: Last 30 seconds - beep every second
    else if (seconds <= 30 && seconds > 10) {
      createBeepSound(660, 150, 0.3);
      lastBeepTimeRef.current = now;
    }
    // Caution: Last minute - beep every 10 seconds
    else if (seconds <= 60 && seconds % 10 === 0) {
      createBeepSound(440, 200, 0.2);
      lastBeepTimeRef.current = now;
    }
    // Alert at specific intervals
    else if (seconds === 120 || seconds === 180 || seconds === 300) {
      createBeepSound(520, 300, 0.25);
      lastBeepTimeRef.current = now;
    }
  }, [soundEnabled]);

  useEffect(() => {
    if (!amount || amount <= 0) {
      navigate('/wallet');
      return;
    }
    fetchPaymentSettings();
  }, [amount, navigate]);

  useEffect(() => {
    if (timeLeft <= 0) {
      // Play final alarm
      createBeepSound(220, 500, 0.5);
      toast({
        title: 'Time Expired',
        description: 'Payment session has expired. Please try again.',
        variant: 'destructive',
      });
      navigate('/wallet');
      return;
    }

    // Play urgency sound
    playUrgencySound(timeLeft);

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, navigate, toast, playUrgencySound]);

  const fetchPaymentSettings = async () => {
    try {
      const { data } = await supabase
        .from('platform_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['admin_upi_id', 'payment_qr_url']);

      data?.forEach((s) => {
        if (s.setting_key === 'admin_upi_id' && s.setting_value) {
          setAdminUpiId(s.setting_value);
        }
        if (s.setting_key === 'payment_qr_url' && s.setting_value) {
          setQrCodeUrl(s.setting_value);
        }
      });
    } catch (error) {
      console.error('Error fetching payment settings:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText(adminUpiId);
    setCopied(true);
    toast({ title: 'Copied!', description: 'UPI ID copied to clipboard.' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Maximum file size is 5MB',
          variant: 'destructive',
        });
        return;
      }
      setScreenshot(file);
    }
  };

  const handleSubmit = async () => {
    if (!utrNumber.trim()) {
      toast({
        title: 'UTR Required',
        description: 'Please enter the UTR/Reference number',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Error',
        description: 'Please login to continue',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      let screenshotUrl = null;

      if (screenshot) {
        const fileExt = screenshot.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('payment-screenshots')
          .upload(filePath, screenshot);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('payment-screenshots')
          .getPublicUrl(filePath);

        screenshotUrl = urlData.publicUrl;
      }

      const { error } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user.id,
          type: 'deposit',
          amount: amount,
          status: 'pending',
          description: `Deposit via UPI`,
          utr_number: utrNumber.trim(),
          screenshot_url: screenshotUrl,
        });

      if (error) throw error;

      toast({
        title: 'Request Submitted',
        description: 'Deposit request submitted. Waiting for admin approval.',
      });

      navigate('/wallet');
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isUrgent = timeLeft < 60;
  const isCritical = timeLeft <= 30;
  const isVeryLow = timeLeft <= 10;

  return (
    <div className={`min-h-screen bg-background ${isCritical ? 'animate-pulse' : ''}`}>
      {/* Urgency Overlay for Critical Time */}
      {isCritical && (
        <div className="fixed inset-0 pointer-events-none z-40 bg-destructive/5 animate-pulse" />
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b-2 border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/wallet')}
              className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors border border-border"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Pay ₹{amount}</h1>
              <p className="text-xs text-muted-foreground">Secure UPI Payment</p>
            </div>
          </div>
          
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg hover:bg-muted border border-border text-xs"
            title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-5">
        
        {/* Countdown Timer Card - Same style as QR Card */}
        <div className={`bg-card border-2 rounded-xl overflow-hidden shadow-sm ${
          isCritical ? 'border-destructive' : 'border-border'
        }`}>
          <div className={`px-4 py-3 border-b ${
            isCritical 
              ? 'bg-destructive text-destructive-foreground border-destructive' 
              : 'bg-destructive/90 text-destructive-foreground border-destructive/50'
          }`}>
            <div className="flex items-center justify-center gap-2">
              {isCritical ? (
                <AlertTriangle className={`h-5 w-5 ${isVeryLow ? 'animate-ping' : 'animate-pulse'}`} />
              ) : (
                <Clock className="h-5 w-5" />
              )}
              <span className="font-semibold">
                {isVeryLow ? '⚠️ HURRY UP!' : isCritical ? '⏰ Almost Expired!' : isUrgent ? '⏱️ Time Running Low' : '⏱️ Time Remaining'}
              </span>
            </div>
          </div>
          
          <div className="p-6 flex flex-col items-center bg-destructive/5">
            {/* Large Timer Display */}
            <div className={`font-mono font-black text-5xl tracking-wider text-destructive ${isVeryLow ? 'animate-pulse' : ''}`}>
              {formatTime(timeLeft)}
            </div>
            
            {/* Progress bar */}
            <div className="w-full mt-4 h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 rounded-full ${
                  isVeryLow ? 'bg-destructive animate-pulse' : isCritical ? 'bg-destructive' : 'bg-destructive/80'
                }`}
                style={{ width: `${(timeLeft / (7 * 60)) * 100}%` }}
              />
            </div>
            
            <p className="text-sm text-muted-foreground mt-3 text-center">
              Complete your payment before the timer expires
            </p>
          </div>
        </div>
        
        {/* QR Code Section - Hero */}
        <div className="bg-card border-2 border-border rounded-xl overflow-hidden shadow-sm">
          <div className="bg-secondary/50 px-4 py-3 border-b border-border">
            <div className="flex items-center justify-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Scan & Pay ₹{amount}</span>
            </div>
          </div>
          
          <div className="p-6 flex flex-col items-center">
            {/* Large QR Code */}
            <div className="w-72 h-72 bg-card border-2 border-border rounded-xl p-3 shadow-xs">
              {qrCodeUrl ? (
                <img 
                  src={qrCodeUrl} 
                  alt="Payment QR Code" 
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-muted rounded-lg">
                  <QrCode className="h-16 w-16 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground text-center">QR not available</p>
                  <p className="text-xs text-muted-foreground">Use UPI ID below</p>
                </div>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Open any UPI app and scan this QR code
            </p>
          </div>
        </div>

        {/* UPI ID Section */}
        <div className="bg-card border-2 border-border rounded-xl p-4">
          <p className="text-sm font-medium text-muted-foreground mb-3 text-center">Or copy UPI ID</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-secondary rounded-lg px-4 py-3 font-mono text-sm text-foreground border border-border text-center font-medium">
              {adminUpiId}
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={copyUpiId}
              className="shrink-0 h-12 w-12 border-2"
            >
              {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-border"></div>
          <span className="text-sm font-medium text-muted-foreground">After Payment</span>
          <div className="flex-1 h-px bg-border"></div>
        </div>

        {/* UTR Input - Prominent */}
        <div className="bg-card border-2 border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-foreground">Verify Payment</h3>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">UTR / Reference Number *</Label>
            <Input
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              placeholder="Enter 12-digit UTR number"
              className="bg-background h-14 text-lg font-mono border-2 text-center tracking-wider"
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground text-center">
              Find this in your UPI app → Payment History → Transaction Details
            </p>
          </div>

          {/* Screenshot Upload */}
          <div className="space-y-2 pt-2">
            <Label className="text-sm font-medium text-muted-foreground">Screenshot (Optional)</Label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
                screenshot 
                  ? 'border-green-500 bg-green-500/5' 
                  : 'border-border hover:border-primary hover:bg-muted/50'
              }`}
            >
              {screenshot ? (
                <div className="flex items-center justify-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-foreground">{screenshot.name}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Tap to upload screenshot</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={submitting || !utrNumber.trim()}
          className="w-full h-14 text-lg font-bold border-2 border-border shadow-xs hover:shadow-none transition-all"
          size="lg"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            'Submit Payment'
          )}
        </Button>

        {/* Footer Note */}
        <p className="text-xs text-muted-foreground text-center pb-4">
          Your deposit will be credited within 5-10 minutes after verification
        </p>
      </div>
    </div>
  );
};

export default Payment;
