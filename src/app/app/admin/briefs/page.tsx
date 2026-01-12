import AdminBriefsClient from "./AdminBriefsClient";

export const metadata = {
  title: "Admin: Compose Weekly Brief | Austerian",
  description: "Compose and send weekly economic briefs to subscribers",
};

export default function AdminBriefsPage() {
  return <AdminBriefsClient />;
}
