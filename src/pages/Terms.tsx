import AppLayout from '@/components/layout/AppLayout';
import { 
  FileText, User, CreditCard, Shield, RefreshCcw, AlertTriangle,
  Scale, Gavel, Lock, Eye, Ban, Trophy, Users, Smartphone,
  Clock, CheckCircle, XCircle
} from 'lucide-react';

const Terms = () => {
  return (
    <AppLayout title="Terms & Conditions" showBack>
      <div className="p-3 pb-8 space-y-4">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-xl border border-border p-4 overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-border mb-3">
              <Gavel className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-lg font-bold mb-1">Terms & Conditions</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The official rules for India's mobile-first competitive gaming platform.
            </p>
            <p className="text-[10px] text-muted-foreground mt-2">Last Updated: January 2026</p>
          </div>
        </div>

        {/* Section 1: Introduction */}
        <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 p-3 border-b border-border bg-primary/5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-sm">1. Introduction</h2>
              <p className="text-[10px] text-muted-foreground">Welcome to the Arena</p>
            </div>
          </div>
          <div className="p-3 space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Welcome to <strong className="text-foreground">Vyuha Esport</strong> — a mobile-first competitive gaming platform designed for the modern strategist. By accessing or using our platform, you agree to be bound by these Terms.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              These terms constitute a legally binding agreement between you ("User", "Player") and Vyuha Esport ("Platform", "We"). We reserve the right to modify these terms, and continued use constitutes acceptance.
            </p>
          </div>
        </div>

        {/* Section 2: Legal Compliance */}
        <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 p-3 border-b border-border bg-primary/5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Scale className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-sm">2. Legal Compliance</h2>
              <p className="text-[10px] text-muted-foreground">100% Legal Under Indian Law</p>
            </div>
          </div>
          <div className="p-3 space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Vyuha operates strictly under Indian laws. Our tournaments are classified as <strong className="text-foreground">"Games of Skill"</strong> as defined by the Supreme Court of India.
            </p>
            
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-green-700 dark:text-green-400">Zero Gambling Policy</p>
                  <p className="text-[10px] text-muted-foreground">No luck-based games or betting</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-green-700 dark:text-green-400">MeitY Compliant</p>
                  <p className="text-[10px] text-muted-foreground">Adheres to Ministry of Electronics and IT guidelines</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Account Policy */}
        <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 p-3 border-b border-border bg-primary/5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-sm">3. Account Policy</h2>
              <p className="text-[10px] text-muted-foreground">Your identity in the Arena</p>
            </div>
          </div>
          <div className="p-3 space-y-3">
            <div>
              <h3 className="font-medium text-xs mb-1 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">3.1</span>
                Profile Information
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                Users must provide accurate and complete information during registration. You are responsible for maintaining account confidentiality.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-xs mb-1 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">3.2</span>
                Profile Picture
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                You may update your <strong className="text-foreground">Profile Picture at any time</strong> without restrictions.
              </p>
            </div>

            {/* Warning Box */}
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <h3 className="font-bold text-xs text-orange-700 dark:text-orange-400">3.3 Critical ID Restrictions</h3>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">
                To prevent fraud, these fields have a <strong className="text-foreground">5-day edit restriction</strong>:
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                <div className="flex items-center gap-1.5 px-2 py-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Lock className="h-3 w-3 text-orange-600" />
                  <span className="text-[10px] font-medium text-orange-700 dark:text-orange-400">Username</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Lock className="h-3 w-3 text-orange-600" />
                  <span className="text-[10px] font-medium text-orange-700 dark:text-orange-400">Game Name</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Lock className="h-3 w-3 text-orange-600" />
                  <span className="text-[10px] font-medium text-orange-700 dark:text-orange-400">Level</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-xs mb-1 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">3.4</span>
                Age Restrictions
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                Players under 18 must provide parental consent details to participate in prize pool tournaments.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Payment & Wallet Policy */}
        <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 p-3 border-b border-border bg-primary/5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-sm">4. Payment & Wallet</h2>
              <p className="text-[10px] text-muted-foreground">The Digital Vault</p>
            </div>
          </div>
          <div className="p-3 space-y-3">
            <div>
              <h3 className="font-medium text-xs mb-1">4.1 Manual Payment Gateway</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Vyuha operates on a <strong className="text-foreground">Manual Payment Gateway</strong>. All deposits require admin verification.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-xs mb-1">4.2 How to Add Money</h3>
              <div className="space-y-1.5 pl-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">1</span>
                  <p className="text-xs text-muted-foreground">Navigate to Wallet → "Add Money"</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">2</span>
                  <p className="text-xs text-muted-foreground">Transfer to provided Bank/UPI details</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">3</span>
                  <p className="text-xs text-muted-foreground">Submit correct UTR number</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">4</span>
                  <p className="text-xs text-muted-foreground">Wait for admin verification (15 min - 24 hrs)</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="h-3 w-3 text-blue-600" />
                <h3 className="font-medium text-[10px] text-blue-700 dark:text-blue-400">Important Notice</h3>
              </div>
              <ul className="text-[10px] text-muted-foreground space-y-0.5">
                <li>• Balance is <strong className="text-foreground">NOT credited instantly</strong></li>
                <li>• You'll see "Approval Pending" until verified</li>
                <li>• Funds credited only after UTR validation</li>
              </ul>
            </div>

            {/* Fraud Warning */}
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-2">
              <div className="flex items-center gap-1.5 mb-1">
                <Ban className="h-4 w-4 text-red-600" />
                <h3 className="font-bold text-[10px] text-red-700 dark:text-red-400">4.3 Zero Tolerance for Fraud</h3>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed mb-1">
                Submitting <strong className="text-foreground">fake/duplicate UTR numbers</strong> results in:
              </p>
              <ul className="text-[10px] text-red-700 dark:text-red-400 space-y-0.5 ml-3">
                <li>• Immediate permanent suspension</li>
                <li>• Forfeiture of wallet balance</li>
                <li>• Potential legal action</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section 5: Tournament Economics */}
        <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 p-3 border-b border-border bg-primary/5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Trophy className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-sm">5. Tournament Economics</h2>
              <p className="text-[10px] text-muted-foreground">The 80/10/10 Rule</p>
            </div>
          </div>
          <div className="p-3 space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Vyuha operates on a strict, transparent prize split:
            </p>
            
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <span className="font-bold text-xs text-emerald-600">80%</span>
                  </div>
                  <span className="text-xs font-medium">Prize Pool</span>
                </div>
                <span className="text-[10px] text-muted-foreground">To players</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <span className="font-bold text-xs text-blue-600">10%</span>
                  </div>
                  <span className="text-xs font-medium">Organizer</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Commission</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <span className="font-bold text-xs text-purple-600">10%</span>
                  </div>
                  <span className="text-xs font-medium">Platform Fee</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Sustaining ecosystem</span>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-xs mb-1">5.2 The Winner's Circle</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                After match conclusion, there's a <strong className="text-foreground">30-minute cooldown</strong> for dispute resolution. Duo/Squad prizes are split equally among teammates.
              </p>
            </div>
          </div>
        </div>

        {/* Section 6: Fair Play & Conduct */}
        <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 p-3 border-b border-border bg-primary/5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-sm">6. Fair Play & Conduct</h2>
              <p className="text-[10px] text-muted-foreground">Skill, not hacks</p>
            </div>
          </div>
          <div className="p-3 space-y-3">
            <div>
              <h3 className="font-medium text-xs mb-1.5">6.1 Prohibited Activities</h3>
              <div className="grid grid-cols-1 gap-1.5">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <XCircle className="h-3 w-3 text-red-600 flex-shrink-0" />
                  <span className="text-[10px] text-muted-foreground">Cheats, hacks, mods, or third-party software</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <XCircle className="h-3 w-3 text-red-600 flex-shrink-0" />
                  <span className="text-[10px] text-muted-foreground">Teaming or collusion with opponents</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <XCircle className="h-3 w-3 text-red-600 flex-shrink-0" />
                  <span className="text-[10px] text-muted-foreground">Multiple accounts (smurfing)</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <XCircle className="h-3 w-3 text-red-600 flex-shrink-0" />
                  <span className="text-[10px] text-muted-foreground">Account sharing or selling</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <XCircle className="h-3 w-3 text-red-600 flex-shrink-0" />
                  <span className="text-[10px] text-muted-foreground">Stream sniping or harassment</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-xs mb-1.5">6.2 Ban Tiers</h3>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">1st Offense</span>
                  <span className="text-[10px] text-muted-foreground">24-hour ban</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                  <span className="text-[10px] font-medium text-orange-700 dark:text-orange-400">2nd Offense</span>
                  <span className="text-[10px] text-muted-foreground">7-day ban + penalty</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <span className="text-[10px] font-medium text-red-700 dark:text-red-400">3rd Offense</span>
                  <span className="text-[10px] text-muted-foreground">Permanent ban</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 7: Withdrawals */}
        <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 p-3 border-b border-border bg-primary/5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <RefreshCcw className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-sm">7. Withdrawals</h2>
              <p className="text-[10px] text-muted-foreground">Getting your earnings</p>
            </div>
          </div>
          <div className="p-3 space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Winners can withdraw earnings to their bank account via UPI. Minimum withdrawal: <strong className="text-foreground">₹10</strong>. Processing time: <strong className="text-foreground">1-24 hours</strong>.
            </p>
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground">
                Ensure your UPI ID is accurate. Incorrect details may result in failed transfers and delays.
              </p>
            </div>
          </div>
        </div>

        {/* Section 8: Privacy */}
        <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 p-3 border-b border-border bg-primary/5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Eye className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-sm">8. Privacy & Data</h2>
              <p className="text-[10px] text-muted-foreground">Your data, your control</p>
            </div>
          </div>
          <div className="p-3 space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              We collect only necessary information for platform operation. Your data is encrypted and never sold to third parties.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
                Encrypted Storage
              </span>
              <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                No Data Sales
              </span>
              <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                Secure Payments
              </span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center space-y-1 pt-2">
          <p className="text-[10px] text-muted-foreground">
            By using Vyuha Esport, you agree to these Terms & Conditions.
          </p>
          <p className="text-[10px] text-muted-foreground">
            Questions? Contact <strong>vyuhaesport@gmail.com</strong>
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Terms;
