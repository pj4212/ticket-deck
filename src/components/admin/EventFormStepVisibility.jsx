import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Eye, Lock, EyeOff, Shield, Globe, FileText, Megaphone } from 'lucide-react';

const MODES = [
  { value: 'public_listed', label: 'Public', icon: Globe, desc: 'Visible on browse pages and search', color: 'text-emerald-500' },
  { value: 'unlisted', label: 'Unlisted', icon: EyeOff, desc: 'Only accessible via direct link', color: 'text-blue-500' },
  { value: 'password_protected', label: 'Password', icon: Lock, desc: 'Requires password to view', color: 'text-amber-500' },
  { value: 'private_invite_only', label: 'Private', icon: Shield, desc: 'Invite only, hidden from all', color: 'text-red-400' },
];

export default function EventFormStepVisibility({ form, updateForm }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Eye className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Visibility & Terms</h2>
      </div>

      {/* Visibility mode */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Event Visibility</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MODES.map(mode => (
            <button
              key={mode.value}
              type="button"
              onClick={() => updateForm('visibility_mode', mode.value)}
              className={`flex flex-col items-center gap-1.5 p-3 border rounded-xl transition-all text-center ${
                form.visibility_mode === mode.value
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border hover:border-primary/30'
              }`}
            >
              <mode.icon className={`h-5 w-5 ${mode.color}`} />
              <span className="text-xs font-semibold">{mode.label}</span>
              <span className="text-xs text-muted-foreground leading-tight">{mode.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Password */}
      {form.visibility_mode === 'password_protected' && (
        <div>
          <Label className="text-sm">Access Password <span className="text-destructive">*</span></Label>
          <Input
            value={form.access_password || ''}
            onChange={e => updateForm('access_password', e.target.value)}
            placeholder="Enter event password"
            className="max-w-sm"
          />
        </div>
      )}

      {/* Waiver */}
      <div className="border-t border-border pt-6">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-semibold">Participant Waiver</Label>
        </div>
        <Textarea
          value={form.waiver_text || ''}
          onChange={e => updateForm('waiver_text', e.target.value)}
          rows={4}
          placeholder="Enter waiver text that attendees must accept before booking... (leave blank to skip)"
        />
        <p className="text-xs text-muted-foreground mt-1">If provided, attendees must accept this waiver during checkout.</p>
      </div>

      {/* Terms */}
      <div className="border-t border-border pt-6">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-semibold">Terms & Conditions</Label>
        </div>
        <Textarea
          value={form.terms_text || ''}
          onChange={e => updateForm('terms_text', e.target.value)}
          rows={4}
          placeholder="Enter terms & conditions text... (leave blank to skip)"
        />
        <p className="text-xs text-muted-foreground mt-1">If provided, attendees must agree to these terms during checkout.</p>
      </div>

      {/* Marketing opt-in */}
      <div className="border-t border-border pt-6">
        <div className="flex items-center gap-2 mb-3">
          <Megaphone className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-semibold">Marketing Opt-In</Label>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <Switch
            checked={form.show_marketing_opt_in || false}
            onCheckedChange={v => updateForm('show_marketing_opt_in', v)}
          />
          <Label className="text-sm">Show marketing opt-in checkbox at checkout</Label>
        </div>
        {form.show_marketing_opt_in && (
          <div>
            <Label className="text-xs">Custom Opt-In Label</Label>
            <Input
              value={form.marketing_opt_in_label || ''}
              onChange={e => updateForm('marketing_opt_in_label', e.target.value)}
              placeholder="Yes, I'd like to receive updates and news from the event organiser."
            />
          </div>
        )}
      </div>
    </div>
  );
}