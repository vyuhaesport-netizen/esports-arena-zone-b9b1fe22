import AppLayout from '@/components/layout/AppLayout';
import { 
  FileText, User, CreditCard, Shield, RefreshCcw, AlertTriangle,
  Scale, Gavel, Lock, Eye, Ban, Trophy, Users, Smartphone,
  Clock, CheckCircle, XCircle
} from 'lucide-react';

const Terms = () => {
  return (
    <AppLayout title="Terms & Conditions" showBack>
      <div className="p-4 pb-8 space-y-6">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-2xl border-2 border-border p-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 border-2 border-border mb-4">
              <Gavel className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Terms & Conditions</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The official rules of engagement for India's mobile-first competitive gaming platform.
            </p>
            <p className="text-xs text-muted-foreground mt-3">Last Updated: December 2025</p>
          </div>
        </div>

        {/* Section 1: Introduction */}
        <div className="bg-card rounded-xl border-2 border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 p-4 border-b border-border bg-primary/5">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">1. Introduction</h2>
              <p className="text-xs text-muted-foreground">Welcome to the Arena</p>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Welcome to <strong className="text-foreground">Vyuha Esport</strong> — a mobile-first competitive gaming platform designed for the modern strategist. By accessing or using our platform, you agree to be bound by these Terms and Conditions.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              These terms constitute a legally binding agreement between you ("User", "Player", "Soldier") and Vyuha Esport ("Platform", "We", "The Arena"). We reserve the right to modify these terms, and continued use constitutes acceptance.
            </p>
          </div>
        </div>

        {/* Section 2: Legal Compliance */}
        <div className="bg-card rounded-xl border-2 border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 p-4 border-b border-border bg-primary/5">
            <div className="p-2 rounded-lg bg-primary/10">
              <Scale className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">2. Legal Compliance & Game of Skill</h2>
              <p className="text-xs text-muted-foreground">100% Legal Under Indian Law</p>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Vyuha Esport operates strictly under Indian laws regarding Online Gaming. Our tournaments are classified as <strong className="text-foreground">"Games of Skill"</strong> as defined by the Supreme Court of India.
            </p>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">Zero Gambling Policy</p>
                  <p className="text-xs text-muted-foreground">We do not host luck-based games or betting</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">MeitY Compliant</p>
                  <p className="text-xs text-muted-foreground">We adhere to Ministry of Electronics and IT guidelines</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Account Policy */}
        <div className="bg-card rounded-xl border-2 border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 p-4 border-b border-border bg-primary/5">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">3. Account Policy</h2>
              <p className="text-xs text-muted-foreground">Your identity in the Arena</p>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">3.1</span>
                Profile Information
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed pl-8">
                Users must provide accurate and complete information during registration. You are solely responsible for maintaining the confidentiality of your account credentials.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">3.2</span>
                Profile Picture
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed pl-8">
                You may update your <strong className="text-foreground">Profile Picture at any time</strong> without restrictions.
              </p>
            </div>

            {/* Warning Box */}
            <div className="bg-orange-50 dark:bg-orange-950/30 border-2 border-orange-200 dark:border-orange-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <h3 className="font-bold text-sm text-orange-700 dark:text-orange-400">3.3 Critical ID Restrictions (Anti-Fraud)</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                To prevent fraud and identity manipulation, these fields have a <strong className="text-foreground">5-day edit restriction</strong>:
              </p>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Lock className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-400">Username</span>
                  <span className="text-xs text-muted-foreground">— Your unique platform identity</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Lock className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-400">Game Name</span>
                  <span className="text-xs text-muted-foreground">— Your in-game display name</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Lock className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-400">Level</span>
                  <span className="text-xs text-muted-foreground">— Your declared skill level</span>
                </div>
              </div>
              <p className="text-xs text-orange-700 dark:text-orange-400 mt-3">
                Once edited, these fields cannot be changed again for 5 days to protect tournament integrity.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">3.4</span>
                Age Restrictions
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed pl-8">
                We follow Krafton's parental guidance policies. Players under 18 must provide parental consent details to participate in tournaments with prize pools.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Payment & Wallet Policy */}
        <div className="bg-card rounded-xl border-2 border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 p-4 border-b border-border bg-primary/5">
            <div className="p-2 rounded-lg bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">4. Payment & Wallet Policy</h2>
              <p className="text-xs text-muted-foreground">The Digital Vault</p>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <h3 className="font-medium text-sm mb-2">4.1 Manual Payment Gateway</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Vyuha operates on a <strong className="text-foreground">Manual Payment Gateway</strong> system. All deposits require admin verification for security and compliance.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-sm mb-2">4.2 How to Add Money</h3>
              <div className="space-y-2 pl-4">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
                  <p className="text-sm text-muted-foreground">Navigate to Wallet → "Add Money"</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</span>
                  <p className="text-sm text-muted-foreground">Transfer to provided Bank/UPI details</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">3</span>
                  <p className="text-sm text-muted-foreground">Submit correct UTR number</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">4</span>
                  <p className="text-sm text-muted-foreground">Wait for admin verification (15 min - 24 hrs)</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <h3 className="font-medium text-sm text-blue-700 dark:text-blue-400">Important Notice</h3>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Balance is <strong className="text-foreground">NOT credited instantly</strong></li>
                <li>• You'll see "Approval Pending" until verified</li>
                <li>• Funds credited only after UTR validation</li>
              </ul>
            </div>

            {/* Fraud Warning */}
            <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Ban className="h-5 w-5 text-red-600" />
                <h3 className="font-bold text-sm text-red-700 dark:text-red-400">4.3 Zero Tolerance for Fraud</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                Submitting <strong className="text-foreground">fake, duplicate, or manipulated UTR numbers</strong> results in:
              </p>
              <ul className="text-sm text-red-700 dark:text-red-400 space-y-1 ml-4">
                <li>• Immediate permanent account suspension</li>
                <li>• Forfeiture of existing wallet balance</li>
                <li>• Potential legal action in severe cases</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section 5: Tournament Economics */}
        <div className="bg-card rounded-xl border-2 border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 p-4 border-b border-border bg-primary/5">
            <div className="p-2 rounded-lg bg-primary/10">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">5. Tournament Economics</h2>
              <p className="text-xs text-muted-foreground">The 80/20 Rule</p>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Unlike platforms with opaque fee structures, Vyuha operates on a strict, transparent prize split:
            </p>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <span className="font-bold text-emerald-600">80%</span>
                  </div>
                  <span className="text-sm font-medium">Prize Pool</span>
                </div>
                <span className="text-xs text-muted-foreground">Goes back to players</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <span className="font-bold text-blue-600">10%</span>
                  </div>
                  <span className="text-sm font-medium">Organizer Commission</span>
                </div>
                <span className="text-xs text-muted-foreground">Tournament architect</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <span className="font-bold text-purple-600">10%</span>
                  </div>
                  <span className="text-sm font-medium">Platform Fee</span>
                </div>
                <span className="text-xs text-muted-foreground">Sustaining the ecosystem</span>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-sm mb-2">5.2 The Winner's Circle</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                After match conclusion, there's a mandatory <strong className="text-foreground">30-minute cooldown</strong> for dispute resolution and anti-cheat verification. Prizes in Duo/Squad modes are split equally among all teammates.
              </p>
            </div>
          </div>
        </div>

        {/* Section 6: Fair Play & Conduct */}
        <div className="bg-card rounded-xl border-2 border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 p-4 border-b border-border bg-primary/5">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">6. Fair Play & Conduct</h2>
              <p className="text-xs text-muted-foreground">Legends are born from skill, not hacks</p>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <h3 className="font-medium text-sm mb-2">6.1 Prohibited Activities</h3>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">Cheats, hacks, mods, or third-party software</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">Exploiting bugs or glitches</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">Match-fixing, win trading, or result manipulation</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">Impersonation or fake identities</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">Harassment, hate speech, or toxic behavior</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">Multiple accounts to bypass restrictions</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-sm mb-2">6.2 Anti-Cheat Measures</h3>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">Mandatory mobile number verification</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">Manual & automated replay monitoring</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">Permanent ban for hacks or teaming</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-sm mb-2">6.3 Admin Authority</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Vyuha Admins have final authority</strong> to disqualify players for misconduct. All admin decisions are final and binding.
              </p>
            </div>
          </div>
        </div>

        {/* Section 7: Refund Policy */}
        <div className="bg-card rounded-xl border-2 border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 p-4 border-b border-border bg-primary/5">
            <div className="p-2 rounded-lg bg-primary/10">
              <RefreshCcw className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">7. Refund Policy</h2>
              <p className="text-xs text-muted-foreground">The Exit Strategy</p>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
              <p className="text-sm text-emerald-700 dark:text-emerald-400 leading-relaxed">
                <strong>The Vyuha Principle:</strong> If you cancel or withdraw before the match starts, we trigger an immediate, full refund. We do not profit from unplayed matches.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-sm mb-2">7.1 Eligible for Refund</h3>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Voluntary exit before tournament starts</li>
                <li>• Tournament cancelled by Vyuha</li>
                <li>• Insufficient participants</li>
                <li>• Platform technical issues</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-sm mb-2">7.2 Not Eligible for Refund</h3>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• After tournament status is "Live" or "Completed"</li>
                <li>• No-show without prior notice</li>
                <li>• Player disqualification</li>
                <li>• Wrong player information provided</li>
                <li>• Player-side technical issues</li>
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              For detailed refund information, see our full <strong className="text-foreground">Refund Policy</strong> page.
            </p>
          </div>
        </div>

        {/* Section 8: Data Privacy */}
        <div className="bg-card rounded-xl border-2 border-border overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 p-4 border-b border-border bg-primary/5">
            <div className="p-2 rounded-lg bg-primary/10">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">8. Data Privacy</h2>
              <p className="text-xs text-muted-foreground">Your data is safe with us</p>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Enterprise-Grade Security</p>
                <p className="text-xs text-muted-foreground">User data (phone numbers, IDs) is encrypted and stored securely</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">No Third-Party Sharing</p>
                <p className="text-xs text-muted-foreground">We do not sell user data to third-party advertisers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-3 pt-4">
          <p className="text-xs text-muted-foreground">
            For questions about these Terms, contact us through in-app support or email <strong className="text-foreground">vyuhaesport@gmail.com</strong>
          </p>
          <p className="text-xs text-muted-foreground">
            By using Vyuha Esport, you acknowledge that you have read, understood, and agree to these Terms & Conditions.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Terms;
