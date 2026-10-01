"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangleIcon, BadgeCheckIcon, LockIcon, ShieldIcon } from "@/components/icons";
import type { ConnectOutcome, TenantSupplierView } from "@/lib/data";

export type ConnectState = ConnectOutcome | null;

export default function ConnectSupplierForm({
  suppliers,
  action,
}: {
  suppliers: TenantSupplierView[];
  action: (
    prev: ConnectState,
    formData: FormData,
  ) => Promise<ConnectState>;
}) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="grossiste" className="field-label">
            Sélectionnez le grossiste
          </label>
          <select
            id="grossiste"
            name="supplier_id"
            className="input appearance-none"
            defaultValue=""
            required
          >
            <option value="">Choisir un grossiste partenaire...</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ident" className="field-label">
            Identifiant B2B
          </label>
          <input
            id="ident"
            name="identifier"
            placeholder="Ex : client-pro-7842"
            className="input"
            autoComplete="username"
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="password" className="field-label">
            Mot de passe du compte pro
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••••"
            className="input"
            autoComplete="current-password"
            required
          />
          <p className="mt-1.5 flex items-center gap-1 text-label-sm text-slate">
            <ShieldIcon size={14} />
            Ce mot de passe reste chiffré dans Supabase Vault et n&apos;est
            utilisé que pour interroger le grossiste.
          </p>
        </div>
        <SubmitConnect />
      </div>

      {state ? (
        <p
          role="status"
          className={`md:col-span-2 flex items-center gap-2 rounded-md border px-3 py-2.5 text-label-md ${
            state.ok
              ? "border-stock-in-border bg-stock-in-bg text-stock-in-text"
              : "border-stock-rupture-border bg-stock-rupture-bg text-stock-rupture-text"
          }`}
        >
          {state.ok ? (
            <BadgeCheckIcon size={18} />
          ) : (
            <AlertTriangleIcon size={18} />
          )}
          {state.ok
            ? "Compte connecté. Le grossiste sera interrogé dès vos prochaines recherches."
            : state.message}
        </p>
      ) : null}
    </form>
  );
}

function SubmitConnect() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-secondary" disabled={pending}>
      <LockIcon size={18} />
      {pending ? "Vérification en cours..." : "Enregistrer et connecter"}
    </button>
  );
}
