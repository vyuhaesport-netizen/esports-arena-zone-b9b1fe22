import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScanLine, Upload, Loader2, Keyboard } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TournamentScannerProps {
  onScanSuccess?: (code: string) => void;
}

const TournamentScanner = ({ onScanSuccess }: TournamentScannerProps) => {
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [mode, setMode] = useState<'upload' | 'manual' | null>(null);
  const [manualCode, setManualCode] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleCodeDetected = async (code: string) => {
    // Extract private code from URL or use directly
    let privateCode = code;
    
    // Check if it's a URL with private_code parameter
    try {
      const url = new URL(code);
      const codeParam = url.searchParams.get('code') || url.searchParams.get('private_code');
      if (codeParam) {
        privateCode = codeParam;
      }
    } catch {
      // Not a URL, use as-is (might be just the code)
    }
    
    // Clean up the code
    privateCode = privateCode.trim().toUpperCase();
    
    if (privateCode.length < 4) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter a valid tournament code (at least 4 characters).',
        variant: 'destructive'
      });
      return;
    }
    
    if (onScanSuccess) {
      onScanSuccess(privateCode);
    }
    
    // Navigate to join page with the code
    navigate(`/join-local?code=${privateCode}`);
    setOpen(false);
    setMode(null);
    setManualCode('');
    
    toast({
      title: 'Tournament Found!',
      description: `Joining with code: ${privateCode}`,
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setMode('upload');
    setProcessing(true);
    
    try {
      const html5QrCode = new Html5Qrcode('qr-reader-upload');
      const result = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      handleCodeDetected(result);
    } catch (error) {
      console.error('Error scanning image:', error);
      toast({
        title: 'No QR Code Found',
        description: 'Try another image or enter the code manually.',
        variant: 'destructive'
      });
      setMode(null);
    } finally {
      setProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleManualSubmit = () => {
    if (manualCode.trim().length >= 4) {
      handleCodeDetected(manualCode.trim());
    } else {
      toast({
        title: 'Invalid Code',
        description: 'Please enter at least 4 characters.',
        variant: 'destructive'
      });
    }
  };

  const handleClose = () => {
    setMode(null);
    setManualCode('');
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="relative"
      >
        <ScanLine className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-primary" />
              Join Tournament
            </DialogTitle>
            <DialogDescription>
              Scan QR code or enter tournament code
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Mode Selection */}
            {!mode && !processing && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-6 w-6 text-primary" />
                    <span className="text-xs">Upload Image</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    onClick={() => setMode('manual')}
                  >
                    <Keyboard className="h-6 w-6 text-primary" />
                    <span className="text-xs">Enter Code</span>
                  </Button>
                </div>

                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    Get the tournament code from your local organizer
                  </p>
                </div>
              </>
            )}

            {/* Manual Code Entry */}
            {mode === 'manual' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tournament Code</label>
                  <Input
                    placeholder="Enter code (e.g., ABC123)"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                    className="text-center text-lg tracking-widest font-mono uppercase"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMode(null);
                      setManualCode('');
                    }}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleManualSubmit}
                    disabled={manualCode.trim().length < 4}
                    className="flex-1"
                  >
                    Join Tournament
                  </Button>
                </div>
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            {/* Hidden div for file scanning */}
            <div id="qr-reader-upload" className="hidden" />

            {/* Processing overlay */}
            {processing && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">Scanning image...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TournamentScanner;
