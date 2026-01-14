// src/app/(protected)/research/collections/[slug]/page.tsx
import { Metadata } from 'next';
import CollectionDetailClient from './CollectionDetailClient';
import { supabaseServer } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await supabaseServer();

  const { data: collection } = await supabase
    .from('collections')
    .select('name, description')
    .eq('slug', slug)
    .eq('visibility', 'public')
    .single();

  if (!collection) {
    return {
      title: 'Collection Not Found',
    };
  }

  return {
    title: `${collection.name} - Research Collection`,
    description: collection.description || `Curated collection: ${collection.name}`,
  };
}

export default async function CollectionDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await supabaseServer();

  // Fetch collection by slug
  const { data: collection } = await supabase
    .from('collections')
    .select('id, slug')
    .eq('slug', slug)
    .single();

  if (!collection) {
    notFound();
  }

  return <CollectionDetailClient collectionId={collection.id} />;
}
