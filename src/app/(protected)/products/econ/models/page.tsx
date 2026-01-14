// src/app/(protected)/products/econ/models/page.tsx
import ModelsTab from '@/components/models/ModelsTab';

export const metadata = {
  title: 'Econ Lab Models | Auster',
  description: 'Browse and run quantitative models for economic analysis',
};

export default function EconModelsPage() {
  return <ModelsTab lab="econ" />;
}
