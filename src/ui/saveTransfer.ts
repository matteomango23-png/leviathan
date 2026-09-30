// Export and import of the save as a file. On iPhone the export opens the share sheet
// ("Salva in File"); elsewhere it downloads the file.
import { exportFileName, parseSave, serializeSave, type SaveData } from '../systems/save/saveData';

export async function exportSave(save: SaveData): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const text = serializeSave(save);
  const name = exportFileName(new Date());
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
export function pickSaveFile(): Promise<SaveData | null> {
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
          resolve(parseSave(text));
        } catch (e) {
          reject(e);
        }
      }, reject);
    });
    input.click();
  });
}
