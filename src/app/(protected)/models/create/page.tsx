// src/app/(protected)/models/create/page.tsx
import CreateModelClient from './CreateModelClient';

export const metadata = {
  title: 'Create Model | Auster',
  description: 'Create a new financial model with code',
};

export default function CreateModelPage() {
  return <CreateModelClient />;
}
