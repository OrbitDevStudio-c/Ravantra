import type { Metadata } from "next";
import { AddressBook } from "@/components/account/address-book";
import { isPreviewMode } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Address } from "@/types";

export const metadata: Metadata = { title: "Addresses", robots: { index: false } };

export default async function AddressesPage() {
  let addresses: Address[] = [];
  if (!isPreviewMode) {
    const sb = await createServerSupabase();
    const { data: auth } = await sb.auth.getUser();
    const { data } = await sb.from("addresses").select("*").eq("user_id", auth.user?.id ?? "").order("is_default", { ascending: false }).order("created_at");
    addresses = (data ?? []).map((a) => ({
      id: a.id,
      label: a.label,
      fullName: a.full_name,
      phone: a.phone,
      line1: a.line1,
      line2: a.line2,
      city: a.city,
      state: a.state,
      postalCode: a.postal_code,
      isDefault: a.is_default,
    }));
  }
  return <AddressBook addresses={addresses} disabled={isPreviewMode} />;
}
