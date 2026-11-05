// AI tools shown beside a work card's title. Add a tool here, then list it under its project.
import type { ImageMetadata } from 'astro';
import chatgpt from '../assets/home/ai-tools/chatgpt.svg';
import claude from '../assets/home/ai-tools/claude.svg';
import codex from '../assets/home/ai-tools/codex.svg';
import cursor from '../assets/home/ai-tools/cursor.svg';
import figma from '../assets/home/ai-tools/figma.svg';
import framer from '../assets/home/ai-tools/framer.svg';
import gemini from '../assets/home/ai-tools/gemini.svg';
import higgsfield from '../assets/home/ai-tools/higgsfield.png';
import jitter from '../assets/home/ai-tools/jitter.png';
import lovable from '../assets/home/ai-tools/lovable.svg';
import mobbin from '../assets/home/ai-tools/mobbin.png';
import nanoBanana from '../assets/home/ai-tools/nano-banana.svg';
import perplexity from '../assets/home/ai-tools/perplexity.svg';

/** `tile`: the logo is already a full square app icon, so it fills the chip instead of sitting inside it. */
export interface AiTool { name: string; logo: Pick<ImageMetadata, 'src'>; tile?: boolean }

const CLAUDE: AiTool = { name: 'Claude', logo: claude };
const CLAUDE_DESIGN: AiTool = { name: 'Claude Design', logo: claude };
const CHATGPT: AiTool = { name: 'ChatGPT', logo: chatgpt };
const CODEX: AiTool = { name: 'Codex', logo: codex };
const CURSOR: AiTool = { name: 'Cursor', logo: cursor };
const FIGMA_AI: AiTool = { name: 'Figma AI', logo: figma };
const FRAMER: AiTool = { name: 'Framer', logo: framer };
const GEMINI: AiTool = { name: 'Gemini', logo: gemini };
const HIGGSFIELD: AiTool = { name: 'Higgsfield', logo: higgsfield, tile: true };
const JITTER: AiTool = { name: 'Jitter', logo: jitter, tile: true };
const LOVABLE: AiTool = { name: 'Lovable', logo: lovable };
const MOBBIN_MCP: AiTool = { name: 'Mobbin MCP', logo: mobbin };
const NANO_BANANA: AiTool = { name: 'Nano Banana', logo: nanoBanana };
const PERPLEXITY: AiTool = { name: 'Perplexity', logo: perplexity };

export const REBORN_GOODS_TOOLS = [CLAUDE, HIGGSFIELD, CHATGPT, FRAMER];
export const IDENTITY_LABS_TOOLS = [CURSOR, CLAUDE_DESIGN, NANO_BANANA, JITTER];
export const JB_AIR_TOOLS = [CLAUDE, CODEX, LOVABLE, NANO_BANANA, HIGGSFIELD, PERPLEXITY];
export const VEYRA_TOOLS = [CLAUDE_DESIGN, FIGMA_AI, MOBBIN_MCP, HIGGSFIELD];
export const GOOGLE_MAPS_TOOLS = [PERPLEXITY, CLAUDE, GEMINI];
export const PORTFOLIO_TOOLS = [CHATGPT, FRAMER, CLAUDE_DESIGN, GEMINI];
export const PROSTHETIC_HAND_TOOLS = [PERPLEXITY, CHATGPT, GEMINI];
