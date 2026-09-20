import Link from "next/link";

export default function Logo({ href = "#" }: { href?: string }) {
  const inner = (
    <span className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-label-lg font-extrabold text-white">
        AT
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-headline-sm text-navy">AutoStock.tn</span>
        <span className="text-label-sm text-slate">Réseau Pro Tunisie</span>
      </span>
    </span>
  );

  if (href === "#") {
    return inner;
  }
  return (
    <Link href={href} className="inline-flex shrink-0">
      {inner}
    </Link>
  );
}