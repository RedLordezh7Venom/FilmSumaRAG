"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

export function AuthSync() {
  const { user, isLoaded } = useUser();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !user || syncedRef.current) return;

    const syncUser = async (retries = 3, delay = 1500) => {
      const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";

      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          const res = await fetch(`${primaryApiUrl}/auth/sync-user`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clerk_id: user.id,
              email: user.primaryEmailAddress?.emailAddress || "",
              username: user.username || user.firstName || "Anonymous"
            })
          });

          if (res.ok) {
            syncedRef.current = true;
            return; // success
          }
          // Non-network error (e.g. 422) - don't retry
          console.warn(`Auth sync returned ${res.status}. Not retrying.`);
          syncedRef.current = true;
          return;

        } catch (e) {
          // Network error - backend may not be up yet
          if (attempt < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
          } else {
            // Silently fail after all retries - app still works without this sync
            console.warn("Auth sync failed after retries. Backend may be offline.");
          }
        }
      }
    };

    syncUser();
  }, [isLoaded, user]);

  return null;
}
