import AppLayout from '@/components/layout/AppLayout';
import { IndianRupee, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

const RefundPolicy = () => {
  return (
    <AppLayout title="Refund Policy">
      <div className="p-4 pb-8 space-y-4">
        {/* Main Policy Card */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="bg-primary/5 p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-2">
              <IndianRupee className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Tournament Cancellation & Refund Policy</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              At Vyuha Esport, we strive to ensure all tournaments run smoothly. However, in cases where tournaments are cancelled, the following refund policy applies.
            </p>
          </div>
        </div>

        {/* When You Are Eligible */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-border">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h2 className="font-semibold">When You Are Eligible for a Refund</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Tournament Cancelled by Admin:</strong> If a tournament is cancelled by our team before it starts, you will receive a full refund of your entry fee.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Insufficient Participants:</strong> If a tournament fails to meet the minimum participant requirement and is cancelled, all entry fees will be refunded.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Technical Issues:</strong> If a tournament cannot proceed due to technical difficulties on our end, full refunds will be issued.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Voluntary Exit Before Start:</strong> If you exit a tournament before it begins (while status is "Upcoming"), your entry fee will be refunded automatically.
              </p>
            </div>
          </div>
        </div>

        {/* When Refunds Are Not Available */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-border">
            <XCircle className="h-5 w-5 text-red-600" />
            <h2 className="font-semibold">When Refunds Are Not Available</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">After Tournament Starts:</strong> Once a tournament has started (status changed to "Live" or "Completed"), no refunds will be issued.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Player Disqualification:</strong> If you are disqualified for violating tournament rules or cheating, no refund will be provided.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">No-Show:</strong> If you fail to join the tournament room at the scheduled time without prior notice, your entry fee is forfeited.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Wrong Information:</strong> If you provide incorrect game UID or player details, and cannot participate as a result, no refund will be issued.
              </p>
            </div>
          </div>
        </div>

        {/* Refund Process */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-border">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Refund Process</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0">1</span>
              <p className="text-sm text-muted-foreground">
                Refunds are automatically credited to your Vyuha Esport wallet within 24 hours of cancellation.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0">2</span>
              <p className="text-sm text-muted-foreground">
                You can use the refunded amount to join other tournaments or withdraw to your bank account.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0">3</span>
              <p className="text-sm text-muted-foreground">
                All refund transactions are recorded in your wallet history for transparency.
              </p>
            </div>
          </div>
        </div>

        {/* Refund Disputes */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-border">
            <AlertCircle className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Refund Disputes</h2>
          </div>
          <div className="p-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you believe you are entitled to a refund that was not processed, please contact our support team within 7 days of the tournament date. Include your tournament ID, transaction details, and reason for the dispute. Our team will review your case and respond within 48 hours.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default RefundPolicy;
