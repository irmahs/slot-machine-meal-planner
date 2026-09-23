import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react';
import { loadVocab } from '../data/vocab';
import { snapshotOf, type Action, type PlannerState } from '../state/planner';
import * as guest from './guest';
import { EMPTY, loadSnapshot, writeChanges, type Snapshot } from './remote';
import { currentSession, onAuthChange, signOut as supabaseSignOut } from './supabase/auth';
import { isConfigured } from './supabase/client';

/**
 * `booting`  — loading the vocabulary, then finding out who you are
 * `signed-out` — the sign-in page
 * `ready`    — the app
 * `broken`   — the vocabulary could not be loaded, and without it the app has
 *              no words for anything, so it says so instead of opening empty
 */
export type Phase = 'booting' | 'signed-out' | 'ready' | 'broken';

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
 * Loads the vocabulary, then mirrors the reducer into storage: hydrate on
 * sign-in, and write only what changed on every state change after. Signed in,
 * that store is Supabase. As a guest it is sessionStorage, so the pantry
 * survives a reload and dies with the tab.
 */
export function useRemoteSync(state: PlannerState, dispatch: Dispatch<Action>): RemoteSync {
  const [isGuest, setIsGuest] = useState(guest.isGuest);
  const [vocabReady, setVocabReady] = useState(false);
  const [phase, setPhase] = useState<Phase>(isConfigured ? 'booting' : 'signed-out');
  const [session, setSession] = useState<Session | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const synced = useRef<Snapshot | null>(null);

  // Everything else waits on this: no screen has a word to show without it.
  useEffect(() => {
    if (!isConfigured) return;
    let cancelled = false;
    loadVocab()
      .then((vocab) => {
        if (cancelled) return;
        dispatch({ type: 'vocab/load', vocab });
        setVocabReady(true);
      })
      .catch((error) => {
        console.error('Could not load the reference tables', error);
        if (!cancelled) setPhase('broken');
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    if (!vocabReady || isGuest) return;

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
  }, [vocabReady, isGuest]);

  // A guest reload picks the pantry back up out of this tab's storage.
  useEffect(() => {
    if (!vocabReady || !isGuest || synced.current) return;
    const stored = guest.loadGuest();
    dispatch({ type: 'state/hydrate', snapshot: stored });
    synced.current = stored;
    setPhase('ready');
  }, [vocabReady, isGuest, dispatch]);

  const userId = session?.user.id;
  const vocab = state.vocab;
  useEffect(() => {
    if (!vocabReady || isGuest || !userId) return;
    let cancelled = false;

    (async () => {
      try {
        const stored = await loadSnapshot(userId, vocab);
        if (cancelled) return;
        dispatch({ type: 'state/hydrate', snapshot: stored });
        synced.current = stored;
        setSaveFailed(false);
      } catch (error) {
        console.error('Could not load your pantry', error);
        setSaveFailed(true);
      } finally {
        if (!cancelled) setPhase('ready');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [vocabReady, userId, isGuest, vocab, dispatch]);

  useEffect(() => {
    const prev = synced.current;
    if (phase !== 'ready' || !prev) return;

    const next = snapshotOf(state);
    const unchanged =
      prev.catalogue === next.catalogue &&
      prev.pantry === next.pantry &&
      prev.plan === next.plan &&
      prev.grocery === next.grocery &&
      prev.methodsOff === next.methodsOff;
    if (unchanged) return;

    synced.current = next;

    if (isGuest) {
      guest.saveGuest(next);
      return;
    }
    if (!userId) return;

    writeChanges(userId, prev, next, state.vocab)
      .then(() => setSaveFailed(false))
      .catch((error) => {
        console.error('Could not save that change', error);
        setSaveFailed(true);
      });
  }, [state, userId, phase, isGuest]);

  const startGuest = useCallback(() => {
    if (!vocabReady) return;
    guest.startGuest();
    dispatch({ type: 'state/hydrate', snapshot: EMPTY });
    synced.current = EMPTY;
    setIsGuest(true);
    setPhase('ready');
  }, [vocabReady, dispatch]);

  const signOut = useCallback(() => {
    if (isGuest) {
      guest.endGuest();
      synced.current = null;
      dispatch({ type: 'state/hydrate', snapshot: EMPTY });
      setIsGuest(false);
      setPhase('signed-out');
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
