// Painting rock chunks a few rows at a time (v0.3.1 performance).
import { describe, expect, it } from 'vitest';
import { TERRAIN } from '../src/data/diver';
import { COAST, WORLD } from '../src/data/worldLayout';
import { ChunkPaintJob } from '../src/views/terrainPainter';
import { generateWorld } from '../src/systems/world/worldGen';

const opaque = (d: Uint8ClampedArray): number => {
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i]! > 0) n++;
  return n;
};

describe('chunk painting', () => {
  const map = generateWorld();
  const S = TERRAIN.chunkUnits;

  it('paints the rocky shore of the coast (a chunk must be stepped before use)', () => {
    const x0 = Math.floor(COAST.shoreX / S) * S; // the chunk with the shore in it
    const job = new ChunkPaintJob(map, x0, 0, S);
    expect(opaque(job.data)).toBe(0); // nothing until painted: installing it unpainted was the v0.3.1 bug
    job.step(Infinity);
    expect(job.done).toBe(true);
    expect(opaque(job.data)).toBeGreaterThan(job.px * job.px * 0.2);
    expect(COAST.shoreX - x0).toBeLessThan(S); // the shore is inside this chunk
    expect(WORLD.surfaceY).toBeLessThan(S);
  });

  it('can stop at a deadline and continue later', () => {
    const job = new ChunkPaintJob(map, S, S * 2, S);
    job.step(performance.now() - 1); // already late: paints only a few rows
    expect(job.done).toBe(false);
    while (!job.step(performance.now() + 2));
    expect(job.done).toBe(true);
  });
});
