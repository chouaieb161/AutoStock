import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AutoStock.tn",
    template: "%s · AutoStock.tn",
  },
  description:
    "Comparateur B2B de pièces automobiles en Tunisie. Prix et disponibilités en temps réel chez vos grossistes partenaires, en Dinars Tunisiens.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-on-surface">
        {children}
      </body>
    </html>
  );
}