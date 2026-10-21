// Lot AE (21 ottobre 2026): the screen and the music of the menu. The game takes the largest size the phone reports
// (the black band opening in landscape), turns a quarter round when the phone is held upright (with the safe areas
// following), and the menu's music is a slow dirge whose every bar fits its beats.
import { describe, expect, it } from 'vitest';
import { TITLE_MUSIC } from '../src/data/music';
import { gameSize, isTurned, safeSides, type Measures } from '../src/ui/orientation';

const phone = (w: number, h: number, extra: Partial<Measures> = {}): Measures => ({
  inner: { w, h },
  standalone: true,
  touch: true,
  screen: { w: 390, h: 844 },
  ...extra,
});

describe('the size of the game (owner: "una barra nera sotto… non deve mai succedere")', () => {
  it('opened in landscape from the Home screen with a page too short, it takes the whole screen', () => {
    expect(gameSize(phone(844, 350))).toEqual({ w: 844, h: 390 });
  });

  it('takes the largest of every size the browser reports', () => {
    const s = gameSize(
      phone(800, 360, { visual: { w: 844, h: 370 }, client: { w: 820, h: 390 }, standalone: false }),
    );
    expect(s).toEqual({ w: 844, h: 390 });
  });
});

describe('held upright the game turns (owner: "rimane in orizzontale fisso")', () => {
  it('a phone held upright is turned, and the game is laid out sideways', () => {
    const m = phone(390, 844);
    expect(isTurned(m)).toBe(true);
    expect(gameSize(m)).toEqual({ w: 844, h: 390 });
  });

  it('a computer with a tall window is not turned', () => {
    expect(isTurned({ ...phone(600, 900), touch: false })).toBe(false);
  });

  it("turned, each side of the game takes the phone's matching safe area", () => {
    expect(safeSides(true)).toEqual({ t: 'right', r: 'bottom', b: 'left', l: 'top' });
    expect(safeSides(false)).toEqual({ t: 'top', r: 'right', b: 'bottom', l: 'left' });
  });
});

describe('the music of the menu (owner: "drammatica, grave… stile Hoist the Colours")', () => {
  it('a slow dirge: four phrases of four bars, each bar filling its beats, ending where it began', () => {
    expect(TITLE_MUSIC.bars).toHaveLength(16);
    for (const bar of TITLE_MUSIC.bars)
      expect(bar.melody.reduce((a, [, b]) => a + b, 0)).toBe(TITLE_MUSIC.beatsPerBar);
    expect(TITLE_MUSIC.bpm).toBeLessThan(60);
    expect(TITLE_MUSIC.bars[0]!.chord).toBe('Dm');
    expect(TITLE_MUSIC.bars[15]!.chord).toBe('Dm');
  });
});
