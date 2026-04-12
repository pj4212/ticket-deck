import { useState } from 'react';
import { Lock, ShieldAlert } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function VisibilityGate({ event, accessGranted, onAccessGranted }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!event) return null;

  // Private invite-only
  if (event.visibility_mode === 'private_invite_only') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-sm px-4">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold mb-2">Private Event</h1>
          <p className="text-muted-foreground text-sm">This event is by invitation only.</p>
        </div>
      </div>
    );
  }

  // Password protected
  if (event.visibility_mode === 'password_protected' && !accessGranted) {
    const handleSubmit = (e) => {
      e.preventDefault();
      if (password === event.access_password) {
        onAccessGranted?.();
      } else {
        setError('Incorrect password');
      }
    };

    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-sm w-full px-4">
          <div className="text-center mb-6">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold mb-1">{event.name}</h1>
            <p className="text-muted-foreground text-sm">This event requires a password to access.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="password"
              placeholder="Enter access password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">Access Event</Button>
          </form>
        </div>
      </div>
    );
  }

  return null;
}