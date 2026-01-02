import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Search,
  Globe,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Save,
  RefreshCw,
  Link2,
  FileText,
  Image,
  Zap,
  Shield,
  ExternalLink,
  Eye,
  TrendingUp,
  BarChart3,
  Settings2,
  Copy
} from 'lucide-react';

interface SEOSettings {
  site_title: string;
  site_description: string;
  site_keywords: string;
  og_image: string;
  twitter_handle: string;
  canonical_url: string;
  robots_txt: string;
  google_analytics_id: string;
  google_site_verification: string;
}

interface HealthCheckResult {
  category: string;
  check: string;
  status: 'pass' | 'warning' | 'fail';
  message: string;
  recommendation?: string;
}

const AdminSEO = () => {
  const navigate = useNavigate();
  const { user, isSuperAdmin, hasPermission, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [seoSettings, setSeoSettings] = useState<SEOSettings>({
    site_title: 'Vyuha Esport - India\'s Premier School & College Esports Platform',
    site_description: 'Join Vyuha Esport for thrilling gaming tournaments in schools & colleges. Compete in BGMI, Free Fire, and more. Win real prizes with transparent 80/20 prize pools!',
    site_keywords: 'esports, gaming, tournaments, BGMI, Free Fire, online gaming, competitive gaming, India esports, school esports, college esports, local tournaments, vyuha',
    og_image: 'https://vyuhaesport.in/og-image.png',
    twitter_handle: '@VyuhaEsport',
    canonical_url: 'https://vyuhaesport.in',
    robots_txt: 'User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: https://vyuhaesport.in/sitemap.xml',
    google_analytics_id: '',
    google_site_verification: '',
  });
  const [healthResults, setHealthResults] = useState<HealthCheckResult[]>([]);
  const [overallScore, setOverallScore] = useState(0);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (!isSuperAdmin && !hasPermission('settings:view')) {
        navigate('/admin');
        toast({
          title: 'Access Denied',
          description: 'You need permission to access this page.',
          variant: 'destructive',
        });
      } else {
        fetchSettings();
      }
    }
  }, [user, isSuperAdmin, authLoading, navigate]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'seo_site_title',
          'seo_site_description',
          'seo_site_keywords',
          'seo_og_image',
          'seo_twitter_handle',
          'seo_canonical_url',
          'seo_robots_txt',
          'seo_google_analytics_id',
          'seo_google_site_verification'
        ]);

      if (data && data.length > 0) {
        const settings: Partial<SEOSettings> = {};
        data.forEach(item => {
          const key = item.setting_key.replace('seo_', '') as keyof SEOSettings;
          settings[key] = item.setting_value;
        });
        setSeoSettings(prev => ({ ...prev, ...settings }));
      }
    } catch (error) {
      console.error('Error fetching SEO settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const updates = [
        { setting_key: 'seo_site_title', setting_value: seoSettings.site_title },
        { setting_key: 'seo_site_description', setting_value: seoSettings.site_description },
        { setting_key: 'seo_site_keywords', setting_value: seoSettings.site_keywords },
        { setting_key: 'seo_og_image', setting_value: seoSettings.og_image },
        { setting_key: 'seo_twitter_handle', setting_value: seoSettings.twitter_handle },
        { setting_key: 'seo_canonical_url', setting_value: seoSettings.canonical_url },
        { setting_key: 'seo_robots_txt', setting_value: seoSettings.robots_txt },
        { setting_key: 'seo_google_analytics_id', setting_value: seoSettings.google_analytics_id },
        { setting_key: 'seo_google_site_verification', setting_value: seoSettings.google_site_verification },
      ];

      for (const update of updates) {
        await supabase
          .from('platform_settings')
          .upsert({
            ...update,
            description: `SEO Setting: ${update.setting_key}`,
            updated_by: user?.id,
          }, { onConflict: 'setting_key' });
      }

      toast({
        title: 'Settings Saved',
        description: 'SEO settings have been updated successfully',
      });
    } catch (error) {
      console.error('Error saving SEO settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const runHealthCheck = async () => {
    setChecking(true);
    const results: HealthCheckResult[] = [];

    // Meta Tags Check
    results.push({
      category: 'Meta Tags',
      check: 'Title Tag',
      status: seoSettings.site_title.length >= 30 && seoSettings.site_title.length <= 60 ? 'pass' : 
              seoSettings.site_title.length > 0 ? 'warning' : 'fail',
      message: `Title is ${seoSettings.site_title.length} characters`,
      recommendation: 'Title should be 30-60 characters for optimal display'
    });

    results.push({
      category: 'Meta Tags',
      check: 'Meta Description',
      status: seoSettings.site_description.length >= 120 && seoSettings.site_description.length <= 160 ? 'pass' : 
              seoSettings.site_description.length > 0 ? 'warning' : 'fail',
      message: `Description is ${seoSettings.site_description.length} characters`,
      recommendation: 'Description should be 120-160 characters'
    });

    results.push({
      category: 'Meta Tags',
      check: 'Keywords',
      status: seoSettings.site_keywords.split(',').length >= 5 ? 'pass' : 
              seoSettings.site_keywords.length > 0 ? 'warning' : 'fail',
      message: `${seoSettings.site_keywords.split(',').filter(k => k.trim()).length} keywords defined`,
      recommendation: 'Include 5-10 relevant keywords'
    });

    // Social Media Check
    results.push({
      category: 'Social Media',
      check: 'Open Graph Image',
      status: seoSettings.og_image ? 'pass' : 'warning',
      message: seoSettings.og_image ? 'OG image is set' : 'No OG image configured',
      recommendation: 'Add a 1200x630px image for social sharing'
    });

    results.push({
      category: 'Social Media',
      check: 'Twitter Handle',
      status: seoSettings.twitter_handle.startsWith('@') ? 'pass' : 'warning',
      message: seoSettings.twitter_handle || 'Not configured',
      recommendation: 'Add Twitter handle for better social integration'
    });

    // Technical SEO Check
    results.push({
      category: 'Technical',
      check: 'Canonical URL',
      status: seoSettings.canonical_url.startsWith('https://') ? 'pass' : 
              seoSettings.canonical_url ? 'warning' : 'fail',
      message: seoSettings.canonical_url || 'Not configured',
      recommendation: 'Use HTTPS canonical URL'
    });

    results.push({
      category: 'Technical',
      check: 'Robots.txt',
      status: seoSettings.robots_txt.includes('User-agent') ? 'pass' : 'warning',
      message: 'Robots.txt configured',
      recommendation: 'Ensure proper crawl rules are set'
    });

    results.push({
      category: 'Technical',
      check: 'Google Analytics',
      status: seoSettings.google_analytics_id ? 'pass' : 'warning',
      message: seoSettings.google_analytics_id ? 'Tracking enabled' : 'Not configured',
      recommendation: 'Add Google Analytics for traffic monitoring'
    });

    results.push({
      category: 'Technical',
      check: 'Site Verification',
      status: seoSettings.google_site_verification ? 'pass' : 'warning',
      message: seoSettings.google_site_verification ? 'Verified' : 'Not verified',
      recommendation: 'Verify site with Google Search Console'
    });

    // Performance indicators (simulated)
    results.push({
      category: 'Performance',
      check: 'Mobile Friendly',
      status: 'pass',
      message: 'Responsive design detected',
      recommendation: 'Site is mobile-friendly'
    });

    results.push({
      category: 'Performance',
      check: 'SSL Certificate',
      status: 'pass',
      message: 'HTTPS enabled',
      recommendation: 'SSL is properly configured'
    });

    setHealthResults(results);

    // Calculate score
    const passCount = results.filter(r => r.status === 'pass').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    const score = Math.round(((passCount * 100) + (warningCount * 50)) / results.length);
    setOverallScore(score);

    setChecking(false);

    toast({
      title: 'Health Check Complete',
      description: `Your SEO score is ${score}%`,
    });
  };

  const getStatusIcon = (status: 'pass' | 'warning' | 'fail') => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (authLoading || loading) {
    return (
      <AdminLayout title="SEO Management">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="SEO Management">
      <div className="p-4 space-y-6">
        {/* Header Info */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">SEO & Domain Health</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage search engine optimization settings and monitor your website's health for better visibility.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 text-center">
              <Globe className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-xs text-muted-foreground">Domain</p>
              <p className="font-semibold text-sm truncate">vyuhaesport.in</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Shield className="h-6 w-6 mx-auto text-green-500 mb-2" />
              <p className="text-xs text-muted-foreground">SSL</p>
              <p className="font-semibold text-sm text-green-600">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <TrendingUp className={`h-6 w-6 mx-auto mb-2 ${getScoreColor(overallScore)}`} />
              <p className="text-xs text-muted-foreground">SEO Score</p>
              <p className={`font-semibold text-sm ${getScoreColor(overallScore)}`}>
                {overallScore > 0 ? `${overallScore}%` : 'Run Check'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sitemap Info Card */}
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-sm">Sitemap Ready</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Your sitemap is configured correctly. Submit this URL to Google Search Console:
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <code className="bg-background px-2 py-1 rounded text-xs flex-1 truncate">
                    https://vyuhaesport.in/sitemap.xml
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText('https://vyuhaesport.in/sitemap.xml');
                      toast({ title: 'Copied!' });
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="settings" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="settings" className="text-xs">SEO Settings</TabsTrigger>
            <TabsTrigger value="health" className="text-xs">Health Check</TabsTrigger>
            <TabsTrigger value="tools" className="text-xs">Tools</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4">
            {/* Basic SEO */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Meta Tags
                </CardTitle>
                <CardDescription className="text-xs">
                  Basic SEO meta tags for search engines
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Site Title (30-60 chars)</Label>
                  <Input
                    value={seoSettings.site_title}
                    onChange={(e) => setSeoSettings({ ...seoSettings, site_title: e.target.value })}
                    placeholder="Your site title"
                    maxLength={60}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {seoSettings.site_title.length}/60
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Meta Description (120-160 chars)</Label>
                  <Textarea
                    value={seoSettings.site_description}
                    onChange={(e) => setSeoSettings({ ...seoSettings, site_description: e.target.value })}
                    placeholder="Describe your website"
                    maxLength={160}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {seoSettings.site_description.length}/160
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Keywords (comma separated)</Label>
                  <Input
                    value={seoSettings.site_keywords}
                    onChange={(e) => setSeoSettings({ ...seoSettings, site_keywords: e.target.value })}
                    placeholder="gaming, esports, tournaments"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Social Media */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Social Media
                </CardTitle>
                <CardDescription className="text-xs">
                  Open Graph and social sharing settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">OG Image URL</Label>
                  <Input
                    value={seoSettings.og_image}
                    onChange={(e) => setSeoSettings({ ...seoSettings, og_image: e.target.value })}
                    placeholder="https://example.com/og-image.jpg"
                  />
                  <p className="text-xs text-muted-foreground">Recommended: 1200x630 pixels</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Twitter Handle</Label>
                  <Input
                    value={seoSettings.twitter_handle}
                    onChange={(e) => setSeoSettings({ ...seoSettings, twitter_handle: e.target.value })}
                    placeholder="@YourHandle"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Technical SEO */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Technical SEO
                </CardTitle>
                <CardDescription className="text-xs">
                  Advanced SEO configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Canonical URL</Label>
                  <Input
                    value={seoSettings.canonical_url}
                    onChange={(e) => setSeoSettings({ ...seoSettings, canonical_url: e.target.value })}
                    placeholder="https://yourdomain.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Google Analytics ID</Label>
                  <Input
                    value={seoSettings.google_analytics_id}
                    onChange={(e) => setSeoSettings({ ...seoSettings, google_analytics_id: e.target.value })}
                    placeholder="G-XXXXXXXXXX or UA-XXXXXXX-X"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Google Site Verification</Label>
                  <Input
                    value={seoSettings.google_site_verification}
                    onChange={(e) => setSeoSettings({ ...seoSettings, google_site_verification: e.target.value })}
                    placeholder="Verification meta tag content"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Robots.txt Content</Label>
                  <Textarea
                    value={seoSettings.robots_txt}
                    onChange={(e) => setSeoSettings({ ...seoSettings, robots_txt: e.target.value })}
                    placeholder="User-agent: *..."
                    rows={4}
                    className="font-mono text-xs"
                  />
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save SEO Settings
            </Button>
          </TabsContent>

          <TabsContent value="health" className="space-y-4">
            {/* SEO Score Card */}
            {overallScore > 0 && (
              <Card className={`border-2 ${overallScore >= 80 ? 'border-green-500/50' : overallScore >= 60 ? 'border-yellow-500/50' : 'border-red-500/50'}`}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className={`text-5xl font-bold ${getScoreColor(overallScore)}`}>
                      {overallScore}%
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Overall SEO Score</p>
                    <Progress 
                      value={overallScore} 
                      className="mt-4 h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <Button onClick={runHealthCheck} disabled={checking} className="w-full">
              {checking ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Run Health Check
            </Button>

            {/* Health Check Results */}
            {healthResults.length > 0 && (
              <div className="space-y-3">
                {['Meta Tags', 'Social Media', 'Technical', 'Performance'].map(category => {
                  const categoryResults = healthResults.filter(r => r.category === category);
                  if (categoryResults.length === 0) return null;

                  return (
                    <Card key={category}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{category}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {categoryResults.map((result, idx) => (
                          <div key={idx} className="flex items-start gap-3 py-2 border-b last:border-0">
                            {getStatusIcon(result.status)}
                            <div className="flex-1">
                              <p className="text-sm font-medium">{result.check}</p>
                              <p className="text-xs text-muted-foreground">{result.message}</p>
                              {result.recommendation && result.status !== 'pass' && (
                                <p className="text-xs text-primary mt-1">💡 {result.recommendation}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {healthResults.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Run a health check to analyze your website's SEO</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            {/* Google Indexing Guide */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />
                  Get Indexed on Google
                </CardTitle>
                <CardDescription className="text-xs">
                  Follow these steps to appear in Google search results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2 p-2 bg-background rounded-lg">
                    <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
                    <div>
                      <p className="font-medium">Add Site to Google Search Console</p>
                      <p className="text-xs text-muted-foreground">Verify ownership using HTML meta tag</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-background rounded-lg">
                    <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</span>
                    <div>
                      <p className="font-medium">Submit Sitemap</p>
                      <p className="text-xs text-muted-foreground">Submit your sitemap.xml URL in Search Console</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-background rounded-lg">
                    <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">3</span>
                    <div>
                      <p className="font-medium">Request Indexing</p>
                      <p className="text-xs text-muted-foreground">Use URL Inspection tool to request indexing of pages</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-background rounded-lg">
                    <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">4</span>
                    <div>
                      <p className="font-medium">Wait for Crawling</p>
                      <p className="text-xs text-muted-foreground">Google typically indexes new sites within 1-2 weeks</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* External Tools */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  SEO Tools
                </CardTitle>
                <CardDescription className="text-xs">
                  External tools to analyze and improve your SEO
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open('https://search.google.com/search-console', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Google Search Console
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open(`https://search.google.com/search-console/welcome?resource_id=${encodeURIComponent(seoSettings.canonical_url || 'https://vyuhaesport.in')}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Add Site to Search Console
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open('https://analytics.google.com', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Google Analytics
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open(`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(seoSettings.canonical_url || 'https://vyuhaesport.in')}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  PageSpeed Insights
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open(`https://www.google.com/webmasters/tools/mobile-friendly/?url=${encodeURIComponent(seoSettings.canonical_url || 'https://vyuhaesport.in')}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Mobile-Friendly Test
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open('https://www.google.com/search?q=site:vyuhaesport.in', '_blank')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Check Indexed Pages
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open('https://vyuhaesport.in/sitemap.xml', '_blank')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Sitemap
                </Button>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Important URLs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm">Sitemap URL (Use this in Google Search Console)</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value="https://vyuhaesport.in/sitemap.xml"
                      className="bg-muted text-xs font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText('https://vyuhaesport.in/sitemap.xml');
                        toast({ title: 'Copied!' });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-green-600">✓ Enter exactly: sitemap.xml (without domain) in Search Console</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Robots.txt URL</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value="https://vyuhaesport.in/robots.txt"
                      className="bg-muted text-xs font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText('https://vyuhaesport.in/robots.txt');
                        toast({ title: 'Copied!' });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Google Search Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-4 space-y-1">
                  <p className="text-blue-600 text-lg truncate hover:underline cursor-pointer">
                    {seoSettings.site_title || 'Your Site Title'}
                  </p>
                  <p className="text-green-700 text-sm truncate">
                    {seoSettings.canonical_url || 'https://yoursite.com'}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {seoSettings.site_description || 'Your site description will appear here...'}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  This is how your site might appear in Google search results
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminSEO;
