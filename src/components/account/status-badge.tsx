import { Badge } from "@/components/ui/primitives";

const ORDER_TONES: Record<string, "neutral" | "gold" | "dark" | "success" | "danger" | "warning" | "info"> = {
  pending: "warning",
  confirmed: "info",
  processing: "gold",
  shipped: "gold",
  delivered: "success",
  cancelled: "danger",
  refunded: "neutral",
  successful: "success",
  failed: "danger",
  completed: "success",
  no_show: "danger",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={ORDER_TONES[status] ?? "neutral"}>{status.replace("_", " ")}</Badge>;
}
