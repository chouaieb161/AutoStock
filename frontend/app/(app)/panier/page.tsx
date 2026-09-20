import type { Metadata } from "next";
import { getCartGroups } from "@/lib/dal";
import PanierView from "./panier-view";

export const metadata: Metadata = {
  title: "Mes articles en attente",
};

export default async function PanierPage() {
  const groups = await getCartGroups();
  return <PanierView groups={groups} />;
}