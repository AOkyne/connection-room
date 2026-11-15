import type { Metadata } from "next";
import { GetAppPage } from "@/components/install/GetAppPage";

export const metadata: Metadata = {
  title: "Get the app · The Connection Room",
  description: "Put The Connection Room on your phone's home screen. Free, no app store, takes a few seconds.",
};

// Shareable link for emails and messages: community.trevorjamesla.com/get-app
export default function Page() {
  return <GetAppPage />;
}
