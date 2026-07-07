import type { Metadata } from "next";
import { FaqAccordion } from "./FaqAccordion";

export const metadata: Metadata = {
  title: "FAQ · Sangam",
  description: "Frequently asked questions about Sangam.",
};

export default function FAQPage() {
  return <FaqAccordion />;
}
