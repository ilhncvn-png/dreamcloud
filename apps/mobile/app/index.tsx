import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { getStoredItem } from '@/utils/storage';
import { useAuthStore } from '@/store/auth.store';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [storageChecked, setStorageChecked] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    getStoredItem('onboarding_done')
      .then((val) => {
        setOnboardingDone(val === 'true');
        setStorageChecked(true);
      })
      .catch(() => {
        // If SecureStore fails, skip onboarding rather than blocking the user
        setOnboardingDone(true);
        setStorageChecked(true);
      });
  }, []);

  if (isLoading || !storageChecked) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!onboardingDone) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
