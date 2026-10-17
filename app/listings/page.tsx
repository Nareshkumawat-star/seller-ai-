import type { Metadata } from "next";
import { ListingsView } from "@/components/history/listings-view";

export const metadata: Metadata = { title: "My Listings" };

export default function ListingsPage() {
  return <ListingsView />;
}
