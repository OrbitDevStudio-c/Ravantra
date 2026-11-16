import { requirePermission } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env";
import { PageHeader } from "@/components/admin/ui";
import { AssistantChat } from "./assistant-chat";

export const metadata = { title: "AI assistant" };

export default async function AssistantPage() {
  const access = await requirePermission("dashboard.view");
  const configured = Boolean(serverEnv().openRouterKey) && !access.preview;
  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title="AI assistant"
        description="Ask about revenue, divisions, stock, orders or appointments. Answers use live figures limited to what your role can see — the assistant can read, never change, data."
      />
      {configured ? (
        <AssistantChat firstName={access.name.split(" ")[0] || "there"} />
      ) : (
        <p className="border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-ink">
          The assistant isn&apos;t available: {access.preview ? "it needs the live database." : "add OPENROUTER_API_KEY to the environment and restart."}
        </p>
      )}
    </>
  );
}
