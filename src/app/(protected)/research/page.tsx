import { Metadata } from "next";
import ResearchStageClient from "./ResearchStageClient";

export const metadata: Metadata = {
  title: "Research Stage | Auster",
  description: "Public research institution where economic and financial analyses become permanent artifacts",
};

export default function ResearchStagePage() {
  return <ResearchStageClient />;
}
