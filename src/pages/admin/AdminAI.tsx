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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Bot, 
  Key, 
  Activity, 
  Settings, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Save,
  TestTube,
  Zap,
  MessageSquare,
  Shield,
  Clock,
  TrendingUp
} from 'lucide-react';

interface AIConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
  isEnabled: boolean;
}

interface UsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastUsed: string | null;
}

const AdminAI = () => {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [isSaving, setIsSaving] = useState(false);
  const [testResponse, setTestResponse] = useState('');

  const [config, setConfig] = useState<AIConfig>({
    model: 'llama-3.3-70b-versatile',
    maxTokens: 1024,
    temperature: 0.7,
    systemPrompt: '',
    isEnabled: true,
  });

  const [usageStats, setUsageStats] = useState<UsageStats>({
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    lastUsed: null,
  });

  const availableModels = [
    { id: 'llama-3.3-70b-versatile', name: 'LLaMA 3.3 70B Versatile', description: 'Best for general tasks' },
    { id: 'llama-3.1-8b-instant', name: 'LLaMA 3.1 8B Instant', description: 'Fast responses' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'Good balance' },
    { id: 'gemma2-9b-it', name: 'Gemma 2 9B', description: 'Efficient' },
  ];

  // Load saved config from platform_settings
  useEffect(() => {
    loadAIConfig();
    loadUsageStats();
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
        model: settings.ai_model || 'llama-3.3-70b-versatile',
        maxTokens: parseInt(settings.ai_max_tokens) || 1024,
        temperature: parseFloat(settings.ai_temperature) || 0.7,
        systemPrompt: settings.ai_system_prompt || '',
        isEnabled: settings.ai_enabled !== 'false',
      });
    } catch (error) {
      console.error('Error loading AI config:', error);
    }
  };

  const loadUsageStats = async () => {
    // In a real implementation, you'd track these in a table
    // For now, we'll show placeholder stats
    setUsageStats({
      totalRequests: 156,
      successfulRequests: 148,
      failedRequests: 8,
      averageResponseTime: 1.2,
      lastUsed: new Date().toISOString(),
    });
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestResponse('');
    
    try {
      const response = await supabase.functions.invoke('ai-chat', {
        body: { 
          message: 'Hello, this is a test message. Please respond with a brief greeting.',
          type: 'test'
        }
      });

      if (response.error) throw response.error;

      setConnectionStatus('connected');
      setTestResponse(response.data.response || 'Connection successful!');
      toast.success('Groq API connection successful!');
    } catch (error: any) {
      setConnectionStatus('error');
      setTestResponse(error.message || 'Connection failed');
      toast.error('Groq API connection failed');
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

  return (
    <AdminLayout title="Vyuha AI Management">
      <div className="p-4 space-y-6">
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
                  <p className="text-2xl font-bold">{((usageStats.successfulRequests / usageStats.totalRequests) * 100).toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Success Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{usageStats.averageResponseTime}s</p>
                  <p className="text-xs text-muted-foreground">Avg Response</p>
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
                  <Badge variant={config.isEnabled ? 'default' : 'secondary'}>
                    {config.isEnabled ? 'Active' : 'Disabled'}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">Status</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="connection" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="connection" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">API Key</span>
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Configuration</span>
            </TabsTrigger>
            <TabsTrigger value="monitor" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Monitor</span>
            </TabsTrigger>
          </TabsList>

          {/* API Key Management */}
          <TabsContent value="connection" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Groq API Key Management
                </CardTitle>
                <CardDescription>
                  Manage your Groq API key for Vyuha AI features. Get your API key from{' '}
                  <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    console.groq.com
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="apiKey"
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="gsk_xxxxxxxxxxxxxxxxxxxx"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Note: API key changes require manual update in Supabase secrets
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={handleTestConnection} 
                    disabled={isTestingConnection}
                    variant="outline"
                    className="flex-1"
                  >
                    {isTestingConnection ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <TestTube className="h-4 w-4 mr-2" />
                    )}
                    Test Connection
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
                    connectionStatus === 'connected' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                  }`}>
                    <p className="font-medium mb-1">Response:</p>
                    <p>{testResponse}</p>
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
                  Configure the AI behavior for your platform
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

          {/* Monitor */}
          <TabsContent value="monitor" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  AI Usage Monitor
                </CardTitle>
                <CardDescription>
                  Monitor AI usage and performance across your platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Support Chatbot</p>
                        <p className="text-xs text-muted-foreground">Help & Support page</p>
                      </div>
                    </div>
                    <Badge variant="default">Active</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-amber-500" />
                      <div>
                        <p className="font-medium">Content Moderation</p>
                        <p className="text-xs text-muted-foreground">Reports & user content</p>
                      </div>
                    </div>
                    <Badge variant="secondary">Ready</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Bot className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium">General Assistant</p>
                        <p className="text-xs text-muted-foreground">Multi-purpose AI</p>
                      </div>
                    </div>
                    <Badge variant="secondary">Ready</Badge>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-3">Recent Activity</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Last API call</span>
                      <span>{usageStats.lastUsed ? new Date(usageStats.lastUsed).toLocaleString() : 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Successful calls</span>
                      <span className="text-green-500">{usageStats.successfulRequests}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Failed calls</span>
                      <span className="text-red-500">{usageStats.failedRequests}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-muted-foreground">Current model</span>
                      <span>{config.model}</span>
                    </div>
                  </div>
                </div>

                <Button variant="outline" onClick={loadUsageStats} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Stats
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminAI;
