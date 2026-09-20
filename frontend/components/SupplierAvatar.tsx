import { abbrOf, avatarClass } from "@/lib/data";

export default function SupplierAvatar({
  code,
  name,
  size = "md",
}: {
  code: string;
  name: string;
  size?: "md" | "lg";
}) {
  const dim =
    size === "lg"
      ? "h-12 w-12 text-label-lg"
      : "h-10 w-10 text-label-lg";
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-extrabold text-white ${dim} ${avatarClass(code)}`}
      title={name}
    >
      {abbrOf(code)}
    </span>
  );
}