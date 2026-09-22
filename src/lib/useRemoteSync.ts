import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react';
import { snapshotOf, type Action, type PlannerState } from '../state/planner';
import { addDaysISO } from './dates';
import * as guest from './guest';
import { loadSnapshot, writeChanges, EMPTY, type Snapshot } from './remote';
import { currentSession, onAuthChange, signOut as supabaseSignOut } from './supabase/auth';
import { isConfigured } from './supabase/client';

export type Phase = 'booting' | 'signed-out' | 'ready';

export interface RemoteSync {
  phase: Phase;
  email: string | null;
  /** Looking around without an account: this tab only, nothing written to Supabase. */
  guest: boolean;
  saveFailed: boolean;
  signOut: () => void;
  startGuest: () => void;
}

/**
 * Mirrors the reducer into storage: hydrate on sign-in, then write only what changed on every
 * subsequent state change. Signed in, that store is Supabase and an account with no rows starts
 * empty. As a guest it is sessionStorage, so the basket survives a reload and dies with the tab.
 */
export function useRemoteSync(state: PlannerState, dispatch: Dispatch<Action>): RemoteSync {
  const [isGuest, setIsGuest] = useState(guest.isGuest);
  // Nothing to show without credentials, so the sign-in page offers the guest tab instead.
  const [phase, setPhase] = useState<Phase>(() =>
    guest.isGuest() ? 'ready' : isConfigured ? 'booting' : 'signed-out',
  );
  const [session, setSession] = useState<Session | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const synced = useRef<Snapshot | null>(null);

  useEffect(() => {
    if (!isConfigured || isGuest) return;

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
  }, [isGuest]);

  // A guest reload picks the basket back up out of this tab's storage.
  useEffect(() => {
    if (!isGuest || synced.current) return;
    const stored = guest.loadGuest();
    dispatch({ type: 'state/hydrate', snapshot: stored });
    synced.current = stored;
    setPhase('ready');
  }, [isGuest, dispatch]);

  const userId = session?.user.id;
  useEffect(() => {
    if (!isConfigured || isGuest || !userId) return;
    let cancelled = false;

    (async () => {
      try {
        const stored = await loadSnapshot(userId);
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
  }, [userId, isGuest, dispatch]);

  useEffect(() => {
    const prev = synced.current;
    if (phase !== 'ready' || !prev) return;

    const next = snapshotOf(state);
    const unchanged =
      prev.catalogue === next.catalogue &&
      prev.pantry === next.pantry &&
      prev.plan === next.plan &&
      prev.grocery === next.grocery;
    if (unchanged) return;

    synced.current = next;

    if (isGuest) {
      guest.saveGuest(next);
      return;
    }
    if (!isConfigured || !userId) return;

    writeChanges(userId, prev, next)
      .then(() => setSaveFailed(false))
      .catch((error) => {
        console.error('Could not save that change', error);
        setSaveFailed(true);
      });
  }, [state, userId, phase, isGuest]);

  const startGuest = useCallback(() => {
    const basket = guest.startGuest((days) => addDaysISO(days));
    dispatch({ type: 'state/hydrate', snapshot: basket });
    synced.current = basket;
    setIsGuest(true);
    setPhase('ready');
  }, [dispatch]);

  const signOut = useCallback(() => {
    if (isGuest) {
      guest.endGuest();
      synced.current = null;
      dispatch({ type: 'state/hydrate', snapshot: EMPTY });
      setIsGuest(false);
      setPhase(isConfigured ? 'booting' : 'signed-out');
      return;
    }
    supabaseSignOut();
  }, [isGuest, dispatch]);

  return {
    phase,
    email: session?.user.email ?? null,
    guest: isGuest,
    saveFailed,
    signOut,
    startGuest,
  };
}
