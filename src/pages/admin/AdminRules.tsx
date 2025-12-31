import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ScrollText, Plus, Trash2, Edit2, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface RuleItem {
  id: string;
  title: string;
  content: string;
  game: string;
}

const RULES_SETTING_KEY = 'tournament_rules_config';

const AdminRules = () => {
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editDialog, setEditDialog] = useState<{ open: boolean; rule: RuleItem | null; index: number }>({ open: false, rule: null, index: -1 });
  const [previewDialog, setPreviewDialog] = useState<{ open: boolean; rule: RuleItem | null }>({ open: false, rule: null });
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    game: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', RULES_SETTING_KEY)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data?.setting_value) {
        try {
          const parsed = JSON.parse(data.setting_value);
          setRules(Array.isArray(parsed) ? parsed : []);
        } catch {
          setRules([]);
        }
      }
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveRules = async (updatedRules: RuleItem[]) => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('platform_settings')
        .select('id')
        .eq('setting_key', RULES_SETTING_KEY)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('platform_settings')
          .update({ setting_value: JSON.stringify(updatedRules) })
          .eq('setting_key', RULES_SETTING_KEY);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('platform_settings')
          .insert({
            setting_key: RULES_SETTING_KEY,
            setting_value: JSON.stringify(updatedRules),
            description: 'Tournament rules configuration',
          });
        if (error) throw error;
      }

      setRules(updatedRules);
      toast({ title: 'Saved', description: 'Rules saved successfully.' });
    } catch (error) {
      console.error('Error saving rules:', error);
      toast({ title: 'Error', description: 'Failed to save rules.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenCreate = () => {
    setFormData({ title: '', content: '', game: '' });
    setEditDialog({ open: true, rule: null, index: -1 });
  };

  const handleOpenEdit = (rule: RuleItem, index: number) => {
    setFormData({
      title: rule.title,
      content: rule.content,
      game: rule.game || '',
    });
    setEditDialog({ open: true, rule, index });
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({ title: 'Error', description: 'Title and content are required.', variant: 'destructive' });
      return;
    }

    const newRule: RuleItem = {
      id: editDialog.rule?.id || crypto.randomUUID(),
      title: formData.title.trim(),
      content: formData.content.trim(),
      game: formData.game.trim(),
    };

    let updatedRules: RuleItem[];
    if (editDialog.index >= 0) {
      updatedRules = [...rules];
      updatedRules[editDialog.index] = newRule;
    } else {
      updatedRules = [...rules, newRule];
    }

    await saveRules(updatedRules);
    setEditDialog({ open: false, rule: null, index: -1 });
  };

  const handleDelete = async (index: number) => {
    const updatedRules = rules.filter((_, i) => i !== index);
    await saveRules(updatedRules);
  };

  return (
    <AdminLayout title="Tournament Rules">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Manage Rules</h2>
            <p className="text-sm text-muted-foreground">
              Create and manage tournament rules that will be shown to players
            </p>
          </div>
          <Button onClick={handleOpenCreate} className="gap-2" disabled={saving}>
            <Plus className="h-4 w-4" />
            Add Rule
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : rules.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <ScrollText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No rules created yet</p>
              <Button onClick={handleOpenCreate} variant="outline" className="mt-4">
                Create First Rule
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rules.map((rule, index) => (
              <Card key={rule.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <ScrollText className="h-4 w-4 text-primary" />
                        {rule.title}
                        {rule.game && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            {rule.game}
                          </span>
                        )}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => setPreviewDialog({ open: true, rule })}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleOpenEdit(rule, index)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(index)}
                        disabled={saving}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                    {rule.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, rule: editDialog.rule, index: editDialog.index })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editDialog.rule ? 'Edit Rule' : 'Create Rule'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                placeholder="e.g., General Tournament Rules"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Game (Optional)</Label>
              <Input
                placeholder="e.g., Free Fire, BGMI (leave empty for all games)"
                value={formData.game}
                onChange={(e) => setFormData({ ...formData, game: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to apply to all games
              </p>
            </div>
            <div>
              <Label>Rules Content *</Label>
              <Textarea
                placeholder="Write your tournament rules here...

Example:
• All players must join the room 5 minutes before match starts
• Teaming up with enemy players is strictly prohibited
• Hacking or using any third-party tools will result in permanent ban
• Winner must submit screenshot within 10 minutes"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={12}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, rule: null, index: -1 })}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {editDialog.rule ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialog.open} onOpenChange={(open) => setPreviewDialog({ open, rule: previewDialog.rule })}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" />
              {previewDialog.rule?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="whitespace-pre-wrap text-sm">
            {previewDialog.rule?.content}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminRules;
