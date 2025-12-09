import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Upload, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const Payment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const amount = parseFloat(searchParams.get('amount') || '0');
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [timeLeft, setTimeLeft] = useState(7 * 60); // 7 minutes in seconds
  const [copied, setCopied] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [adminUpiId, setAdminUpiId] = useState('abbishekvyuha@fam');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!amount || amount <= 0) {
      navigate('/wallet');
      return;
    }
    fetchPaymentSettings();
  }, [amount, navigate]);

  useEffect(() => {
    if (timeLeft <= 0) {
      toast({
        title: 'Time Expired',
        description: 'Payment session has expired. Please try again.',
        variant: 'destructive',
      });
      navigate('/wallet');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, navigate, toast]);

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

      // Upload screenshot if provided
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

      // Create deposit transaction
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/wallet')}
            className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Make Payment</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Amount Display */}
        <div className="bg-gradient-to-br from-primary to-orange-400 rounded-xl p-4 text-center text-primary-foreground">
          <p className="text-sm opacity-90">Amount to Pay</p>
          <p className="text-3xl font-bold">₹{amount}</p>
        </div>

        {/* Timer */}
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive font-medium">Time Remaining</span>
          </div>
          <p className={`text-2xl font-bold font-mono ${timeLeft < 60 ? 'text-destructive animate-pulse' : 'text-destructive'}`}>
            {formatTime(timeLeft)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Please complete payment before timer ends
          </p>
        </div>

        {/* QR Code */}
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <p className="text-sm font-medium text-foreground mb-4">Scan QR Code to Pay</p>
          <div className="w-48 h-48 mx-auto bg-muted rounded-lg flex items-center justify-center overflow-hidden">
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="Payment QR Code" className="w-full h-full object-contain" />
            ) : (
              <div className="text-center p-4">
                <p className="text-xs text-muted-foreground">QR Code not configured</p>
                <p className="text-xs text-muted-foreground mt-1">Use UPI ID below</p>
              </div>
            )}
          </div>
        </div>

        {/* UPI ID */}
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-medium text-foreground mb-2">Or pay using UPI ID</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono text-sm">
              {adminUpiId}
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={copyUpiId}
              className="shrink-0"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Verification Form */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <h3 className="font-semibold text-foreground">Payment Verification</h3>

          <div className="space-y-2">
            <Label className="text-sm">UTR / Reference Number *</Label>
            <Input
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              placeholder="Enter 12-digit UTR number"
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              Find this in your UPI app payment history
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Upload Screenshot (Optional)</Label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
            >
              {screenshot ? (
                <div className="flex items-center justify-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-foreground">{screenshot.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Tap to upload payment screenshot</p>
                </>
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
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Payment Details'
          )}
        </Button>
      </div>
    </div>
  );
};

export default Payment;
