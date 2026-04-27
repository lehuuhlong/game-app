"use client";

import { useAuth } from "./AuthProvider";
import { LoginModal } from "./LoginModal";
import type { ReactNode } from "react";

/**
 * Wraps children and shows LoginModal when user is not authenticated.
 * Shows nothing (empty fragment) while session is being restored to
 * prevent flicker.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    // While restoring session from localStorage — render nothing to avoid flicker
    return null;
  }

  if (!user) {
    return <LoginModal />;
  }

  return <>{children}</>;
}
