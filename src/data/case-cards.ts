// The three written case studies as their home-page cards (poster, video, caption), for pages that
// point to one: the "Next case study" link and the VEYRA coming-soon page. The home grid keeps its
// own copy inline, next to the Figma frames it mirrors.
import caseCooktop from '../assets/home/cards/case-cooktop.png';
import casePeakpause from '../assets/home/cards/case-peakpause.png';
import caseJb from '../assets/home/cards/case-jb.png';

export type CaseSlug = 'cooktop' | 'peakpause' | 'jb-air';

export const caseCards = [
  {
    slug: 'cooktop' as CaseSlug, title: 'Two markets, one cooktop app', meta: 'Whirlpool i3000 • Shipped 2025',
    alt: 'Whirlpool logo over the cooktop app', poster: caseCooktop, w: 888, h: 547,
    video: '/videos/home/cooktop.mp4', rect: { x: 114.5, y: -178.74, w: 659, h: 978.468 }, rotate: 90,
    clip: { x: 1, y: 1, w: 886, h: 545 }, logo: true,
  },
  {
    slug: 'peakpause' as CaseSlug, title: 'Health records people actually keep', meta: 'PeakPause • Shipped 2025',
    alt: 'PeakPause app: your timeline and health summary', poster: casePeakpause, w: 888, h: 499.5,
    video: '/videos/home/peakpause.mp4', rect: { x: 350.66, y: 54.24, w: 186.682, h: 391.023, r: 35.318 },
  },
  {
    slug: 'jb-air' as CaseSlug, title: 'One design language, screen to site', meta: 'JB Air • Shipped 2026',
    alt: 'The JB Air purifier in a living room', poster: caseJb, w: 888, h: 555,
    video: '/videos/home/jb.mp4', rect: { x: -8, y: -43.6, w: 904, h: 603 }, clip: { x: 1, y: 1, w: 886, h: 553 },
  },
];
