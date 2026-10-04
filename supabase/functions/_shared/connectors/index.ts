import type { Connector } from "./types.ts";
import { SopraConnector } from "./sopra.ts";
import { ProadConnector } from "./proad.ts";
import { FadproConnector } from "./fadpro.ts";
import { LahianipaConnector } from "./lahianipa.ts";

// Registre des connecteurs disponibles, indexés par `suppliers.code`.
// Pour ajouter un fournisseur : créer le connecteur puis l'enregistrer ici.
export function connectorFor(
  supplierCode: string,
  baseUrl: string,
): Connector | null {
  switch (supplierCode.toUpperCase()) {
    case "SOP":
      return new SopraConnector(baseUrl);
    case "AD":
      return new ProadConnector(baseUrl);
    case "FAD":
      return new FadproConnector(baseUrl);
    case "LHI":
      return new LahianipaConnector(baseUrl);
    default:
      return null;
  }
}
