import BriefViewClient from "./BriefViewClient";

export default function BriefViewPage({ params }: { params: { slug: string } }) {
  return <BriefViewClient slug={params.slug} />;
}
