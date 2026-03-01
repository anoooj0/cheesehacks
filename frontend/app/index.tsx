import { Redirect } from 'expo-router';
import { useApp } from '@/context/AppContext';

export default function Page() {
  const { onboardingComplete } = useApp();
  return <Redirect href={onboardingComplete ? '/(tabs)/' : '/onboarding'} />;
}
