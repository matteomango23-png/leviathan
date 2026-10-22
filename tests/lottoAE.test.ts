// Lot AE (21 ottobre 2026): the screen and the music of the menu. The game takes the largest size the phone reports
// (the black band opening in landscape), asks to turn the phone when held upright (lot BD), and the menu's music is a slow dirge whose every bar fits its beats.
import { describe, expect, it } from 'vitest';
import { TITLE_MUSIC } from '../src/data/music';
import { gameSize, isUpright, type Measures } from '../src/ui/orientation';

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

describe('held upright the game asks to turn the phone (lot BD, 22 ottobre: no fake rotation)', () => {
  it('a phone held upright is upright; its size is not swapped', () => {
    const m = phone(390, 844);
    expect(isUpright(m)).toBe(true);
    expect(gameSize(m)).toEqual({ w: 390, h: 844 });
  });

  it('a computer with a tall window is not upright', () => {
    expect(isUpright({ ...phone(600, 900), touch: false })).toBe(false);
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
