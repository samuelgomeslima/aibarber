import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { getEmailConfirmationRedirectUrl } from "../../lib/auth";
import { supabase } from "../../lib/supabase";

export type UseAuthUserResult = {
  currentUser: User | null;
  currentUserLoading: boolean;
  resendingConfirmation: boolean;
  resentConfirmation: boolean;
  resendConfirmationError: string | null;
  setResendConfirmationError: (message: string | null) => void;
  handleResendConfirmationEmail: (errorMessage: string) => Promise<void>;
  showEmailConfirmationReminder: boolean;
};

export function useAuthUser(): UseAuthUserResult {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserLoading, setCurrentUserLoading] = useState(true);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [resentConfirmation, setResentConfirmation] = useState(false);
  const [resendConfirmationError, setResendConfirmationError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      setCurrentUserLoading(true);
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!isMounted) {
          return;
        }

        if (error) {
          console.error("Failed to load authenticated user", error);
          setCurrentUser(null);
        } else {
          setCurrentUser(data.user ?? null);
        }
      } catch (error) {
        console.error("Failed to load authenticated user", error);
        if (isMounted) {
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          setCurrentUserLoading(false);
        }
      }
    };

    void loadUser();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      setCurrentUser(session?.user ?? null);
      setCurrentUserLoading(false);
    });

    return () => {
      isMounted = false;
      subscription?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (currentUser?.email_confirmed_at) {
      setResentConfirmation(false);
      setResendConfirmationError(null);
    }
  }, [currentUser?.email_confirmed_at]);

  const handleResendConfirmationEmail = useCallback(
    async (errorMessage: string) => {
      if (!currentUser?.email || resendingConfirmation) {
        return;
      }

      setResendingConfirmation(true);
      setResentConfirmation(false);
      setResendConfirmationError(null);

      try {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email: currentUser.email,
          options: { emailRedirectTo: getEmailConfirmationRedirectUrl() },
        });

        if (error) {
          console.error("Failed to resend confirmation email", error);
          setResendConfirmationError(errorMessage);
          return;
        }

        setResentConfirmation(true);
      } catch (error) {
        console.error("Failed to resend confirmation email", error);
        setResendConfirmationError(errorMessage);
      } finally {
        setResendingConfirmation(false);
      }
    },
    [currentUser?.email, resendingConfirmation],
  );

  const showEmailConfirmationReminder = useMemo(() => {
    const emailConfirmed = Boolean(currentUser?.email_confirmed_at);
    return !currentUserLoading && Boolean(currentUser) && !emailConfirmed;
  }, [currentUser, currentUserLoading]);

  return {
    currentUser,
    currentUserLoading,
    resendingConfirmation,
    resentConfirmation,
    resendConfirmationError,
    setResendConfirmationError,
    handleResendConfirmationEmail,
    showEmailConfirmationReminder,
  };
}
