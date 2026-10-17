import { Suspense } from "react";
import type { Metadata } from "next";
import { ListingStudio } from "@/components/workspace/listing-studio";

export const metadata: Metadata = {
  title: "Create Listing",
  description: "Generate and edit a product listing with your local AI model.",
};

export default function CreateListingPage() {
  return (
    <Suspense
      fallback={
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="skeleton h-[520px] rounded-card" />
          <div className="skeleton h-[420px] rounded-card" />
        </div>
      }
    >
      <ListingStudio />
    </Suspense>
  );
}
