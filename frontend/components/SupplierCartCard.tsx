"use client";

import {
  formatTND,
  type CartGroupView,
  type CartItemView,
} from "@/lib/data";
import SupplierAvatar from "./SupplierAvatar";
import {
  AlertTriangleIcon,
  BadgeCheckIcon,
  CheckIcon,
  ClockIcon,
  ExternalLinkIcon,
  InboxIcon,
} from "./icons";

export default function SupplierCartCard({
  cart,
  checked,
  onToggle,
}: {
  cart: CartGroupView;
  checked: ReadonlySet<string>;
  onToggle: (item: CartItemView) => void;
}) {
  const pending = cart.items.filter((i) => i.status === "pending").length;
  const allOrdered = pending === 0;
  const subtotal = cart.items.reduce(
    (acc, i) => acc + (i.prixMillimes ?? 0),
    0,
  );
  const firstItem = cart.items[0];
  const finalizeUrl = firstItem?.productUrl ?? cart.baseUrl ?? "#";

  const badge =
    allOrdered && cart.items.length > 0
      ? {
          label: "Panier commandé",
          className:
            "border-stock-in-border bg-stock-in-bg text-stock-in-text",
          icon: <BadgeCheckIcon size={13} />,
        }
      : {
          label: "En attente de finalisation",
          className:
            "border-stock-order-border bg-stock-order-bg text-stock-order-text",
          icon: <AlertTriangleIcon size={13} />,
        };

  return (
    <section className="card overflow-hidden">
      <header className="flex flex-col gap-3 border-b border-border-card bg-surface-0 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <SupplierAvatar code={cart.supplierCode} name={cart.supplierName} size="lg" />
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-headline-sm text-navy">{cart.supplierName}</h3>
              {cart.supplierCity ? (
                <span className="text-label-sm text-slate">
                  {cart.supplierCity}
                </span>
              ) : null}
              {cart.items.length > 0 ? (
                <span
                  className={`inline-flex h-6 items-center gap-1 rounded-[4px] border px-2 text-label-sm ${badge.className}`}
                >
                  {badge.icon}
                  {badge.label}
                </span>
              ) : null}
            </div>
            <span className="text-label-sm text-slate">
              {cart.items.length} article{cart.items.length > 1 ? "s" : ""} •
              Sous-total :{" "}
              <strong className="tnum font-bold">{formatTND(subtotal)}</strong>
            </span>
          </div>
        </div>

        {cart.items.length > 0 && finalizeUrl !== "#" ? (
          <a
            href={finalizeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary md:shrink-0"
          >
            Aller finaliser chez {cart.supplierName}
            <ExternalLinkIcon size={18} />
          </a>
        ) : null}
      </header>

      <div className="flex flex-col gap-3 p-4">
        <ul className="flex flex-col gap-3">
          {cart.items.map((item) => {
            const isChecked = checked.has(item.id);
            return (
              <li
                key={item.id}
                className={`flex flex-col gap-3 rounded-lg border border-border-card p-3 transition-opacity sm:flex-row sm:items-center ${
                  isChecked ? "bg-surface-0 opacity-60" : ""
                }`}
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-border-card bg-surface-0 text-slate">
                  <InboxIcon size={24} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-code-oem uppercase text-slate">
                    Réf : {item.reference}{" "}
                    <span className="font-semibold text-navy normal-case">
                      {item.marque}
                    </span>
                  </p>
                  <p
                    className={`text-body-md font-medium text-navy ${
                      isChecked ? "line-through" : ""
                    }`}
                  >
                    {item.title}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-label-sm text-slate">
                    {item.status === "ordered" ? (
                      <CheckIcon size={14} />
                    ) : (
                      <ClockIcon size={14} />
                    )}
                    {item.meta}
                    {item.quantite > 1 ? ` • Quantité : ${item.quantite}` : ""}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                  {item.prixMillimes !== null ? (
                    <span className="tnum text-price-display text-navy">
                      {formatTND(item.prixMillimes)}
                    </span>
                  ) : (
                    <span className="tnum text-price-display text-slate">
                      -- TND
                    </span>
                  )}
                  <label className="flex h-11 cursor-pointer select-none items-center gap-2 text-label-md text-on-surface-variant">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggle(item)}
                      className="h-5 w-5 accent-primary"
                    />
                    {isChecked ? "Remettre en attente" : "Marquer comme commandé"}
                    {isChecked ? <CheckIcon size={16} /> : null}
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}