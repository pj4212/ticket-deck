import { useState } from 'react';
import { Lock, ShieldX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function VisibilityGate({ event, accessGranted, onAccessGranted }) {
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');

  if (!event) return null;

  // Private invite only
  if (event.visibility_mode === 'private_invite_only') {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
          <ShieldX className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-foreground">Invite Only</h1>
        <p className="text-muted-foreground">
          This event is private and requires an invitation to access.
        </p>
        {event.workspace_id && (
          <p className="text-sm text-muted-foreground mt-4">
            Contact the event organiser for access.
          </p>
        )}
      </div>
    );
  }

  // Password protected
  if (event.visibility_mode === 'password_protected' && !accessGranted) {
    const handleSubmit = () => {
      if (passwordInput === event.access_password) {
        onAccessGranted();
        setError('');
      } else {
        setError('Incorrect password. Please try again.');
      }
    };

    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-foreground">Password Required</h1>
        <p className="text-muted-foreground mb-6">
          Enter the event password to view details and book tickets.
        </p>
        <div className="space-y-3 max-w-xs mx-auto">
          <Input
            type="password"
            placeholder="Enter event password"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="text-center"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={handleSubmit}>Access Event</Button>
        </div>
      </div>
    );
  }

  return null;
}