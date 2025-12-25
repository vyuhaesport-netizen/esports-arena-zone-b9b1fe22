interface Player {
  user_id: string;
  username: string | null;
  full_name: string | null;
  in_game_name?: string | null;
}

interface Winner {
  position: number;
  username: string | null;
  full_name: string | null;
  amount: number;
}

interface OrganizerData {
  name: string;
  email: string;
  phone: string | null;
  total_tournaments: number;
  active_tournaments: number;
  completed_tournaments: number;
  total_earnings: number;
  platform_revenue: number;
  total_participants: number;
}

interface CreatorData {
  name: string;
  email: string;
  phone: string | null;
  total_tournaments: number;
  active_tournaments: number;
  completed_tournaments: number;
  total_earnings: number;
  platform_revenue: number;
  total_participants: number;
}

export interface UserData {
  email: string;
  username: string | null;
  full_name: string | null;
  phone: string | null;
  wallet_balance: number | null;
  is_banned: boolean | null;
  is_frozen: boolean | null;
  created_at: string;
}

export interface TournamentReportData {
  id: string;
  title: string;
  game: string;
  status: string | null;
  type: 'organizer' | 'creator' | 'local';
  creator_name: string;
  prize_pool: number;
  entry_fee: number;
  participants: number;
  max_participants: number;
  organizer_commission: number;
  platform_commission: number;
  start_date: string;
}

// Dashboard Guide PDF for Organizers/Creators
export const generateDashboardGuidePDF = (role: 'organizer' | 'creator') => {
  const roleTitle = role === 'organizer' ? 'Organizer' : 'Creator';
  
  const content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Vyuha Esport ${roleTitle} Dashboard Guide</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.6;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #f97316;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #f97316;
      margin: 0 0 10px 0;
      font-size: 28px;
    }
    .header p {
      color: #666;
      margin: 0;
    }
    .brand {
      color: #f97316;
      font-weight: bold;
      font-size: 20px;
    }
    .section {
      margin-bottom: 30px;
      padding: 20px;
      background: #f9f9f9;
      border-radius: 10px;
      border-left: 4px solid #f97316;
    }
    .section h2 {
      color: #f97316;
      margin-top: 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .section h3 {
      color: #333;
      margin-top: 15px;
    }
    .step {
      background: white;
      padding: 15px;
      border-radius: 8px;
      margin: 10px 0;
      border: 1px solid #eee;
    }
    .step-number {
      display: inline-block;
      width: 28px;
      height: 28px;
      background: #f97316;
      color: white;
      border-radius: 50%;
      text-align: center;
      line-height: 28px;
      font-weight: bold;
      margin-right: 10px;
    }
    .highlight {
      background: #fff3e0;
      padding: 15px;
      border-radius: 8px;
      margin: 15px 0;
    }
    .highlight.green {
      background: #e8f5e9;
      border-left: 4px solid #4caf50;
    }
    .highlight.blue {
      background: #e3f2fd;
      border-left: 4px solid #2196f3;
    }
    .warning {
      background: #fff8e1;
      border-left: 4px solid #ff9800;
      padding: 15px;
      border-radius: 8px;
      margin: 15px 0;
    }
    .emoji {
      font-size: 20px;
    }
    ul {
      padding-left: 20px;
    }
    li {
      margin: 8px 0;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #666;
      font-size: 12px;
      border-top: 1px solid #ddd;
      padding-top: 20px;
    }
    .commission-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    .commission-table th, .commission-table td {
      padding: 12px;
      border: 1px solid #ddd;
      text-align: left;
    }
    .commission-table th {
      background: #f97316;
      color: white;
    }
  </style>
</head>
<body>
  <div class="header">
    <p class="brand">🎮 VYUHA ESPORT</p>
    <h1>${roleTitle} Dashboard Guide</h1>
    <p>Everything you need to know to start hosting tournaments</p>
  </div>

  <div class="section">
    <h2><span class="emoji">📊</span> Understanding Your Dashboard</h2>
    <p>Welcome to your ${roleTitle} Dashboard! This is your command center for managing tournaments, tracking earnings, and growing your esports community.</p>
    
    <div class="highlight">
      <strong>Quick Navigation:</strong>
      <ul>
        <li><strong>Dashboard</strong> - Overview of all your tournaments and stats</li>
        <li><strong>Wallet</strong> - View and withdraw your earnings (Dhana)</li>
        <li><strong>Reports</strong> - Handle player reports from your tournaments</li>
        <li><strong>Contact</strong> - Reach out to Vyuha support</li>
      </ul>
    </div>
  </div>

  <div class="section">
    <h2><span class="emoji">🏆</span> How to Create a Tournament</h2>
    
    <div class="step">
      <span class="step-number">1</span>
      <strong>Click "Create Tournament"</strong>
      <p>Find the orange "Create Tournament" button on your dashboard and click it.</p>
    </div>
    
    <div class="step">
      <span class="step-number">2</span>
      <strong>Fill Tournament Details</strong>
      <ul>
        <li><strong>Tournament Name:</strong> Choose an exciting name</li>
        <li><strong>Game:</strong> Select the game (Free Fire, BGMI, etc.)</li>
        <li><strong>Mode:</strong> Solo, Duo, or Squad</li>
        <li><strong>Entry Fee:</strong> Set between ₹10 - ₹500</li>
        <li><strong>Max Players:</strong> Set the participant limit</li>
        <li><strong>Date & Time:</strong> When the tournament will happen</li>
      </ul>
    </div>
    
    <div class="step">
      <span class="step-number">3</span>
      <strong>Set Prize Distribution</strong>
      <p>Define how the prize pool will be split among winners. You can set custom amounts for each position.</p>
    </div>
    
    <div class="step">
      <span class="step-number">4</span>
      <strong>Submit for Approval</strong>
      <p>Your tournament will be reviewed and approved within a few hours.</p>
    </div>
  </div>

  <div class="section">
    <h2><span class="emoji">💰</span> How Commission Works</h2>
    
    <table class="commission-table">
      <tr>
        <th>Component</th>
        <th>Percentage</th>
        <th>Description</th>
      </tr>
      <tr>
        <td>Prize Pool</td>
        <td>70%</td>
        <td>Goes to winners as prize money</td>
      </tr>
      <tr>
        <td>Your Commission</td>
        <td>20%</td>
        <td>Your earnings as ${roleTitle.toLowerCase()}</td>
      </tr>
      <tr>
        <td>Platform Fee</td>
        <td>10%</td>
        <td>Vyuha Esport platform fee</td>
      </tr>
    </table>
    
    <div class="highlight green">
      <strong>Example:</strong> If 10 players join with ₹50 entry fee = ₹500 total
      <ul>
        <li>Prize Pool: ₹350 (70%)</li>
        <li>Your Commission: ₹100 (20%)</li>
        <li>Platform Fee: ₹50 (10%)</li>
      </ul>
    </div>
  </div>

  <div class="section">
    <h2><span class="emoji">🏦</span> How to Withdraw Earnings</h2>
    
    <p>Your commission is credited as <strong>Dhana</strong> (virtual currency) which can be withdrawn to your bank account.</p>
    
    <div class="step">
      <span class="step-number">1</span>
      <strong>Wait for Maturation</strong>
      <p>Dhana becomes withdrawable 15 days after the tournament ends. This is for security purposes.</p>
    </div>
    
    <div class="step">
      <span class="step-number">2</span>
      <strong>Go to Wallet</strong>
      <p>Click on the Wallet tab in your dashboard menu.</p>
    </div>
    
    <div class="step">
      <span class="step-number">3</span>
      <strong>Request Withdrawal</strong>
      <p>Enter the amount, your UPI ID, and phone number. Submit the request.</p>
    </div>
    
    <div class="step">
      <span class="step-number">4</span>
      <strong>Wait for Processing</strong>
      <p>Our team will process your withdrawal within 24-48 hours.</p>
    </div>
    
    <div class="warning">
      <strong>⚠️ Important:</strong> Minimum withdrawal is ₹100. Make sure your UPI ID is correct before submitting.
    </div>
  </div>

  <div class="section">
    <h2><span class="emoji">🎯</span> Managing Your Tournaments</h2>
    
    <h3>Before Tournament Starts:</h3>
    <ul>
      <li>Set Room ID and Password (for live matches)</li>
      <li>Share tournament link with players</li>
      <li>Monitor registrations</li>
    </ul>
    
    <h3>After Tournament Ends:</h3>
    <ul>
      <li><strong>Declare Winners</strong> within 30 minutes of tournament end</li>
      <li>Handle any player reports fairly</li>
      <li>Your commission will be auto-credited as Dhana</li>
    </ul>
    
    <div class="highlight blue">
      <strong>💡 Pro Tip:</strong> Tournaments with lower entry fees (₹10-₹30) attract more players and help you build reputation!
    </div>
  </div>

  <div class="section">
    <h2><span class="emoji">📞</span> Need Help?</h2>
    <p>If you face any issues or have questions:</p>
    <ul>
      <li>Use the <strong>Contact</strong> section in your dashboard</li>
      <li>Check the <strong>Broadcast Channel</strong> for updates</li>
      <li>Raise a support ticket from Help & Support</li>
    </ul>
  </div>

  <div class="footer">
    <p><strong>Welcome to the Vyuha Esport Family! 🎮</strong></p>
    <p>Start hosting tournaments and earn while gaming!</p>
    <p>© ${new Date().getFullYear()} Vyuha Esport. All rights reserved.</p>
  </div>
</body>
</html>
  `;

  const blob = new Blob([content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};

// Get dashboard guide as HTML string (for edge function use)
export const getDashboardGuideHTML = (role: 'organizer' | 'creator'): string => {
  const roleTitle = role === 'organizer' ? 'Organizer' : 'Creator';
  
  return `Welcome to Vyuha Esport ${roleTitle} Dashboard!

🏆 How to Create Tournaments:
1. Go to your Dashboard
2. Click "Create Tournament"
3. Fill in details (name, game, entry fee, date)
4. Set prize distribution
5. Submit for approval

💰 Commission Structure:
• Prize Pool: 70% (goes to winners)
• Your Commission: 20% (your earnings)
• Platform Fee: 10%

🏦 How to Withdraw:
1. Your commission is credited as Dhana
2. Dhana matures after 15 days
3. Go to Wallet → Request Withdrawal
4. Enter UPI ID and amount
5. Processing within 24-48 hours

📌 Important Notes:
• Declare winners within 30 minutes after tournament ends
• Minimum withdrawal: ₹100
• Always set room details before tournament starts

Need help? Use the Contact section in your dashboard!

Welcome to the family! 🎮`;
};


export const generatePlayersPDF = (
  tournamentName: string,
  players: Player[],
  tournamentDate: string
) => {
  const content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${tournamentName} - Players List</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #f97316;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #1a1a1a;
      margin: 0 0 10px 0;
    }
    .header p {
      color: #666;
      margin: 0;
    }
    .brand {
      color: #f97316;
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #f97316;
      color: white;
    }
    tr:nth-child(even) {
      background: #f9f9f9;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${tournamentName}</h1>
    <p>Date: ${new Date(tournamentDate).toLocaleDateString('en-IN', { dateStyle: 'full' })}</p>
    <p class="brand">VYUHA ESPORT</p>
  </div>
  
  <h2>Registered Players (${players.length})</h2>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Name</th>
        <th>Username</th>
        <th>In-Game Name</th>
      </tr>
    </thead>
    <tbody>
      ${players.map((player, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${player.full_name || '-'}</td>
          <td>@${player.username || '-'}</td>
          <td>${player.in_game_name || '-'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
    <p>Powered by Vyuha Esport</p>
  </div>
</body>
</html>
  `;

  const blob = new Blob([content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};

export const generateWinnersPDF = (
  tournamentName: string,
  winners: Winner[],
  tournamentDate: string,
  totalPrizePool: number
) => {
  const content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${tournamentName} - Winners</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #f97316;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #1a1a1a;
      margin: 0 0 10px 0;
    }
    .header p {
      color: #666;
      margin: 0;
    }
    .brand {
      color: #f97316;
      font-weight: bold;
    }
    .trophy {
      font-size: 48px;
      text-align: center;
      margin: 20px 0;
    }
    .prize-pool {
      text-align: center;
      font-size: 24px;
      color: #16a34a;
      margin: 20px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #f97316;
      color: white;
    }
    .position-1 { background: linear-gradient(135deg, #ffd700 0%, #ffed4a 100%); }
    .position-2 { background: linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 100%); }
    .position-3 { background: linear-gradient(135deg, #cd7f32 0%, #e8a55c 100%); }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏆 ${tournamentName}</h1>
    <p>Date: ${new Date(tournamentDate).toLocaleDateString('en-IN', { dateStyle: 'full' })}</p>
    <p class="brand">VYUHA ESPORT</p>
  </div>
  
  <div class="prize-pool">
    Total Prize Pool: ₹${totalPrizePool}
  </div>
  
  <h2>🎉 Winners</h2>
  <table>
    <thead>
      <tr>
        <th>Position</th>
        <th>Name</th>
        <th>Username</th>
        <th>Prize</th>
      </tr>
    </thead>
    <tbody>
      ${winners.map((winner) => `
        <tr class="position-${winner.position}">
          <td>#${winner.position}</td>
          <td>${winner.full_name || '-'}</td>
          <td>@${winner.username || '-'}</td>
          <td>₹${winner.amount}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
    <p>Powered by Vyuha Esport</p>
  </div>
</body>
</html>
  `;

  const blob = new Blob([content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};

export const generateOrganizersReportPDF = (
  organizers: OrganizerData[],
  totalPlatformRevenue: number
) => {
  const totalOrganizerEarnings = organizers.reduce((sum, o) => sum + o.total_earnings, 0);
  const totalTournaments = organizers.reduce((sum, o) => sum + o.total_tournaments, 0);
  const totalParticipants = organizers.reduce((sum, o) => sum + o.total_participants, 0);

  const content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Organizers Report - Vyuha Esport</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 40px;
      max-width: 1000px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #f97316;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #1a1a1a;
      margin: 0 0 10px 0;
    }
    .header p {
      color: #666;
      margin: 0;
    }
    .brand {
      color: #f97316;
      font-weight: bold;
      font-size: 18px;
    }
    .summary {
      display: flex;
      justify-content: space-around;
      margin-bottom: 30px;
      flex-wrap: wrap;
    }
    .summary-item {
      text-align: center;
      padding: 15px 25px;
      background: #f9f9f9;
      border-radius: 8px;
      margin: 5px;
    }
    .summary-item .value {
      font-size: 24px;
      font-weight: bold;
      color: #f97316;
    }
    .summary-item .label {
      font-size: 12px;
      color: #666;
    }
    .platform-revenue {
      text-align: center;
      background: linear-gradient(135deg, #f97316, #ea580c);
      color: white;
      padding: 20px;
      border-radius: 10px;
      margin-bottom: 30px;
    }
    .platform-revenue .value {
      font-size: 32px;
      font-weight: bold;
    }
    .platform-revenue .label {
      font-size: 14px;
      opacity: 0.9;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      padding: 12px 8px;
      text-align: left;
      border-bottom: 1px solid #ddd;
      font-size: 12px;
    }
    th {
      background: #f97316;
      color: white;
    }
    tr:nth-child(even) {
      background: #f9f9f9;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <p class="brand">VYUHA ESPORT</p>
    <h1>Organizers Report</h1>
    <p>Generated on ${new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}</p>
  </div>

  <div class="platform-revenue">
    <div class="label">Total Platform Revenue from Organizers</div>
    <div class="value">₹${totalPlatformRevenue.toFixed(0)}</div>
  </div>
  
  <div class="summary">
    <div class="summary-item">
      <div class="value">${organizers.length}</div>
      <div class="label">Total Organizers</div>
    </div>
    <div class="summary-item">
      <div class="value">${totalTournaments}</div>
      <div class="label">Total Tournaments</div>
    </div>
    <div class="summary-item">
      <div class="value">${totalParticipants}</div>
      <div class="label">Total Participants</div>
    </div>
    <div class="summary-item">
      <div class="value">₹${totalOrganizerEarnings.toFixed(0)}</div>
      <div class="label">Organizer Earnings</div>
    </div>
  </div>
  
  <h2>Organizer Details</h2>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Name</th>
        <th>Email</th>
        <th>Phone</th>
        <th class="text-center">Tournaments</th>
        <th class="text-center">Participants</th>
        <th class="text-right">Their Earnings</th>
        <th class="text-right">Platform Revenue</th>
      </tr>
    </thead>
    <tbody>
      ${organizers.map((org, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${org.name}</td>
          <td>${org.email}</td>
          <td>${org.phone || '-'}</td>
          <td class="text-center">${org.total_tournaments}</td>
          <td class="text-center">${org.total_participants}</td>
          <td class="text-right">₹${org.total_earnings.toFixed(0)}</td>
          <td class="text-right">₹${org.platform_revenue.toFixed(0)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
    <p>Powered by Vyuha Esport</p>
  </div>
</body>
</html>
  `;

  const blob = new Blob([content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};

export const generateCreatorsReportPDF = (
  creators: CreatorData[],
  totalPlatformRevenue: number
) => {
  const totalCreatorEarnings = creators.reduce((sum, c) => sum + c.total_earnings, 0);
  const totalTournaments = creators.reduce((sum, c) => sum + c.total_tournaments, 0);
  const totalParticipants = creators.reduce((sum, c) => sum + c.total_participants, 0);

  const content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Creators Report - Vyuha Esport</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 40px;
      max-width: 1000px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #ec4899;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #1a1a1a;
      margin: 0 0 10px 0;
    }
    .header p {
      color: #666;
      margin: 0;
    }
    .brand {
      color: #ec4899;
      font-weight: bold;
      font-size: 18px;
    }
    .summary {
      display: flex;
      justify-content: space-around;
      margin-bottom: 30px;
      flex-wrap: wrap;
    }
    .summary-item {
      text-align: center;
      padding: 15px 25px;
      background: #f9f9f9;
      border-radius: 8px;
      margin: 5px;
    }
    .summary-item .value {
      font-size: 24px;
      font-weight: bold;
      color: #ec4899;
    }
    .summary-item .label {
      font-size: 12px;
      color: #666;
    }
    .platform-revenue {
      text-align: center;
      background: linear-gradient(135deg, #ec4899, #be185d);
      color: white;
      padding: 20px;
      border-radius: 10px;
      margin-bottom: 30px;
    }
    .platform-revenue .value {
      font-size: 32px;
      font-weight: bold;
    }
    .platform-revenue .label {
      font-size: 14px;
      opacity: 0.9;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      padding: 12px 8px;
      text-align: left;
      border-bottom: 1px solid #ddd;
      font-size: 12px;
    }
    th {
      background: #ec4899;
      color: white;
    }
    tr:nth-child(even) {
      background: #f9f9f9;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <p class="brand">VYUHA ESPORT</p>
    <h1>Creators Report</h1>
    <p>Generated on ${new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}</p>
  </div>

  <div class="platform-revenue">
    <div class="label">Total Platform Revenue from Creators</div>
    <div class="value">₹${totalPlatformRevenue.toFixed(0)}</div>
  </div>
  
  <div class="summary">
    <div class="summary-item">
      <div class="value">${creators.length}</div>
      <div class="label">Total Creators</div>
    </div>
    <div class="summary-item">
      <div class="value">${totalTournaments}</div>
      <div class="label">Total Tournaments</div>
    </div>
    <div class="summary-item">
      <div class="value">${totalParticipants}</div>
      <div class="label">Total Participants</div>
    </div>
    <div class="summary-item">
      <div class="value">₹${totalCreatorEarnings.toFixed(0)}</div>
      <div class="label">Creator Earnings</div>
    </div>
  </div>
  
  <h2>Creator Details</h2>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Name</th>
        <th>Email</th>
        <th>Phone</th>
        <th class="text-center">Tournaments</th>
        <th class="text-center">Participants</th>
        <th class="text-right">Their Earnings</th>
        <th class="text-right">Platform Revenue</th>
      </tr>
    </thead>
    <tbody>
      ${creators.map((creator, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${creator.name}</td>
          <td>${creator.email}</td>
          <td>${creator.phone || '-'}</td>
          <td class="text-center">${creator.total_tournaments}</td>
          <td class="text-center">${creator.total_participants}</td>
          <td class="text-right">₹${creator.total_earnings.toFixed(0)}</td>
          <td class="text-right">₹${creator.platform_revenue.toFixed(0)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
    <p>Powered by Vyuha Esport</p>
  </div>
</body>
</html>
  `;

  const blob = new Blob([content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};

export const generateUsersPDF = (users: UserData[]) => {
  const content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Users Report - Vyuha Esport</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 40px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #1a1a1a;
      margin: 0 0 10px 0;
    }
    .header p {
      color: #666;
      margin: 0;
    }
    .brand {
      color: #3b82f6;
      font-weight: bold;
      font-size: 18px;
    }
    .summary {
      display: flex;
      justify-content: center;
      margin-bottom: 30px;
      gap: 20px;
    }
    .summary-item {
      text-align: center;
      padding: 15px 25px;
      background: #f9f9f9;
      border-radius: 8px;
    }
    .summary-item .value {
      font-size: 24px;
      font-weight: bold;
      color: #3b82f6;
    }
    .summary-item .label {
      font-size: 12px;
      color: #666;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      padding: 10px 8px;
      text-align: left;
      border-bottom: 1px solid #ddd;
      font-size: 11px;
    }
    th {
      background: #3b82f6;
      color: white;
    }
    tr:nth-child(even) {
      background: #f9f9f9;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .status-banned { color: #ef4444; font-weight: bold; }
    .status-frozen { color: #f59e0b; font-weight: bold; }
    .status-active { color: #22c55e; }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <p class="brand">VYUHA ESPORT</p>
    <h1>Users Report</h1>
    <p>Generated on ${new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}</p>
  </div>
  
  <div class="summary">
    <div class="summary-item">
      <div class="value">${users.length}</div>
      <div class="label">Total Users</div>
    </div>
    <div class="summary-item">
      <div class="value">${users.filter(u => u.is_banned).length}</div>
      <div class="label">Banned</div>
    </div>
    <div class="summary-item">
      <div class="value">${users.filter(u => u.is_frozen).length}</div>
      <div class="label">Frozen</div>
    </div>
    <div class="summary-item">
      <div class="value">₹${users.reduce((sum, u) => sum + (u.wallet_balance || 0), 0).toFixed(0)}</div>
      <div class="label">Total Wallet Balance</div>
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Name</th>
        <th>Username</th>
        <th>Email</th>
        <th>Phone</th>
        <th class="text-right">Balance</th>
        <th class="text-center">Status</th>
        <th>Joined</th>
      </tr>
    </thead>
    <tbody>
      ${users.map((user, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${user.full_name || '-'}</td>
          <td>@${user.username || '-'}</td>
          <td>${user.email}</td>
          <td>${user.phone || '-'}</td>
          <td class="text-right">₹${(user.wallet_balance || 0).toFixed(0)}</td>
          <td class="text-center ${user.is_banned ? 'status-banned' : user.is_frozen ? 'status-frozen' : 'status-active'}">${user.is_banned ? 'Banned' : user.is_frozen ? 'Frozen' : 'Active'}</td>
          <td>${new Date(user.created_at).toLocaleDateString('en-IN')}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
    <p>Powered by Vyuha Esport</p>
  </div>
</body>
</html>
  `;

  const blob = new Blob([content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};

export const generateUsersCSV = (users: UserData[]) => {
  const headers = ['#', 'Full Name', 'Username', 'Email', 'Phone', 'Wallet Balance', 'Status', 'Joined Date'];
  const rows = users.map((user, index) => [
    index + 1,
    user.full_name || '-',
    user.username || '-',
    user.email,
    user.phone || '-',
    user.wallet_balance || 0,
    user.is_banned ? 'Banned' : user.is_frozen ? 'Frozen' : 'Active',
    new Date(user.created_at).toLocaleDateString('en-IN'),
  ]);
  
  const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `users_report_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const generateTournamentDetailPDF = (tournament: TournamentReportData) => {
  const typeColor = tournament.type === 'organizer' ? '#f97316' : tournament.type === 'creator' ? '#ec4899' : '#3b82f6';
  const typeLabel = tournament.type.charAt(0).toUpperCase() + tournament.type.slice(1);
  
  const content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${tournament.title} - Tournament Details</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid ${typeColor};
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #1a1a1a;
      margin: 0 0 10px 0;
    }
    .header p {
      color: #666;
      margin: 5px 0;
    }
    .brand {
      color: ${typeColor};
      font-weight: bold;
      font-size: 18px;
    }
    .type-badge {
      display: inline-block;
      background: ${typeColor};
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      margin-top: 10px;
    }
    .status-badge {
      display: inline-block;
      background: ${tournament.status === 'ongoing' ? '#22c55e' : tournament.status === 'upcoming' ? '#3b82f6' : '#6b7280'};
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      margin-left: 8px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin: 30px 0;
    }
    .info-item {
      padding: 15px;
      background: #f9f9f9;
      border-radius: 8px;
    }
    .info-item .label {
      font-size: 12px;
      color: #666;
      margin-bottom: 5px;
    }
    .info-item .value {
      font-size: 18px;
      font-weight: bold;
      color: #1a1a1a;
    }
    .commission-section {
      background: linear-gradient(135deg, ${typeColor}15, ${typeColor}05);
      border: 1px solid ${typeColor}30;
      border-radius: 10px;
      padding: 20px;
      margin: 30px 0;
    }
    .commission-section h3 {
      color: ${typeColor};
      margin: 0 0 15px 0;
    }
    .commission-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .commission-row:last-child {
      border-bottom: none;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <p class="brand">VYUHA ESPORT</p>
    <h1>${tournament.title}</h1>
    <p>Game: ${tournament.game}</p>
    <p>Created by: ${tournament.creator_name}</p>
    <span class="type-badge">${typeLabel} Tournament</span>
    <span class="status-badge">${tournament.status}</span>
  </div>
  
  <div class="info-grid">
    <div class="info-item">
      <div class="label">Start Date</div>
      <div class="value">${new Date(tournament.start_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</div>
    </div>
    <div class="info-item">
      <div class="label">Prize Pool</div>
      <div class="value">₹${tournament.prize_pool.toLocaleString()}</div>
    </div>
    <div class="info-item">
      <div class="label">Entry Fee</div>
      <div class="value">₹${tournament.entry_fee}</div>
    </div>
    <div class="info-item">
      <div class="label">Participants</div>
      <div class="value">${tournament.participants} / ${tournament.max_participants}</div>
    </div>
  </div>
  
  <div class="commission-section">
    <h3>Commission Breakdown</h3>
    <div class="commission-row">
      <span>Total Fees Collected</span>
      <strong>₹${(tournament.entry_fee * tournament.participants).toLocaleString()}</strong>
    </div>
    <div class="commission-row">
      <span>Prize Pool</span>
      <strong>₹${tournament.prize_pool.toLocaleString()}</strong>
    </div>
    <div class="commission-row">
      <span>${typeLabel} Commission</span>
      <strong>₹${tournament.organizer_commission.toLocaleString()}</strong>
    </div>
    <div class="commission-row">
      <span>Platform Commission</span>
      <strong style="color: ${typeColor}">₹${tournament.platform_commission.toLocaleString()}</strong>
    </div>
  </div>
  
  <div class="footer">
    <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
    <p>Powered by Vyuha Esport</p>
  </div>
</body>
</html>
  `;

  const blob = new Blob([content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};