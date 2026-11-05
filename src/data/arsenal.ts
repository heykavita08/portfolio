// The tools in the home page's "In the arsenal" section, by category. A tool's logo is
// src/assets/home/arsenal/<slug>.png; a tool with no logo file shows its first letter instead.
import type { ImageMetadata } from 'astro';

const files = import.meta.glob<{ default: ImageMetadata }>('../assets/home/arsenal/*.png', { eager: true });
const logo = (slug: string) => files[`../assets/home/arsenal/${slug}.png`]?.default;
const tool = (name: string, slug: string) => ({ name, logo: logo(slug) });

export const arsenal = [
  { title: 'AI Code', tools: [tool('Cursor', 'cursor'), tool('Codex', 'codex'), tool('Claude Code', 'claude'), tool('Lovable', 'lovable'), tool('Framer', 'framer')] },
  { title: 'AI Design', tools: [tool('Figma', 'figma'), tool('Mobbin', 'mobbin'), tool('Paper', 'paper'), tool('Claude Design', 'claude-design'), tool('Stitch', 'stitch'), tool('Lovart', 'lovart')] },
  { title: 'Prototyping', tools: [tool('ProtoPie', 'protopie'), tool('Figma Make', 'figma'), tool('Claude Code', 'claude')] },
  { title: 'Research', tools: [tool('Claude', 'claude'), tool('Perplexity', 'perplexity'), tool('UserTesting.com', 'usertesting'), tool('Askpot', 'askpot')] },
  { title: 'Components', tools: [tool('shadcn/ui', 'shadcn'), tool('21st.dev', '21st'), tool('React Bits', 'react-bits'), tool('Fancy Components', 'fancy-components')] },
  { title: 'Figma', tools: [tool('Tokens Studio', 'tokens-studio'), tool('html.to.design', 'html-to-design'), tool('Contrast', 'figma')] },
  { title: 'Motion', tools: [tool('Figma Motion', 'figma'), tool('Jitter', 'jitter'), tool('Lottie Creator', 'lottie')] },
  { title: 'Color', tools: [tool('OKLCH Picker', 'oklch'), tool('Color.review', 'color-review'), tool('Easing Gradients', 'easing'), tool('Coolors', 'coolors'), tool('Neato Gradients', 'neato')] },
  { title: 'Icons', tools: [tool('Phosphor', 'phosphor'), tool('Lucide', 'lucide'), tool('Hugeicons', 'hugeicons'), tool('Iconify', 'iconify')] },
  { title: 'Video', tools: [tool('Remotion', 'remotion'), tool('HyperFrames', 'hyperframes')] },
  { title: 'Dictation', tools: [tool('Granola', 'granola'), tool('Wispr Flow', 'wispr')] },
  { title: 'Ship', tools: [tool('Vercel', 'vercel'), tool('Framer', 'framer'), tool('Figma Code', 'figma')] },
];
