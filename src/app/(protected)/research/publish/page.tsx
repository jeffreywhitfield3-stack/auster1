import { Metadata } from "next";
import PublishResearchClient from "./PublishResearchClient";

export const metadata: Metadata = {
  title: "Publish Research | Auster",
  description: "Publish your economic or financial analysis to the Research Stage",
};

export default function PublishResearchPage() {
  return <PublishResearchClient />;
}
