// src/app/(protected)/models/page.tsx
import ModelsTab from '@/components/models/ModelsTab';

export const metadata = {
  title: 'Models | Auster',
  description: 'Browse and run quantitative models for market analysis',
};

export default function ModelsPage() {
  return <ModelsTab />;
}
