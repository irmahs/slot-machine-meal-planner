import type { Session } from "@supabase/supabase-js";

import { supabase } from "./client";

/** Emails a one-time sign-in link back to this origin. Returns a message when it could not be sent. */
export async function sendMagicLink(
  email: string
): Promise<{ error: string | null }> {
  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    // The link only works for an origin listed under Authentication → URL Configuration.
    options: { emailRedirectTo: window.location.origin },
  });
  return { error: error?.message ?? null };
}

export async function currentSession(): Promise<Session | null> {
  if (!supabase) {
    return null;
  }
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Fires on sign-in, sign-out and token refresh. Returns its own unsubscribe. */
export function onAuthChange(
  handler: (session: Session | null) => void
): () => void {
  if (!supabase) {
    return () => {};
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) =>
    handler(session)
  );
  return () => data.subscription.unsubscribe();
}

export function signOut(): void {
  void supabase?.auth.signOut();
}
