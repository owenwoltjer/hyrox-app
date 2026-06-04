import { redirect } from "next/navigation";

/**
 * Root route — redirect to /today as the default landing screen.
 * All real UI lives in the tab-routed screens.
 */
export default function RootPage() {
  redirect("/today");
}
