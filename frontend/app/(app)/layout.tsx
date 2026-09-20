import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import { getProfile } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  const supabase = await createClient();

  const [{ data: connected }, { data: pending }] = await Promise.all([
    supabase.from("tenant_suppliers").select("id").eq("status", "connected"),
    supabase
      .from("tracking_cart_items")
      .select("id")
      .eq("status", "pending"),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader
        initials={profile?.initials ?? "?"}
        shopName={profile?.shopName ?? null}
        shopCity={profile?.shopCity ?? null}
        roleLabel={profile?.roleLabel ?? "Espace B2B"}
        connectedCount={connected?.length ?? 0}
        pendingCount={pending?.length ?? 0}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}