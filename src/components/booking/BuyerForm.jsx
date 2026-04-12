import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone } from "lucide-react";

export default function BuyerForm({ buyer, onChange, errors }) {
  const update = (field, value) => {
    onChange({ ...buyer, [field]: value });
  };

  const fieldError = (field) => errors?.[field];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <User className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Your Details</h2>
      </div>
      <p className="text-sm text-muted-foreground -mt-2">We'll send your tickets and receipt to this email.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="buyer-first" className="text-sm">
            First Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="buyer-first"
            value={buyer.first_name}
            onChange={e => update('first_name', e.target.value)}
            placeholder="First name"
            className={fieldError('first_name') ? 'border-destructive' : ''}
          />
          {fieldError('first_name') && <p className="text-xs text-destructive mt-1">{fieldError('first_name')}</p>}
        </div>
        <div>
          <Label htmlFor="buyer-last" className="text-sm">
            Last Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="buyer-last"
            value={buyer.last_name}
            onChange={e => update('last_name', e.target.value)}
            placeholder="Last name"
            className={fieldError('last_name') ? 'border-destructive' : ''}
          />
          {fieldError('last_name') && <p className="text-xs text-destructive mt-1">{fieldError('last_name')}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="buyer-email" className="text-sm">
          <span className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            Email <span className="text-destructive">*</span>
          </span>
        </Label>
        <Input
          id="buyer-email"
          type="email"
          value={buyer.email}
          onChange={e => update('email', e.target.value)}
          placeholder="email@example.com"
          className={fieldError('email') ? 'border-destructive' : ''}
        />
        {fieldError('email') && <p className="text-xs text-destructive mt-1">{fieldError('email')}</p>}
      </div>

      <div>
        <Label htmlFor="buyer-phone" className="text-sm">
          <span className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" />
            Phone <span className="text-muted-foreground font-normal">(optional)</span>
          </span>
        </Label>
        <Input
          id="buyer-phone"
          type="tel"
          value={buyer.phone || ''}
          onChange={e => update('phone', e.target.value)}
          placeholder="0400 000 000"
        />
      </div>
    </div>
  );
}