// Only confirmed API labels are mapped; unknown business copy stays unchanged.
export function localizeProductBadge(
  badge: string,
  labels: Record<"discount" | "new" | "personalization", string>,
): string {
  switch (badge) {
    case "جديد": return labels.new;
    case "خصم": return labels.discount;
    case "بالاسم": return labels.personalization;
    default: return badge;
  }
}
