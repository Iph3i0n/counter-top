export default function c(...classes: Array<string | [string, boolean]>) {
  return classes
    .map((c) => (typeof c === "string" ? c : c[1] ? c[0] : undefined))
    .filter((c) => c)
    .join(" ");
}
