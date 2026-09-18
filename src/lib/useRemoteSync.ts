import type { Session } from '@supabase/supabase-js';
import { useEffect, useRef, useState, type Dispatch } from 'react';
import { snapshotOf, type Action, type PlannerState } from '../state/planner';
import { loadSnapshot, writeChanges, type Snapshot } from './remote';
import { currentSession, onAuthChange, signOut } from './supabase/auth';
import { isConfigured } from './supabase/client';

export type Phase = 'booting' | 'signed-out' | 'ready';

export interface RemoteSync {
  phase: Phase;
  email: string | null;
  saveFailed: boolean;
  signOut: () => void;
}

const NOTHING: Snapshot = { pantry: [], plan: [], grocery: [] };

/**
 * Mirrors the reducer into Supabase: hydrate on sign-in, then write only what changed on every
 * subsequent state change. Supabase is the only source of the fridge, the week and the list — an
 * account with no rows starts empty rather than being filled from anything in the bundle.
 */
export function useRemoteSync(state: PlannerState, dispatch: Dispatch<Action>): RemoteSync {
  // Nothing to show without credentials, so the sign-in page says so rather than the app opening.
  const [phase, setPhase] = useState<Phase>(isConfigured ? 'booting' : 'signed-out');
  const [session, setSession] = useState<Session | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const synced = useRef<Snapshot | null>(null);

  useEffect(() => {
    if (!isConfigured) return;

    currentSession().then((existing) => {
      setSession(existing);
      if (!existing) setPhase('signed-out');
    });

    return onAuthChange((next) => {
      setSession(next);
      if (!next) {
        synced.current = null;
        setPhase('signed-out');
      }
    });
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!isConfigured || !userId) return;
    let cancelled = false;

    (async () => {
      try {
        const stored = (await loadSnapshot(userId)) ?? NOTHING;
        if (cancelled) return;
        dispatch({ type: 'state/hydrate', snapshot: stored });
        synced.current = stored;
        setSaveFailed(false);
      } catch (error) {
        console.error('Could not load your saved fridge', error);
        setSaveFailed(true);
      } finally {
        if (!cancelled) setPhase('ready');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, dispatch]);

  useEffect(() => {
    const prev = synced.current;
    if (!isConfigured || !userId || phase !== 'ready' || !prev) return;

    const next = snapshotOf(state);
    const unchanged =
      prev.pantry === next.pantry && prev.plan === next.plan && prev.grocery === next.grocery;
    if (unchanged) return;

    synced.current = next;
    writeChanges(userId, prev, next)
      .then(() => setSaveFailed(false))
      .catch((error) => {
        console.error('Could not save that change', error);
        setSaveFailed(true);
      });
  }, [state, userId, phase]);

  return {
    phase,
    email: session?.user.email ?? null,
    saveFailed,
    signOut,
  };
}
