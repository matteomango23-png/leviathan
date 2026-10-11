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
  /** Where it faces at the start of the clip (the videos face right). */
  face: 1 | -1;
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
    // from its right profile, towards you, to its left profile
    {
      name: 'virata',
      file: 'gemini_generated_video_734C9C25.mp4',
      from: 10.25,
      to: 18.75,
      fps: 12,
      width: 720,
      face: 1,
    },
  ],
};
