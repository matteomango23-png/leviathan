// The animals animated from a video (npm run art:video): for each, its clips cut from the owner's green-screen videos
// in art-inbox/video/<id>/ (owner, 11 ottobre 2026: "lo stesso asset si può riprodurre per altri animali enormi").
// Times in seconds of the video; `width` is the width of the frames written (the crop of the whole clip).

export interface VideoClip {
  /** Name of the clip (public/prove/<id>/<name>/…). */
  name: string;
  /** The video in art-inbox/video/<id>/. */
  file: string;
  from: number;
  to: number;
  /** Frames per second kept. */
  fps: number;
  width: number;
  /** A swim: the script finds the stretch that closes on itself best (at least `minLoop` seconds). */
  loop?: boolean;
  minLoop?: number;
  /** Where it faces at the start of the clip and at its end (a turn; the same if not given). The videos face right. */
  face: 1 | -1;
  endFace?: 1 | -1;
}

export const VIDEO_ANIMALS: Record<string, VideoClip[]> = {
  megalodonte_osso: [
    {
      name: 'nuoto',
      file: 'gemini_generated_video_51840751.mp4',
      from: 0,
      to: 10,
      fps: 12,
      width: 720,
      loop: true,
      minLoop: 1.5,
      face: 1,
    },
    // the quick turn of the third video (owner, 11 ottobre: the slow one looked at the camera too long): from its left
    // profile to its right one in about two seconds; mirrored for the other way
    {
      name: 'virata',
      file: 'gemini_generated_video_C6FC8D1E.mp4',
      from: 30.5,
      to: 33.3,
      fps: 24,
      width: 720,
      face: -1,
      endFace: 1,
    },
    // the bite: in profile it opens its jaws before the slow turn of the second video (played open, then back closed)
    {
      name: 'morso',
      file: 'gemini_generated_video_734C9C25.mp4',
      from: 9.9,
      to: 10.65,
      fps: 24,
      width: 720,
      face: 1,
    },
  ],
};
