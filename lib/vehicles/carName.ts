/**
 * A sticker is linked first and described later, so a car may have no make,
 * model or colour yet. Everything that names a car goes through here and gets
 * null until it has a name — each caller then says « Votre voiture » in its
 * own language.
 */

/** « Peugeot 3008 », or null while the owner has not said which car it is. */
export function carName(car: { brand: string; model: string }): string | null {
  const name = `${car.brand} ${car.model}`.trim();
  return name || null;
}

/** « Peugeot 3008 · Gris », the colour only when there is one. */
export function carLabel(car: { brand: string; model: string; color: string }): string | null {
  const name = carName(car);
  if (!name) return null;
  return car.color.trim() ? `${name} · ${car.color.trim()}` : name;
}

/** True once make, model and colour are all there. */
export function carDescribed(car: { brand: string; model: string; color: string }): boolean {
  return Boolean(car.brand.trim() && car.model.trim() && car.color.trim());
}
