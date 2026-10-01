"use server";

import { revalidatePath } from "next/cache";
import { connectSupplier } from "@/lib/dal";
import type { ConnectOutcome } from "@/lib/data";
import type { ConnectState } from "./connect-form";

// Le mot de passe transite par cette server action : il n'est jamais renvoyé
// au client ni journalisé. La validation se fait côté serveur via l'Edge
// Function, qui ne conserve le secret que s'il est valide.
export async function connectSupplierAction(
  _prev: ConnectState,
  formData: FormData,
): Promise<ConnectState> {
  const supplierId = String(formData.get("supplier_id") ?? "").trim();
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!supplierId || !identifier || !password) {
    return {
      ok: false,
      message: "Renseignez le grossiste, l'identifiant et le mot de passe.",
    };
  }

  let outcome: ConnectOutcome;
  try {
    outcome = await connectSupplier({ supplierId, identifier, password });
  } catch {
    return {
      ok: false,
      message: "Connexion impossible. Réessayez dans un instant.",
    };
  }

  if (outcome.ok) {
    revalidatePath("/fournisseurs");
  }
  return outcome;
}
