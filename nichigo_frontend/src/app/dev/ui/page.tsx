import { notFound } from "next/navigation";
import { DevUIShowcase } from "./ui-showcase";

// Ensure this route is dynamic so it is evaluated at request time
export const dynamic = "force-dynamic";

export default function DevUIPage() {
  // Requirement 8: Route must be development-only and return 404 in production
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <DevUIShowcase />;
}
