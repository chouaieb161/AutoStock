export default function Footer() {
  return (
    <footer className="mt-12 border-t border-border-card bg-surface-0">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-6 text-center md:px-8">
        <p className="text-label-md text-slate">
          AutoStock.tn - Plateforme B2B Pièces Auto Tunisie • Prix affichés en
          Dinars Tunisiens (TND)
        </p>
        <p className="text-label-sm text-on-surface-variant">
          Disponibilité pièces en temps réel
        </p>
      </div>
    </footer>
  );
}