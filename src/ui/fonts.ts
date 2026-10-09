// The rounded game font of the battle (Baloo 2, SIL Open Font License, docs/CREDITS.md), bundled with the
// game so it works offline. Only the latin letters, in the weights we use.
import w600 from '@fontsource/baloo-2/files/baloo-2-latin-600-normal.woff2?url';
import w700 from '@fontsource/baloo-2/files/baloo-2-latin-700-normal.woff2?url';
import w800 from '@fontsource/baloo-2/files/baloo-2-latin-800-normal.woff2?url';

/** Registers the font; the promise ends when it is ready (or failed: the system font is used). */
export function loadGameFont(): Promise<void> {
  if (typeof FontFace === 'undefined') return Promise.resolve();
  const faces = [
    ['600', w600],
    ['700', w700],
    ['800', w800],
  ].map(([weight, url]) => new FontFace('Baloo 2', `url(${url}) format("woff2")`, { weight }));
  return Promise.all(
    faces.map((f) =>
      f.load().then(
        (loaded) => void document.fonts.add(loaded),
        () => undefined,
      ),
    ),
  ).then(() => undefined);
}
