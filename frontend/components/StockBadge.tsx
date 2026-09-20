import type { StockStatus } from "@/lib/data";

const styles: Record<StockStatus, { label: string; className: string }> = {
  "en-stock": {
    label: "En stock",
    className: "bg-stock-in-bg text-stock-in-text border-stock-in-border",
  },
  "sur-commande": {
    label: "Sur commande",
    className:
      "bg-stock-order-bg text-stock-order-text border-stock-order-border",
  },
  rupture: {
    label: "Rupture",
    className:
      "bg-stock-rupture-bg text-stock-rupture-text border-stock-rupture-border",
  },
  indisponible: {
    label: "Indisponible",
    className:
      "bg-stock-indisp-bg text-stock-indisp-text border-stock-indisp-border",
  },
};

export default function StockBadge({ status }: { status: StockStatus }) {
  const s = styles[status];
  return (
    <span
      className={`inline-flex h-6 items-center rounded-[4px] border px-2 text-label-sm uppercase ${s.className}`}
    >
      {s.label}
    </span>
  );
}