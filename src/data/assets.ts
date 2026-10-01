// Addresses of the game's pictures with their fingerprint (?h=…, written by `npm run art`): when a picture
// changes its address changes too, so neither the browser nor the offline copy can show an old one.
import { ASSET_HASHES } from './sprites.generated';

export function assetUrl(path: string): string {
  const h = ASSET_HASHES[path];
  return h ? `${path}?h=${h}` : path;
}
