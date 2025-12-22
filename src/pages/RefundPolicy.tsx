import AppLayout from '@/components/layout/AppLayout';
import { 
  IndianRupee, CheckCircle, XCircle, Clock, AlertCircle, 
  Wallet, ArrowRight, Shield, HelpCircle, FileText
} from 'lucide-react';

const RefundPolicy = () => {
  return (
    <AppLayout title="Refund Policy">
      <div className="p-4 pb-8 space-y-6">
        {/* Header Section */}
        <div className="relative bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent rounded-2xl border-2 border-border p-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/20 mb-4">
              <IndianRupee className="h-7 w-7 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Refund Policy</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              At Vyuha Esport, we operate on a transparent "Exit Strategy" — if you need to retreat before battle, we've got you covered.
            </p>
            <p className="text-xs text-muted-foreground mt-3">Last Updated: December 2025</p>
          </div>
        </div>

        {/* The Exit Strategy - Key Principle */}
        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Shield className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-emerald-700 dark:text-emerald-400 mb-1">The Vyuha Principle</h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 leading-relaxed">
                Life happens. A soldier may need to retreat before the battle begins. If you cancel or withdraw <strong>before the match starts</strong>, we trigger an <strong>immediate, full refund</strong>. We do not profit from unplayed matches.
              </p>
            </div>
          </div>
        </div>

        {/* When You Are Eligible */}
        <div className="bg-card rounded-xl border-2 border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 p-4 border-b border-border bg-emerald-500/5">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-lg">When You Get a Refund</h2>
              <p className="text-xs text-muted-foreground">Full refund scenarios</p>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Voluntary Exit Before Start</p>
                <p className="text-xs text-muted-foreground mt-1">
                  If you exit a tournament while status is "Upcoming", your entry fee is refunded automatically to your wallet.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Tournament Cancelled by Admin</p>
                <p className="text-xs text-muted-foreground mt-1">
                  If a tournament is cancelled by Vyuha before it starts, you receive a full refund.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Insufficient Participants</p>
                <p className="text-xs text-muted-foreground mt-1">
                  If a tournament fails to meet minimum participant requirement and is cancelled, all entry fees are refunded.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Platform Technical Issues</p>
                <p className="text-xs text-muted-foreground mt-1">
                  If a tournament cannot proceed due to technical difficulties on our end, full refunds are issued.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* When Refunds Are NOT Available */}
        <div className="bg-card rounded-xl border-2 border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 p-4 border-b border-border bg-red-500/5">
            <div className="p-2 rounded-lg bg-red-500/10">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="font-bold text-lg">When Refunds Are Not Available</h2>
              <p className="text-xs text-muted-foreground">No refund scenarios</p>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">After Tournament Starts</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Once status changes to "Live" or "Completed", no refunds. The 30-minute cooldown post-match is for verification, not refund requests.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">No-Show</p>
                <p className="text-xs text-muted-foreground mt-1">
                  If you fail to join the room at scheduled time without prior notice, your entry fee is forfeited.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">Player Disqualification</p>
                <p className="text-xs text-muted-foreground mt-1">
                  If you are disqualified for violating tournament rules, cheating, or using hacks, no refund is provided.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">Wrong Player Information</p>
                <p className="text-xs text-muted-foreground mt-1">
                  If you provide incorrect Game UID or player details and cannot participate, no refund is issued. Accuracy is your responsibility.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">Player-Side Technical Issues</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Game crashes, internet disconnection, device issues — refunds are not issued for problems on your end.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Refund Process */}
        <div className="bg-card rounded-xl border-2 border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 p-4 border-b border-border bg-primary/5">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">How Refunds Work</h2>
              <p className="text-xs text-muted-foreground">The Vyuha protocol</p>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Automatic Credit</p>
                <p className="text-xs text-muted-foreground">Refunds are automatically credited to your Vyuha wallet within 24 hours</p>
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Use or Withdraw</p>
                <p className="text-xs text-muted-foreground">Use the balance for other tournaments or withdraw to your bank account</p>
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Transaction History</p>
                <p className="text-xs text-muted-foreground">All refund transactions are recorded in your wallet history for transparency</p>
              </div>
            </div>
          </div>
        </div>

        {/* Important Note */}
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl border-2 border-amber-200 dark:border-amber-800 p-4">
          <div className="flex items-start gap-3">
            <Wallet className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-amber-700 dark:text-amber-400 mb-1">Important Note</h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
                Refunds are credited to your <strong>Vyuha wallet</strong>, not directly to your bank account. You can then withdraw from your wallet to your bank via UPI.
              </p>
            </div>
          </div>
        </div>

        {/* Dispute Resolution */}
        <div className="bg-card rounded-xl border-2 border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 p-4 border-b border-border bg-primary/5">
            <div className="p-2 rounded-lg bg-primary/10">
              <HelpCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Refund Disputes</h2>
              <p className="text-xs text-muted-foreground">Need help with a refund issue?</p>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you believe you are entitled to a refund that was not processed, please contact our support team within <strong className="text-foreground">7 days</strong> of the tournament date.
            </p>
            <div className="bg-secondary/50 rounded-lg p-3 border border-border">
              <p className="text-xs font-medium mb-2">Include in your dispute:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Tournament ID and name</li>
                <li>• Transaction details from your wallet</li>
                <li>• Clear reason for the dispute</li>
                <li>• Any supporting screenshots</li>
              </ul>
            </div>
            <p className="text-xs text-muted-foreground">
              Our team will review your case and respond within <strong className="text-foreground">48 hours</strong>.
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center space-y-2 pt-2">
          <p className="text-xs text-muted-foreground">
            This policy is part of our commitment to fair and transparent gaming.
          </p>
          <p className="text-xs text-muted-foreground">
            📧 Questions? Contact <strong>vyuhaesport@gmail.com</strong>
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default RefundPolicy;
