// src/app/(protected)/research/collections/page.tsx
import { Metadata } from 'next';
import CollectionsBrowseClient from './CollectionsBrowseClient';

export const metadata: Metadata = {
  title: 'Research Collections',
  description: 'Browse curated collections of research',
};

export default function CollectionsPage() {
  return <CollectionsBrowseClient />;
}
