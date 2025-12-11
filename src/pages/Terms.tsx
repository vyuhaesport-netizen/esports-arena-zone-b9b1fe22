import AppLayout from '@/components/layout/AppLayout';
import { FileText, User, CreditCard, Shield, RefreshCcw, AlertTriangle } from 'lucide-react';

const Terms = () => {
  return (
    <AppLayout title="Terms & Conditions">
      <div className="p-4 pb-8 space-y-4">
        <p className="text-xs text-muted-foreground">Last Updated: December 7, 2025</p>
        {/* Section 1: Introduction */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-border">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">1. Introduction</h2>
          </div>
          <div className="p-4 bg-primary/5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Welcome to <strong className="text-foreground">Vyuha</strong>, a competitive eSports platform designed for mobile gamers. By accessing or using our platform, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use our services.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-3">
              These terms constitute a legally binding agreement between you ("User", "Player", or "You") and Vyuha ("Platform", "We", or "Us"). We reserve the right to modify these terms at any time, and your continued use of the platform constitutes acceptance of any changes.
            </p>
          </div>
        </div>

        {/* Section 2: Account Policy */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-border">
            <User className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">2. Account Policy</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <h3 className="font-medium text-sm mb-2">2.1 Profile Information</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Users are required to provide accurate and complete information during registration. You are solely responsible for maintaining the confidentiality of your account credentials.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-sm mb-2">2.2 Profile Picture Updates</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You may update or change your <strong className="text-foreground">Profile Picture at any time</strong> without any restrictions. This allows you to personalize your account freely.
              </p>
            </div>
            
            {/* Warning Box */}
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <h3 className="font-medium text-sm text-orange-600">2.3 Critical ID Restrictions (Anti-Fraud Measure)</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                To prevent fraud, impersonation, and player confusion, the following fields have a <strong className="text-foreground">5-day edit restriction</strong>:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• <strong className="text-foreground">Username</strong> — Your unique platform identity</li>
                <li>• <strong className="text-foreground">Game Name</strong> — Your in-game display name</li>
                <li>• <strong className="text-foreground">Level</strong> — Your declared skill/experience level</li>
              </ul>
              <p className="text-sm text-orange-700 dark:text-orange-400 mt-3">
                Once edited, these fields cannot be changed again for 5 days. This policy protects tournament integrity and prevents identity manipulation.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Payment & Wallet Policy */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-border">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">3. Payment & Wallet Policy</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <h3 className="font-medium text-sm mb-2">3.1 Manual Payment Gateway</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Vyuha operates on a <strong className="text-foreground">Manual Payment Gateway</strong> system. Unlike instant payment processors, all deposits require admin verification for security and compliance purposes.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-sm mb-2">3.2 How to Add Money</h3>
              <ol className="text-sm text-muted-foreground space-y-2 ml-4 list-decimal">
                <li>Navigate to your Wallet and select "Add Money"</li>
                <li>Transfer the desired amount to the provided <strong className="text-foreground">Bank Account / UPI details</strong></li>
                <li>Submit the correct <strong className="text-foreground">UTR (Unique Transaction Reference)</strong> number</li>
                <li>Wait for admin verification</li>
              </ol>
            </div>
            <div>
              <h3 className="font-medium text-sm mb-2">3.3 Important Notice</h3>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Balance is <strong className="text-foreground">NOT credited instantly</strong></li>
                <li>• Upon submission, you will see an <strong className="text-foreground">"Approval Pending"</strong> notification</li>
                <li>• Funds are credited only after the Admin validates your UTR</li>
                <li>• Verification typically takes 15 minutes to 24 hours</li>
              </ul>
            </div>
            
            {/* Warning Box */}
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h3 className="font-medium text-sm text-red-600 mb-2">3.4 Zero Tolerance for Fraud</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                Submitting <strong className="text-foreground">fake, duplicate, or manipulated UTR numbers</strong> is strictly prohibited and will result in:
              </p>
              <ul className="text-sm text-red-700 dark:text-red-400 space-y-1 ml-4">
                <li>• Immediate and permanent account suspension</li>
                <li>• Forfeiture of any existing wallet balance</li>
                <li>• Potential legal action in severe cases</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section 4: Fair Play & Conduct */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-border">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">4. Fair Play & Conduct</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <h3 className="font-medium text-sm mb-2">4.1 Prohibited Activities</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                The following activities are strictly prohibited on Vyuha:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Using cheats, hacks, mods, or any third-party software to gain unfair advantages</li>
                <li>• Exploiting bugs or glitches in games or on the platform</li>
                <li>• Match-fixing, win trading, or any form of result manipulation</li>
                <li>• Impersonating other players or using fake identities</li>
                <li>• Harassment, hate speech, toxic behavior, or threats towards other users</li>
                <li>• Creating multiple accounts to bypass restrictions or abuse rewards</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-sm mb-2">4.2 Tournament Rules</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                All participants must follow the specific rules set for each tournament. Failure to comply may result in disqualification without refund.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-sm mb-2">4.3 Admin Authority</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Vyuha Admins have the final authority</strong> to disqualify teams or individual players for any form of misconduct. All admin decisions are final and binding. Appeals may be submitted through our support system but are not guaranteed to be accepted.
              </p>
            </div>
          </div>
        </div>

        {/* Section 5: Refund Policy */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-border">
            <RefreshCcw className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">5. Refund Policy</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <h3 className="font-medium text-sm mb-2">5.1 No Refund After Booking</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Once a tournament slot is booked and the entry fee is deducted from your wallet, <strong className="text-foreground">no refunds will be provided</strong>. Please ensure you are available and willing to participate before joining any tournament.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-sm mb-2">5.2 Exceptions</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                Refunds are only provided under the following circumstances:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• The tournament is <strong className="text-foreground">cancelled by Vyuha</strong></li>
                <li>• Technical issues on our end prevent the tournament from being conducted</li>
                <li>• The tournament does not reach minimum participant requirements (if applicable)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-sm mb-2">5.3 Refund Processing</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Eligible refunds are automatically credited back to your Vyuha wallet within 24-48 hours of cancellation. Wallet balance refunds do not include any processing fees that may have been charged during deposit.
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center pt-4">
          For any questions or concerns regarding these Terms and Conditions, please contact us through the in-app support system or visit our Help Center.
        </p>
      </div>
    </AppLayout>
  );
};

export default Terms;
