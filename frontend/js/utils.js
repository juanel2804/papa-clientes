export const money =
  new Intl.NumberFormat(
    "es-MX",
    {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }
  );

export function monthLabel(value) {

  if (!value) return "";

  const date = new Date(
    `${value.slice(0,7)}-02`
  );

  return date.toLocaleDateString(
    "es-MX",
    {
      month: "long",
      year: "numeric",
    }
  );
}

export function escapeHtml(
  value = ""
){
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}