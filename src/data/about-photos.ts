// Captions for the About page photo wall, keyed by file name in src/assets/about/photos/.
// Every image in that folder shows on the wall: those listed here first, in this order, then the
// rest by file name, uncaptioned.
// Photos come from _incoming/Images, prepared with GPS/EXIF stripped; the JLPT result is cropped
// (its footer URL held the result login) and its registration number blanked.
// TODO(Kavita): captions are drafts written from what each photo shows; correct any that are off.
export const photoCaptions: Record<string, string> = {
  '01-medical-expo-guwahati.jpg': 'Medical Expo, Guwahati',
  '02-pickleball.jpg': 'Pickleball',
  '23-medtech-expo.jpg': 'Medtech expo',
  '03-jlpt-n5.jpg': 'JLPT N5 · Passed, 2024',
  '04-workshop-wall.jpg': 'Workshop wall',
  '05-cooked-from-scratch.jpg': 'Cooked from scratch',
  '21-team-art.jpg': 'Team art',
  '06-hardware-prototype.jpg': 'Prototyping hardware',
  '07-hills.jpg': 'Out in the hills',
  '08-matcha.jpg': 'Matcha break',
  '09-conference.jpg': 'Conference day',
  '22-event-team.jpg': 'Event day with the team',
  '10-desk-morning.jpg': 'Desk, morning',
  '11-healthcare-expo.jpg': 'Healthcare expo',
  '26-microscope.jpg': 'Research: microscope observation',
  '12-noodles.jpg': 'Noodles for the table',
  '13-dance.jpg': 'Dance',
  '14-hands-on.jpg': 'Hands-on',
  '25-tech-in-asia.jpg': 'Tech in Asia',
  '15-window-seat.jpg': 'Window seat',
  '16-desk-night.jpg': 'Desk, late night',
  '17-game-day.jpg': 'Game day',
  '18-home-cooked.jpg': 'Home-cooked',
  '19-session.jpg': 'In the session',
  '20-looking-up.jpg': 'Looking up',
};

// Shown only while the folder is empty, so the layout can be reviewed before the photos arrive.
export const placeholderPhotos: { label: string; ratio: string }[] = [
  { label: 'Field work', ratio: '4 / 5' },
  { label: 'Cooking', ratio: '1 / 1' },
  { label: 'JLPT N5 certificate', ratio: '7 / 5' },
  { label: 'Dance', ratio: '3 / 4' },
  { label: 'Field work', ratio: '4 / 3' },
  { label: 'Lifting', ratio: '4 / 5' },
  { label: 'Field work', ratio: '1 / 1' },
  { label: 'Interests', ratio: '3 / 4' },
];
