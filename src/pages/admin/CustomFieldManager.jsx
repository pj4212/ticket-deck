import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus, Edit, Zap, BarChart3, FileText } from 'lucide-react';
import { toast } from 'sonner';

const PRESETS = [
  { category: 'demographics', label: 'Demographics', icon: '👤', desc: 'Age, gender, location' },
  { category: 'marketing', label: 'Marketing', icon: '📊', desc: 'Referral source, opt-in' },
  { category: 'dietary', label: 'Dietary', icon: '🍽', desc: 'Requirements, allergies' },
  { category: 'accessibility', label: 'Accessibility', icon: '♿', desc: 'Access needs, wheelchair' },
  { category: 'membership', label: 'Membership', icon: '🎫', desc: 'ID, member type' },
];

export default function CustomFieldManager() {
  const { workspaceId } = useOutletContext();
  const [fields, setFields] = useState([]);
  const [options, setOptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [editField, setEditField] = useState(null);
  const [saving, setSaving] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState(null);

  useEffect(() => { load(); }, [workspaceId]);

  async function load() {
    const filter = workspaceId ? { workspace_id: workspaceId } : {};
    const [defs, opts] = await Promise.all([
      base44.entities.CustomFieldDefinition.filter(filter),
      base44.entities.CustomFieldOption.filter({}),
    ]);
    setFields(defs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
    const optMap = {};
    opts.forEach(o => { (optMap[o.field_definition_id] = optMap[o.field_definition_id] || []).push(o); });
    setOptions(optMap);
    setLoading(false);
  }

  const handleSaveField = async () => {
    setSaving(true);
    const data = {
      workspace_id: workspaceId, applies_to: editField.applies_to, label: editField.label,
      field_key: editField.field_key || editField.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      field_type: editField.field_type, is_required: editField.is_required || false,
      help_text: editField.help_text || '', is_reportable: editField.is_reportable !== false,
      preset_category: editField.preset_category || 'custom',
      sort_order: Number(editField.sort_order) || 0, is_active: editField.is_active !== false,
    };
    if (editField.id) { await base44.entities.CustomFieldDefinition.update(editField.id, data); }
    else { await base44.entities.CustomFieldDefinition.create(data); }
    toast.success('Field saved');
    setEditField(null); setSaving(false); load();
  };

  const handleApplyPreset = async (category) => {
    setApplyingPreset(category);
    await base44.functions.invoke('customFieldReport', { action: 'apply_preset', workspace_id: workspaceId, category });
    toast.success(`${category} preset applied`);
    setApplyingPreset(null);
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Custom Fields</h1>
          <p className="text-sm text-muted-foreground">Configure checkout questions and attendee data collection.</p>
        </div>
        <Button size="sm" onClick={() => setEditField({ applies_to: 'checkout', field_type: 'text', is_active: true, is_reportable: true })}>
          <Plus className="h-4 w-4 mr-1.5" />Add Field
        </Button>
      </div>

      <Tabs defaultValue="fields">
        <TabsList><TabsTrigger value="fields">Custom Fields</TabsTrigger><TabsTrigger value="presets">Quick Presets</TabsTrigger></TabsList>

        <TabsContent value="fields" className="mt-4 space-y-2">
          {fields.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-1">No custom fields</h2>
              <p className="text-sm text-muted-foreground mb-4">Add fields or apply a preset to get started.</p>
            </div>
          )}
          {fields.map(f => (
            <div key={f.id} className={`bg-card border rounded-lg p-3 flex items-center gap-3 ${f.is_active ? 'border-border' : 'border-border/50 opacity-60'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{f.label}</p>
                  <Badge variant="outline" className="text-xs">{f.field_type}</Badge>
                  <Badge variant="secondary" className="text-xs">{f.applies_to}</Badge>
                  {f.is_required && <Badge className="text-xs bg-orange-500/15 text-orange-400">Required</Badge>}
                  {f.is_reportable && <Badge className="text-xs bg-blue-500/15 text-blue-400"><BarChart3 className="h-3 w-3 mr-0.5" />Reportable</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{f.field_key}{f.help_text ? ` · ${f.help_text}` : ''}</p>
                {options[f.id]?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {options[f.id].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(o => (
                      <Badge key={o.id} variant="outline" className="text-xs">{o.label}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditField({ ...f })}><Edit className="h-4 w-4" /></Button>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="presets" className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">Apply common field sets with one click. Existing fields won't be duplicated.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PRESETS.map(p => (
              <div key={p.category} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{p.icon}</span>
                  <p className="font-semibold">{p.label}</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{p.desc}</p>
                <Button size="sm" variant="outline" onClick={() => handleApplyPreset(p.category)} disabled={applyingPreset === p.category}>
                  {applyingPreset === p.category ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Zap className="h-4 w-4 mr-1.5" />}
                  Apply
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editField} onOpenChange={(o) => !o && setEditField(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editField?.id ? 'Edit Field' : 'Add Custom Field'}</DialogTitle></DialogHeader>
          {editField && (
            <div className="space-y-3">
              <div><Label>Label</Label><Input value={editField.label || ''} onChange={e => setEditField(p => ({ ...p, label: e.target.value, field_key: p.id ? p.field_key : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_') }))} /></div>
              <div><Label>Field Key</Label><Input value={editField.field_key || ''} onChange={e => setEditField(p => ({ ...p, field_key: e.target.value }))} className="font-mono text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Type</Label>
                  <Select value={editField.field_type} onValueChange={v => setEditField(p => ({ ...p, field_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['text', 'email', 'number', 'dropdown', 'radio', 'checkbox', 'textarea', 'date'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Applies To</Label>
                  <Select value={editField.applies_to} onValueChange={v => setEditField(p => ({ ...p, applies_to: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['checkout', 'ticket', 'order', 'event', 'event_template'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Help Text</Label><Input value={editField.help_text || ''} onChange={e => setEditField(p => ({ ...p, help_text: e.target.value }))} /></div>
              <div className="flex items-center justify-between"><Label>Required</Label><Switch checked={editField.is_required || false} onCheckedChange={v => setEditField(p => ({ ...p, is_required: v }))} /></div>
              <div className="flex items-center justify-between"><Label>Include in Reports</Label><Switch checked={editField.is_reportable !== false} onCheckedChange={v => setEditField(p => ({ ...p, is_reportable: v }))} /></div>
              <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={editField.is_active !== false} onCheckedChange={v => setEditField(p => ({ ...p, is_active: v }))} /></div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditField(null)}>Cancel</Button>
                <Button onClick={handleSaveField} disabled={saving || !editField.label}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}Save</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}