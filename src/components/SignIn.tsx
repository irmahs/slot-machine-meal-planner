import { useState } from 'react';
import { sendMagicLink } from '../lib/supabase/auth';
import { isConfigured } from '../lib/supabase/client';

type Status = { tone: 'idle' | 'error'; message: string };

export default function SignIn({ onGuest }: { onGuest: () => void }) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<Status>({ tone: 'idle', message: '' });

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const address = email.trim();
    if (!address) return;

    setSending(true);
    const { error } = await sendMagicLink(address);
    setSending(false);
    setStatus(
      error
        ? { tone: 'error', message: error }
        : { tone: 'idle', message: `Link sent to ${address}. Open it on this device.` },
    );
  }

  return (
    <div className="signin">
      <h1 className="signin-brand">Spin Supper</h1>
      <p className="signin-blurb">
        {isConfigured
          ? 'Your fridge, your week and your list live under your email address. Enter it and we’ll send a sign-in link — no password to remember.'
          : 'Saving your fridge needs a database, and this copy isn’t connected to one yet. You can still have a look around.'}
      </p>
      <form className="signin-form" onSubmit={send}>
        <input
          className="signin-input"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          aria-label="Email address"
          disabled={!isConfigured}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="signin-send" disabled={sending || !isConfigured}>
          {sending ? 'Sending…' : 'Send link'}
        </button>
      </form>
      <p className="signin-status" data-tone={status.tone} aria-live="polite">
        {status.message}
      </p>

      <div className="signin-or">
        <button type="button" className="signin-guest" onClick={onGuest}>
          Have a look around
        </button>
        <p className="signin-guestNote">
          No account, a basket to play with, and nothing saved — close the tab and it’s gone.
        </p>
      </div>
    </div>
  );
}
