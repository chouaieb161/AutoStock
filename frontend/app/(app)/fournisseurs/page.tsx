import type { Metadata } from "next";
import { getSuppliersView } from "@/lib/dal";
import FournisseursView from "./fournisseurs-view";

export const metadata: Metadata = {
  title: "Mes fournisseurs connectés",
};

export default async function FournisseursPage() {
  const suppliers = await getSuppliersView();
  return <FournisseursView suppliers={suppliers} />;
}