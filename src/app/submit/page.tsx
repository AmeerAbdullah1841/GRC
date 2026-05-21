import { SiteHeader } from "@/components/site-header";
import { SubmitWizard } from "@/components/submit-wizard";

export const metadata = {
  title: "Vendor security questionnaire",
};

export default function SubmitPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col px-4 py-10 sm:px-6">
        <SubmitWizard />
      </main>
    </div>
  );
}
