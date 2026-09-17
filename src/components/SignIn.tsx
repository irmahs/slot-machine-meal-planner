import { useState } from 'react';
import { sendMagicLink } from '../lib/supabase/auth';
import styles from './SignIn.module.css';

type Status = { tone: 'idle' | 'error'; message: string };

export default function SignIn() {
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
    <div className={styles.screen}>
      <h1 className={styles.brand}>Spin Supper</h1>
      <p className={styles.blurb}>
        Your fridge, your week and your list live under your email address. Enter it and we’ll send a
        sign-in link — no password to remember.
      </p>
      <form className={styles.form} onSubmit={send}>
        <input
          className={styles.input}
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          aria-label="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className={styles.send} disabled={sending}>
          {sending ? 'Sending…' : 'Send link'}
        </button>
      </form>
      <p className={styles.status} data-tone={status.tone} aria-live="polite">
        {status.message}
      </p>
    </div>
  );
}
