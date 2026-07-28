import { ApiDocsClient } from "./ApiDocsClient";

export const metadata = {
  title: "Sangam API Docs",
  description: "Interactive OpenAPI docs (Swagger UI) for Sangam",
};

export default function ApiDocsPage() {
  return <ApiDocsClient />;
}
