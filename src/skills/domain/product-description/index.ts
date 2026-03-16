/**
 * Product Description Generator — Skill Manifest
 *
 * This is a content-generation skill. It has no tools of its own.
 * The skill instructions in SKILL.md guide the LLM to produce structured JSON output.
 *
 * To invoke: pass the skill's instructions as the system prompt and call the LLM
 * with a JSON input object as the user message.
 */

import { SkillManifest } from '../../types';

const manifest: SkillManifest = {
    tools: [], // Content-only skill — no agent tools required
};

export default manifest;
export const tools = [];
