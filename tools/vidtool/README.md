# vidtool

Converts macOS screen recordings into web-ready MP4s using only Apple's built-in frameworks (no ffmpeg).

Build: `swiftc -O tools/vidtool/main.swift -o tools/vidtool/vidtool`

| Command | What it does |
|---|---|
| `vidtool info <in>` | size, fps, duration, audio tracks |
| `vidtool frame <in> <sec> <out.png>` | exact frame at a time (use `0` to match a Figma poster) |
| `vidtool encode <in> <out.mp4> <width> <kbps> [audio] [cut=<n>] [fade=<frames>] [end=<sec>]` | constant 30fps H.264, first frame at 0s, optional sound, dissolves on hard cuts, trim end |
| `vidtool luma <in> [step]` | brightness over time (finds dark flashes) |
| `vidtool mad <in> [min]` | frame-to-frame change (cuts vs scrolling) |
| `vidtool pts <in>` | timestamp sanity check |

Settings used for PeakPause:
- Phone UI loops: `600 1000 cut=25` (scrolling stays under ~20; real cuts are 29+)
- Rapid design click-throughs: `cut=12 fade=8`
- Launch film: `840 1500 audio` (never dissolve a produced edit)

- Recording of a playing video with freezes / uneven capture (Yucatan card): `1600 2600 even=24`, no `cut` (fast motion isn't a cut)

Gotchas:
- macOS recording filenames contain a narrow no-break space before AM/PM, so match files with `grep -F "at 4.24.47"`, not the full name.
- Figma video layer names are often stale. Match each slot by comparing the video's frame 0 with the exported Figma poster.
- After re-encoding, bump `VIDEO_VERSION` in `src/components/case-study/VideoSlot.astro`.
