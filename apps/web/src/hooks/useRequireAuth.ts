'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDemoStore } from '../lib/demo/useDemoStore';

export function useRequireAuth(redirectUrl = '/auth') {
  const router = useRouter();
  const { activeUser, isInitialized } = useDemoStore();

  useEffect(() => {
    if (isInitialized && !activeUser) {
      router.push(redirectUrl);
    }
  }, [activeUser, isInitialized, redirectUrl, router]);

  return { activeUser, isAuthorized: !!activeUser, isInitialized };
}

