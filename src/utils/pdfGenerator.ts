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