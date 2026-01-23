import AppLayout from '@/components/layout/AppLayout';
import { 
  IndianRupee, CheckCircle, XCircle, Clock, AlertCircle, 
  Wallet, ArrowRight, Shield, HelpCircle, FileText
} from 'lucide-react';

const RefundPolicy = () => {
  return (
    <AppLayout title="Refund Policy" showBack>
      <div className="p-3 pb-8 space-y-4">
        {/* Header Section */}
        <div className="relative bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent rounded-xl border border-border p-4 overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-3">
              <IndianRupee className="h-5 w-5 text-emerald-600" />
            </div>
            <h1 className="text-lg font-bold mb-1">Refund Policy</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              At Vyuha Esport, we operate on a transparent "Exit Strategy" — if you need to retreat before battle, we've got you covered.
            </p>
            <p className="text-[10px] text-muted-foreground mt-2">Last Updated: January 2026</p>
          </div>
        </div>

        {/* The Exit Strategy - Key Principle */}
        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 p-3">
          <div className="flex items-start gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10">
              <Shield className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-emerald-700 dark:text-emerald-400 mb-1">The Vyuha Principle</h3>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-300 leading-relaxed">
                Life happens. A soldier may need to retreat before the battle begins. If you cancel or withdraw <strong>before the match starts</strong>, we trigger an <strong>immediate, full refund</strong>. We do not profit from unplayed matches.
              </p>
            </div>
          </div>
        </div>

        {/* When You Are Eligible */}
        <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 p-3 border-b border-border bg-emerald-500/5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-sm">When You Get a Refund</h2>
              <p className="text-[10px] text-muted-foreground">Full refund scenarios</p>
            </div>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex items-start gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Voluntary Exit Before Start</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Exit a tournament while status is "Upcoming" — entry fee refunded automatically to wallet.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Tournament Cancelled by Admin</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  If a tournament is cancelled by Vyuha before it starts, you receive a full refund.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Insufficient Participants</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Tournament fails to meet minimum participants — all entry fees refunded.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Platform Technical Issues</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Tournament cannot proceed due to technical difficulties on our end — full refunds.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* When Refunds Are NOT Available */}
        <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 p-3 border-b border-border bg-red-500/5">
            <div className="p-1.5 rounded-lg bg-red-500/10">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <h2 className="font-bold text-sm">When Refunds Are Not Available</h2>
              <p className="text-[10px] text-muted-foreground">No refund scenarios</p>
            </div>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex items-start gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-red-700 dark:text-red-400">After Tournament Starts</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Once status changes to "Live" or "Completed", no refunds.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-red-700 dark:text-red-400">No-Show</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Fail to join the room at scheduled time — entry fee forfeited.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-red-700 dark:text-red-400">Player Disqualification</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Disqualified for cheating or rule violations — no refund.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-red-700 dark:text-red-400">Wrong Player Information</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Incorrect Game UID or player details — no refund.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-red-700 dark:text-red-400">Player-Side Technical Issues</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Game crashes, internet issues, device problems on your end — no refund.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Refund Process */}
        <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 p-3 border-b border-border bg-primary/5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-sm">How Refunds Work</h2>
              <p className="text-[10px] text-muted-foreground">The Vyuha protocol</p>
            </div>
          </div>
          <div className="p-3 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                1
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium">Automatic Credit</p>
                <p className="text-[10px] text-muted-foreground">Refunds credited to Vyuha wallet within 24 hours</p>
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="h-3 w-3 text-muted-foreground rotate-90" />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                2
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium">Use or Withdraw</p>
                <p className="text-[10px] text-muted-foreground">Use for tournaments or withdraw to bank</p>
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="h-3 w-3 text-muted-foreground rotate-90" />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                3
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium">Transaction History</p>
                <p className="text-[10px] text-muted-foreground">All refunds recorded in wallet history</p>
              </div>
            </div>
          </div>
        </div>

        {/* Important Note */}
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 p-3">
          <div className="flex items-start gap-2">
            <Wallet className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-xs text-amber-700 dark:text-amber-400 mb-0.5">Important Note</h3>
              <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-relaxed">
                Refunds are credited to your <strong>Vyuha wallet</strong>, not directly to your bank account. You can then withdraw from wallet to bank via UPI.
              </p>
            </div>
          </div>
        </div>

        {/* Dispute Resolution */}
        <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 p-3 border-b border-border bg-primary/5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <HelpCircle className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-sm">Refund Disputes</h2>
              <p className="text-[10px] text-muted-foreground">Need help with a refund issue?</p>
            </div>
          </div>
          <div className="p-3 space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              If you believe you are entitled to a refund that was not processed, contact support within <strong className="text-foreground">7 days</strong> of the tournament date.
            </p>
            <div className="bg-secondary/50 rounded-lg p-2 border border-border">
              <p className="text-[10px] font-medium mb-1">Include in your dispute:</p>
              <ul className="text-[10px] text-muted-foreground space-y-0.5">
                <li>• Tournament ID and name</li>
                <li>• Transaction details from wallet</li>
                <li>• Clear reason for dispute</li>
                <li>• Supporting screenshots</li>
              </ul>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Our team will review and respond within <strong className="text-foreground">48 hours</strong>.
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center space-y-1 pt-2">
          <p className="text-[10px] text-muted-foreground">
            This policy is part of our commitment to fair and transparent gaming.
          </p>
          <p className="text-[10px] text-muted-foreground">
            📧 Questions? Contact <strong>vyuhaesport@gmail.com</strong>
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default RefundPolicy;
