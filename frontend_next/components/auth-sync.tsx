"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

export function AuthSync() {
  const { user, isLoaded } = useUser();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (isLoaded && user && !syncedRef.current) {
      syncedRef.current = true;
      const syncUser = async () => {
        try {
          const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";
          await fetch(`${primaryApiUrl}/auth/sync-user`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clerk_id: user.id,
              email: user.primaryEmailAddress?.emailAddress || "",
              username: user.username || user.firstName || "Anonymous"
            })
          });
        } catch (e) {
          console.error("Auth sync failed:", e);
        }
      };
      syncUser();
    }
  }, [isLoaded, user]);

  return null;
}
