"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import {
  AlertCircleIcon,
  ArrowForwardIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
} from "@/components/icons";

type Mode = "signin" | "signup";

export default function LoginForm() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [shopCity, setShopCity] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!email.trim() || !password) {
      setError("Veuillez renseigner votre email et votre mot de passe.");
      return;
    }
    if (mode === "signup" && !shopName.trim()) {
      setError("Veuillez indiquer le nom de votre point de vente.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signin") {
        const { error: signinError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (signinError) {
          setError(toFrench(signinError.message));
          return;
        }
        await supabase.rpc("provision_tenant_from_metadata");
        router.refresh();
        router.push("/recherche");
        return;
      }

      const { data, error: signupError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            shop_name: shopName.trim(),
            shop_city: shopCity.trim(),
          },
          emailRedirectTo: `${window.location.origin}/connexion`,
        },
      });
      if (signupError) {
        setError(toFrench(signupError.message));
        return;
      }
      if (data.session) {
        await supabase.rpc("provision_tenant", {
          shop_name: shopName.trim(),
          shop_city: shopCity.trim() || undefined,
        });
        router.refresh();
        router.push("/recherche");
        return;
      }
      setInfo(
        "Un e-mail de confirmation vient d'être envoyé. Cliquez sur le lien puis connectez-vous.",
      );
      setMode("signin");
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError("Saisissez d'abord votre adresse e-mail.");
      return;
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/connexion` },
    );
    if (resetError) {
      setError(toFrench(resetError.message));
    } else {
      setInfo(
        "Si un compte existe à cette adresse, un lien de réinitialisation vient d'être envoyé.",
      );
    }
  };

  const toggleMode = () => {
    setError(null);
    setInfo(null);
    setMode((m) => (m === "signin" ? "signup" : "signin"));
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {mode === "signup" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="shopName" className="field-label">
              Nom du point de vente
            </label>
            <input
              id="shopName"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Comptoir Pro Ben Arous"
              className="input"
              autoComplete="organization"
            />
          </div>
          <div>
            <label htmlFor="shopCity" className="field-label">
              Ville (optionnel)
            </label>
            <input
              id="shopCity"
              value={shopCity}
              onChange={(e) => setShopCity(e.target.value)}
              placeholder="Ben Arous"
              className="input"
              autoComplete="address-level2"
            />
          </div>
        </div>
      ) : null}

      <div>
        <label htmlFor="email" className="field-label">
          Adresse email professionnelle
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="comptoir@autostock.tn"
          className="input"
          autoComplete="email"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="field-label">
            Mot de passe
          </label>
          <button
            type="button"
            onClick={forgotPassword}
            className="mb-1 text-label-md text-primary hover:underline"
          >
            Mot de passe oublié ?
          </button>
        </div>
        <div className="relative">
          <input
            id="password"
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••"
            className="input pr-11"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate hover:bg-surface-0"
            aria-label={showPw ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPw ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
          </button>
        </div>
      </div>

      {error ? (
        <p className="flex items-center gap-2 rounded-md border border-stock-rupture-border bg-stock-rupture-bg px-3 py-2.5 text-label-md text-stock-rupture-text">
          <AlertCircleIcon size={18} />
          {error}
        </p>
      ) : null}

      {info ? (
        <p className="flex items-center gap-2 rounded-md border border-stock-in-border bg-stock-in-bg px-3 py-2.5 text-label-md text-stock-in-text">
          <CheckIcon size={18} />
          {info}
        </p>
      ) : null}

      <button type="submit" className="btn btn-secondary" disabled={loading}>
        {mode === "signin" ? (
          <>
            <LockIcon size={18} />
            Se connecter
            <ArrowForwardIcon size={18} />
          </>
        ) : (
          <>
            <CheckIcon size={18} />
            Créer mon compte
          </>
        )}
      </button>

      <p className="rounded-md bg-surface-0 px-3 py-2.5 text-label-sm text-slate">
        Espace B2B réservé aux points de vente. Vos identifiants grossistes sont
        chiffrés et ne sont jamais partagés avec d&apos;autres tenants.
      </p>

      <button type="button" className="btn btn-outline" onClick={toggleMode}>
        {mode === "signin" ? "Créer un compte" : "J'ai déjà un compte"}
      </button>
    </form>
  );
}

function toFrench(message: string): string {
  const map: Record<string, string> = {
    "Invalid login credentials":
      "Identifiant ou mot de passe incorrect.",
    "Email not confirmed":
      "Adresse e-mail non confirmée. Vérifiez votre boîte mail.",
    "User already registered":
      "Un compte existe déjà avec cette adresse e-mail. Connectez-vous.",
    "Password should be at least 6 characters":
      "Le mot de passe doit contenir au moins 6 caractères.",
    "Signups not allowed for this instance":
      "La création de compte est momentanément indisponible.",
    "For security purposes, you can only request this once every 60 seconds":
      "Veuillez patienter 60 secondes avant une nouvelle demande.",
  };
  return map[message] ?? message;
}