// src/lib/damage-photos.ts
// Photos des dommages préexistants d'un véhicule (colonnes vehicules.dommages_url_1 … _8).
// Toutes optionnelles : seuls les emplacements renseignés sont retournés.

export const DAMAGE_PHOTO_SLOTS = 8;

export function damagePhotoUrls(veh: Record<string, any> | null | undefined): string[] {
  if (!veh) return [];
  const urls: string[] = [];
  for (let n = 1; n <= DAMAGE_PHOTO_SLOTS; n++) {
    const url = veh[`dommages_url_${n}`];
    if (typeof url === 'string' && url.trim()) urls.push(url.trim());
  }
  return urls;
}
