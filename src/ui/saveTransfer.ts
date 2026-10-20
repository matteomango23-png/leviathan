// Export and import of a game as a file (the title menu's list of games). On iPhone the export opens the share
// sheet ("Salva in File"); elsewhere it downloads the file.
import { parseSave, type SaveData } from '../systems/save/saveData';

/** Shares or downloads a save's text as it is (also one the game cannot read: the title menu's list). */
export async function exportText(text: string, name: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([text], name, { type: 'application/json' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file], title: 'Salvataggio di Leviatano' });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // fall back to a download
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'downloaded';
}

/** Opens the file picker and returns the parsed save. Throws SaveError with an Italian message. */
/** A save file chosen by the player, read and checked, with its name (without .json): null if none was chosen. */
export function pickSaveFile(): Promise<{ save: SaveData; name: string } | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json,text/plain';
    input.addEventListener('change', () => {
      const f = input.files?.[0];
      if (!f) {
        resolve(null);
        return;
      }
      f.text().then((text) => {
        try {
          resolve({ save: parseSave(text), name: f.name.replace(/\.json$/i, '') });
        } catch (e) {
          reject(e);
        }
      }, reject);
    });
    input.click();
  });
}
