import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { assetUrl } from '../src/data/assets';
import { ASSET_HASHES } from '../src/data/sprites.generated';

describe('picture addresses with a fingerprint', () => {
  it('adds the fingerprint of the picture to its address', () => {
    expect(assetUrl('sprites/squalo_bianco_back.webp')).toBe(
      `sprites/squalo_bianco_back.webp?h=${ASSET_HASHES['sprites/squalo_bianco_back.webp']}`,
    );
    expect(assetUrl('sprites/does_not_exist.webp')).toBe('sprites/does_not_exist.webp');
  });

  it('has the fingerprint of every picture as it is now (run npm run art after changing one)', () => {
    for (const [path, h] of Object.entries(ASSET_HASHES)) {
      const now = createHash('md5')
        .update(readFileSync(`public/${path}`))
        .digest('hex')
        .slice(0, 8);
      expect(now, path).toBe(h);
    }
  });
});
