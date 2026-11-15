/**
 * Claude Code integration
 */

export interface ClaudeCodeSkill {
  name: string;
  description: string;
  ecosystem: string;
  instructions: string;
  tools: string[];
}

export const CLAUDE_CODE_SKILLS: ClaudeCodeSkill[] = [
  {
    name: 'quickskills',
    description: 'Quickshell development guidance',
    ecosystem: 'quickskills',
    instructions: 'Use the NullRoot knowledge base for Quickshell development',
    tools: ['search_guidance', 'retrieve_guide', 'detect_environment', 'inspect_project'],
  },
  {
    name: 'hyprland',
    description: 'Hyprland configuration guidance',
    ecosystem: 'hyprland',
    instructions: 'Use the NullRoot knowledge base for Hyprland configuration',
    tools: ['search_guidance', 'retrieve_guide', 'detect_environment', 'inspect_project'],
  },
  {
    name: 'qt-qml',
    description: 'Qt/QML development guidance',
    ecosystem: 'qt-qml',
    instructions: 'Use the NullRoot knowledge base for Qt/QML development',
    tools: ['search_guidance', 'retrieve_guide', 'detect_environment', 'inspect_project'],
  },
  {
    name: 'lua',
    description: 'Lua development guidance',
    ecosystem: 'lua',
    instructions: 'Use the NullRoot knowledge base for Lua development',
    tools: ['search_guidance', 'retrieve_guide', 'detect_environment', 'inspect_project'],
  },
  {
    name: 'desktop-debugging',
    description: 'Linux desktop debugging guidance',
    ecosystem: 'linux-desktop',
    instructions: 'Use the NullRoot knowledge base for desktop debugging',
    tools: ['search_guidance', 'retrieve_guide', 'detect_environment', 'inspect_project'],
  },
];

export function generateClaudeCodeSkills(): string {
  return CLAUDE_CODE_SKILLS.map((skill) =>
    `---
name: ${skill.name}
description: ${skill.description}
---
${skill.instructions}`
  ).join('\n\n');
}