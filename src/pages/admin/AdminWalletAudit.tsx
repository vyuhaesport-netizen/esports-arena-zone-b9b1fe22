import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Loader2, 
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Trophy,
  Wallet,
  Download,
  FileText,
  Search,
  Filter,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  reason: string | null;
  created_at: string;
  upi_id: string | null;
  phone: string | null;
  processed_by: string | null;
}

interface UserProfile {
  user_id: string;
  username: string | null;
  email: string;
}

const AdminWalletAudit = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const { user, loading: authLoading, hasPermission } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (!hasPermission('transactions:view')) {
        navigate('/admin');
      }
    }
  }, [user, authLoading, navigate, hasPermission]);

  useEffect(() => {
    if (hasPermission('transactions:view')) {
      fetchData();
    }
  }, [hasPermission]);

  useEffect(() => {
    applyFilters();
  }, [transactions, selectedUser, selectedType, startDate, endDate, searchQuery]);

  const fetchData = async () => {
    try {
      const [txRes, usersRes] = await Promise.all([
        supabase
          .from('wallet_transactions')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('user_id, username, email')
      ]);

      if (!txRes.error) setTransactions(txRes.data || []);
      if (!usersRes.error) setUsers(usersRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Filter by user
    if (selectedUser !== 'all') {
      filtered = filtered.filter(t => t.user_id === selectedUser);
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(t => t.type === selectedType);
    }

    // Filter by date range
    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(t => new Date(t.created_at) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => new Date(t.created_at) <= end);
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.description?.toLowerCase().includes(query) ||
        t.reason?.toLowerCase().includes(query) ||
        t.type.toLowerCase().includes(query) ||
        t.id.toLowerCase().includes(query)
      );
    }

    setFilteredTransactions(filtered);
  };

  const getUserName = (userId: string) => {
    const u = users.find(u => u.user_id === userId);
    return u?.username || u?.email?.split('@')[0] || 'Unknown';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case 'withdrawal': return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'prize': return <Trophy className="h-4 w-4 text-primary" />;
      case 'entry_fee': return <Wallet className="h-4 w-4 text-blue-500" />;
      case 'admin_credit': return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case 'admin_debit': return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'refund': return <ArrowDownLeft className="h-4 w-4 text-amber-500" />;
      case 'commission': return <Wallet className="h-4 w-4 text-purple-500" />;
      default: return <Receipt className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500/10 text-green-600 text-[10px]">Completed</Badge>;
      case 'pending': return <Badge className="bg-yellow-500/10 text-yellow-600 text-[10px]">Pending</Badge>;
      case 'failed': return <Badge variant="destructive" className="text-[10px]">Failed</Badge>;
      case 'rejected': return <Badge variant="destructive" className="text-[10px]">Rejected</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  const getAmountColor = (type: string) => {
    if (['deposit', 'prize', 'admin_credit', 'refund', 'commission'].includes(type)) return 'text-green-600';
    return 'text-red-600';
  };

  const formatAmount = (amount: number, type: string) => {
    const prefix = ['deposit', 'prize', 'admin_credit', 'refund', 'commission'].includes(type) ? '+' : '-';
    return `${prefix}₹${Math.abs(amount)}`;
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Date', 'User', 'Type', 'Amount', 'Status', 'Description', 'Reason'];
    const rows = filteredTransactions.map(t => [
      t.id,
      format(new Date(t.created_at), 'yyyy-MM-dd HH:mm:ss'),
      getUserName(t.user_id),
      t.type,
      t.amount,
      t.status,
      t.description || '',
      t.reason || ''
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `wallet_audit_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    // Create a simple HTML-based PDF export
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Wallet Audit Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f4f4f4; font-weight: bold; }
          .amount-positive { color: green; }
          .amount-negative { color: red; }
          .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>Wallet Audit Report</h1>
        <p class="meta">Generated: ${format(new Date(), 'PPpp')}<br/>Total Records: ${filteredTransactions.length}</p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>User</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            ${filteredTransactions.map(t => `
              <tr>
                <td>${format(new Date(t.created_at), 'MMM dd, yyyy HH:mm')}</td>
                <td>${getUserName(t.user_id)}</td>
                <td>${t.type.replace('_', ' ')}</td>
                <td class="${['deposit', 'prize', 'admin_credit', 'refund', 'commission'].includes(t.type) ? 'amount-positive' : 'amount-negative'}">
                  ${formatAmount(t.amount, t.type)}
                </td>
                <td>${t.status}</td>
                <td>${t.description || t.reason || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const clearFilters = () => {
    setSelectedUser('all');
    setSelectedType('all');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
  };

  const transactionTypes = ['all', 'deposit', 'withdrawal', 'prize', 'entry_fee', 'admin_credit', 'admin_debit', 'refund', 'commission'];

  if (authLoading || loading) {
    return (
      <AdminLayout title="Wallet Audit">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Wallet Audit Log">
      <div className="p-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                ₹{filteredTransactions.filter(t => ['deposit', 'prize', 'admin_credit', 'refund', 'commission'].includes(t.type)).reduce((sum, t) => sum + Math.abs(t.amount), 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total Credits</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">
                ₹{filteredTransactions.filter(t => ['withdrawal', 'entry_fee', 'admin_debit'].includes(t.type)).reduce((sum, t) => sum + Math.abs(t.amount), 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total Debits</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Filters</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">User</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.username || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    {transactionTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type === 'all' ? 'All Types' : type.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> From
                </Label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> To
                </Label>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by description, reason, ID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearFilters} className="flex-1">
                Clear Filters
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-1" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF}>
                <FileText className="h-4 w-4 mr-1" /> PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Info */}
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>Showing {filteredTransactions.length} of {transactions.length} transactions</span>
        </div>

        {/* Transactions List */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">User</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Amount</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <span className="text-xs">
                          {format(new Date(tx.created_at), 'MMM dd, HH:mm')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium">
                          {getUserName(tx.user_id)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(tx.type)}
                          <div>
                            <p className="text-xs font-medium capitalize">{tx.type.replace('_', ' ')}</p>
                            {tx.description && (
                              <p className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                                {tx.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm font-semibold ${getAmountColor(tx.type)}`}>
                          {formatAmount(tx.amount, tx.type)}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredTransactions.length === 0 && (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No transactions found</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminWalletAudit;