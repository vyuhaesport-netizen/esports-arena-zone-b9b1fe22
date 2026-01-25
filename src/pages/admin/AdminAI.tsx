import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Bot, 
  Key, 
  Activity, 
  Settings, 
  RefreshCw, 
  Save,
  TestTube,
  Zap,
  MessageSquare,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Gauge,
  Radio,
  Brain,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AIConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
  isEnabled: boolean;
}

interface TokenLimits {
  dailyLimit: number;
  monthlyLimit: number;
  isEnabled: boolean;
}

interface UsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokensUsed: number;
  dailyTokensUsed: number;
  monthlyTokensUsed: number;
  averageResponseTime: number;
}

interface UsageLog {
  id: string;
  request_type: string;
  total_tokens: number;
  status: string;
  response_time_ms: number;
  error_message: string | null;
  created_at: string;
  model?: string;
}

const AdminAI = () => {
  const navigate = useNavigate();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [isSaving, setIsSaving] = useState(false);
  const [testResponse, setTestResponse] = useState('');
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);

  const [config, setConfig] = useState<AIConfig>({
    model: 'deepseek-r1',
    maxTokens: 1024,
    temperature: 0.7,
    systemPrompt: '',
    isEnabled: true,
  });

  const [tokenLimits, setTokenLimits] = useState<TokenLimits>({
    dailyLimit: 100000,
    monthlyLimit: 3000000,
    isEnabled: true,
  });

  const [usageStats, setUsageStats] = useState<UsageStats>({
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalTokensUsed: 0,
    dailyTokensUsed: 0,
    monthlyTokensUsed: 0,
    averageResponseTime: 0,
  });

  // DeepSeek R1 Models
  const availableModels = [
    { id: 'deepseek-r1', name: 'DeepSeek R1', description: 'Advanced reasoning model with chain-of-thought' },
    { id: 'deepseek-r1-lite', name: 'DeepSeek R1 Lite', description: 'Fast & efficient for simple tasks' },
    { id: 'deepseek-v3', name: 'DeepSeek V3', description: 'General purpose model' },
    { id: 'deepseek-coder', name: 'DeepSeek Coder', description: 'Optimized for code generation' },
  ];

  useEffect(() => {
    loadAIConfig();
    loadTokenLimits();
    loadUsageStats();
    loadUsageLogs();
  }, []);

  const loadAIConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['ai_model', 'ai_max_tokens', 'ai_temperature', 'ai_system_prompt', 'ai_enabled']);

      if (error) throw error;

      const settings: Record<string, string> = {};
      data?.forEach(s => {
        settings[s.setting_key] = s.setting_value;
      });

      setConfig({
        model: settings.ai_model || 'deepseek-r1',
        maxTokens: parseInt(settings.ai_max_tokens) || 1024,
        temperature: parseFloat(settings.ai_temperature) || 0.7,
        systemPrompt: settings.ai_system_prompt || '',
        isEnabled: settings.ai_enabled !== 'false',
      });
    } catch (error) {
      console.error('Error loading AI config:', error);
    }
  };

  const loadTokenLimits = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_token_limits')
        .select('*')
        .eq('limit_type', 'global')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setTokenLimits({
          dailyLimit: data.daily_limit,
          monthlyLimit: data.monthly_limit,
          isEnabled: data.is_enabled,
        });
      }
    } catch (error) {
      console.error('Error loading token limits:', error);
    }
  };

  const loadUsageStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const { data: allLogs, error } = await supabase
        .from('ai_usage_logs')
        .select('total_tokens, status, response_time_ms, created_at');

      if (error) throw error;

      const logs = allLogs || [];
      const totalRequests = logs.length;
      const successfulRequests = logs.filter(l => l.status === 'success').length;
      const failedRequests = logs.filter(l => l.status === 'error').length;
      const totalTokensUsed = logs.reduce((sum, l) => sum + (l.total_tokens || 0), 0);
      
      const dailyLogs = logs.filter(l => new Date(l.created_at) >= today);
      const dailyTokensUsed = dailyLogs.reduce((sum, l) => sum + (l.total_tokens || 0), 0);
      
      const monthlyLogs = logs.filter(l => new Date(l.created_at) >= monthStart);
      const monthlyTokensUsed = monthlyLogs.reduce((sum, l) => sum + (l.total_tokens || 0), 0);
      
      const avgResponseTime = logs.length > 0 
        ? logs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / logs.length / 1000 
        : 0;

      setUsageStats({
        totalRequests,
        successfulRequests,
        failedRequests,
        totalTokensUsed,
        dailyTokensUsed,
        monthlyTokensUsed,
        averageResponseTime: parseFloat(avgResponseTime.toFixed(2)),
      });
    } catch (error) {
      console.error('Error loading usage stats:', error);
    }
  };

  const loadUsageLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setUsageLogs(data || []);
    } catch (error) {
      console.error('Error loading usage logs:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestResponse('');
    
    try {
      const response = await supabase.functions.invoke('ai-chat', {
        body: { 
          messages: [{ role: 'user', content: 'Hello, this is a test. Please respond briefly.' }],
          type: 'test'
        }
      });

      if (response.error) throw response.error;

      setConnectionStatus('connected');
      setTestResponse(response.data.response || 'Connection successful!');
      toast.success('DeepSeek R1 connection successful!');
      loadUsageStats();
      loadUsageLogs();
    } catch (error: any) {
      setConnectionStatus('error');
      setTestResponse(error.message || 'Connection failed');
      toast.error('DeepSeek R1 connection failed');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    
    try {
      const settings = [
        { setting_key: 'ai_model', setting_value: config.model },
        { setting_key: 'ai_max_tokens', setting_value: config.maxTokens.toString() },
        { setting_key: 'ai_temperature', setting_value: config.temperature.toString() },
        { setting_key: 'ai_system_prompt', setting_value: config.systemPrompt },
        { setting_key: 'ai_enabled', setting_value: config.isEnabled.toString() },
      ];

      for (const setting of settings) {
        const { error } = await supabase
          .from('platform_settings')
          .upsert(
            { ...setting, updated_at: new Date().toISOString() },
            { onConflict: 'setting_key' }
          );
        
        if (error) throw error;
      }

      toast.success('AI configuration saved successfully');
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTokenLimits = async () => {
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('ai_token_limits')
        .upsert({
          limit_type: 'global',
          daily_limit: tokenLimits.dailyLimit,
          monthly_limit: tokenLimits.monthlyLimit,
          is_enabled: tokenLimits.isEnabled,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'limit_type' });

      if (error) throw error;
      toast.success('Token limits saved successfully');
    } catch (error: any) {
      console.error('Error saving token limits:', error);
      toast.error('Failed to save token limits');
    } finally {
      setIsSaving(false);
    }
  };

  const dailyUsagePercent = (usageStats.dailyTokensUsed / tokenLimits.dailyLimit) * 100;
  const monthlyUsagePercent = (usageStats.monthlyTokensUsed / tokenLimits.monthlyLimit) * 100;

  return (
    <AdminLayout title="DeepSeek R1 AI Management">
      <div className="p-4 space-y-6">
        {/* Header with DeepSeek Branding */}
        <Card className="border-blue-500/30 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  DeepSeek R1 
                  <Badge variant="outline" className="border-blue-500/50 text-blue-500">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Reasoning Model
                  </Badge>
                </h2>
                <p className="text-sm text-muted-foreground">
                  Advanced AI with chain-of-thought reasoning for Vyuha Esports
                </p>
              </div>
              <Button 
                onClick={() => navigate('/admin/ai-monitor')} 
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                R1 Monitor
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Header Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{usageStats.totalRequests}</p>
                  <p className="text-xs text-muted-foreground">Total Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {usageStats.totalRequests > 0 
                      ? ((usageStats.successfulRequests / usageStats.totalRequests) * 100).toFixed(1) 
                      : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Success Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Gauge className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{(usageStats.totalTokensUsed / 1000).toFixed(1)}K</p>
                  <p className="text-xs text-muted-foreground">Total Tokens</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Zap className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <Badge variant={tokenLimits.isEnabled && config.isEnabled ? 'default' : 'secondary'}>
                    {tokenLimits.isEnabled && config.isEnabled ? 'Active' : 'Disabled'}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">Status</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-purple-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Radio className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">AI Daily Broadcast</h3>
                    <p className="text-sm text-muted-foreground">Auto-generated content for users</p>
                  </div>
                </div>
                <Button onClick={() => navigate('/admin/ai-broadcast')} variant="outline" size="sm">
                  Manage
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/30 bg-gradient-to-r from-blue-500/5 to-cyan-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">R1 Performance Monitor</h3>
                    <p className="text-sm text-muted-foreground">Detailed analytics & insights</p>
                  </div>
                </div>
                <Button onClick={() => navigate('/admin/ai-monitor')} variant="outline" size="sm">
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Token Usage Bars */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Daily Token Usage</span>
                <span className="text-xs text-muted-foreground">
                  {usageStats.dailyTokensUsed.toLocaleString()} / {tokenLimits.dailyLimit.toLocaleString()}
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    dailyUsagePercent > 90 ? 'bg-red-500' : 
                    dailyUsagePercent > 70 ? 'bg-amber-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'
                  }`}
                  style={{ width: `${Math.min(dailyUsagePercent, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{dailyUsagePercent.toFixed(1)}% used today</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Monthly Token Usage</span>
                <span className="text-xs text-muted-foreground">
                  {usageStats.monthlyTokensUsed.toLocaleString()} / {tokenLimits.monthlyLimit.toLocaleString()}
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    monthlyUsagePercent > 90 ? 'bg-red-500' : 
                    monthlyUsagePercent > 70 ? 'bg-amber-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'
                  }`}
                  style={{ width: `${Math.min(monthlyUsagePercent, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{monthlyUsagePercent.toFixed(1)}% used this month</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="connection" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="connection" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">Test</span>
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Config</span>
            </TabsTrigger>
            <TabsTrigger value="limits" className="flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              <span className="hidden sm:inline">Limits</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Logs</span>
            </TabsTrigger>
          </TabsList>

          {/* Connection Test */}
          <TabsContent value="connection" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-blue-500" />
                  DeepSeek R1 Connection Test
                </CardTitle>
                <CardDescription>
                  Test the AI connection and verify the reasoning model is working
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Brain className="h-6 w-6 text-blue-500" />
                    <div>
                      <p className="font-medium">DeepSeek R1 Reasoning Model</p>
                      <p className="text-xs text-muted-foreground">Advanced chain-of-thought AI for Vyuha</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    DeepSeek R1 provides superior reasoning capabilities with transparent thinking process. 
                    Perfect for support queries, content moderation, and intelligent assistance.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={handleTestConnection} 
                    disabled={isTestingConnection}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    {isTestingConnection ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <TestTube className="h-4 w-4 mr-2" />
                    )}
                    Test R1 Connection
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Status:</span>
                    <Badge variant={
                      connectionStatus === 'connected' ? 'default' : 
                      connectionStatus === 'error' ? 'destructive' : 'secondary'
                    }>
                      {connectionStatus === 'connected' ? '✓ Connected' : 
                       connectionStatus === 'error' ? '✗ Error' : 'Unknown'}
                    </Badge>
                  </div>
                </div>

                {testResponse && (
                  <div className={`p-3 rounded-lg text-sm ${
                    connectionStatus === 'connected' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}>
                    <p className="font-medium mb-1">R1 Response:</p>
                    <p className="line-clamp-5">{testResponse}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configuration */}
          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  AI Configuration
                </CardTitle>
                <CardDescription>
                  Configure DeepSeek R1 behavior for your platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable AI Features</Label>
                    <p className="text-xs text-muted-foreground">Turn AI features on/off globally</p>
                  </div>
                  <Switch
                    checked={config.isEnabled}
                    onCheckedChange={(checked) => setConfig({ ...config, isEnabled: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>AI Model</Label>
                  <Select 
                    value={config.model} 
                    onValueChange={(value) => setConfig({ ...config, model: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex flex-col">
                            <span>{model.name}</span>
                            <span className="text-xs text-muted-foreground">{model.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Tokens</Label>
                    <Input
                      type="number"
                      value={config.maxTokens}
                      onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) || 1024 })}
                      min={100}
                      max={8000}
                    />
                    <p className="text-xs text-muted-foreground">Response length limit</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Temperature</Label>
                    <Input
                      type="number"
                      value={config.temperature}
                      onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) || 0.7 })}
                      min={0}
                      max={2}
                      step={0.1}
                    />
                    <p className="text-xs text-muted-foreground">Creativity (0-2)</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Custom System Prompt (Optional)</Label>
                  <Textarea
                    value={config.systemPrompt}
                    onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                    placeholder="Add custom instructions for the AI..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Additional instructions that will be added to the AI's system prompt
                  </p>
                </div>

                <Button onClick={handleSaveConfig} disabled={isSaving} className="w-full">
                  {isSaving ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Configuration
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Token Limits */}
          <TabsContent value="limits" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5" />
                  Token Limits
                </CardTitle>
                <CardDescription>
                  Control AI usage by setting token limits. When limits are reached, AI will be temporarily disabled.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Token Limits</Label>
                    <p className="text-xs text-muted-foreground">Enforce daily and monthly limits</p>
                  </div>
                  <Switch
                    checked={tokenLimits.isEnabled}
                    onCheckedChange={(checked) => setTokenLimits({ ...tokenLimits, isEnabled: checked })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Daily Token Limit</Label>
                    <Input
                      type="number"
                      value={tokenLimits.dailyLimit}
                      onChange={(e) => setTokenLimits({ ...tokenLimits, dailyLimit: parseInt(e.target.value) || 100000 })}
                      min={1000}
                    />
                    <p className="text-xs text-muted-foreground">Max tokens per day</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Monthly Token Limit</Label>
                    <Input
                      type="number"
                      value={tokenLimits.monthlyLimit}
                      onChange={(e) => setTokenLimits({ ...tokenLimits, monthlyLimit: parseInt(e.target.value) || 3000000 })}
                      min={10000}
                    />
                    <p className="text-xs text-muted-foreground">Max tokens per month</p>
                  </div>
                </div>

                {(dailyUsagePercent > 80 || monthlyUsagePercent > 80) && (
                  <div className="p-3 bg-amber-500/10 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-600 dark:text-amber-400">Usage Warning</p>
                      <p className="text-sm text-muted-foreground">
                        {dailyUsagePercent > 80 && 'Daily usage is above 80%. '}
                        {monthlyUsagePercent > 80 && 'Monthly usage is above 80%. '}
                        Consider increasing limits or reducing usage.
                      </p>
                    </div>
                  </div>
                )}

                <Button onClick={handleSaveTokenLimits} disabled={isSaving} className="w-full">
                  {isSaving ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Token Limits
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usage Logs */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Usage Logs
                    </CardTitle>
                    <CardDescription>
                      Recent DeepSeek R1 usage activity
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={loadUsageLogs} disabled={isLoadingLogs}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {usageLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No usage logs yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {usageLogs.map((log) => (
                        <div key={log.id} className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {log.status === 'success' ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="font-medium capitalize">{log.request_type}</span>
                              <Badge variant="outline" className="text-xs">
                                {log.total_tokens || 0} tokens
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), 'MMM d, HH:mm')}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {(log.response_time_ms / 1000).toFixed(2)}s
                            </span>
                            <span className="flex items-center gap-1">
                              <Brain className="h-3 w-3" />
                              R1
                            </span>
                            {log.error_message && (
                              <span className="text-red-500 truncate max-w-xs">
                                {log.error_message}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminAI;
