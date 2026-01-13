import UsageClient from "./UsageClient";

export const metadata = {
  title: "Usage - Austerian",
  description: "View your API usage and limits",
};

export default function UsagePage() {
  return <UsageClient />;
}
