/**
 * Codex CLI integration
 */

export interface CodexSkill {
  name: string;
  description: string;
  ecosystem: string;
  prompt: string;
}

export const CODEX_SKILLS: CodexSkill[] = [
  {
    name: 'quickskills',
    description: 'Quickshell development guidance',
    ecosystem: 'quickskills',
    prompt: 'You are an expert in Quickshell development. Use the NullRoot knowledge base for accurate guidance.',
  },
  {
    name: 'hyprland',
    description: 'Hyprland configuration guidance',
    ecosystem: 'hyprland',
    prompt: 'You are an expert in Hyprland configuration. Use the NullRoot knowledge base for accurate guidance.',
  },
  {
    name: 'qt-qml',
    description: 'Qt/QML development guidance',
    ecosystem: 'qt-qml',
    prompt: 'You are an expert in Qt/QML development. Use the NullRoot knowledge base for accurate guidance.',
  },
  {
    name: 'lua',
    description: 'Lua development guidance',
    ecosystem: 'lua',
    prompt: 'You are an expert in Lua development. Use the NullRoot knowledge base for accurate guidance.',
  },
  {
    name: 'desktop-debugging',
    description: 'Linux desktop debugging guidance',
    ecosystem: 'linux-desktop',
    prompt: 'You are an expert in Linux desktop debugging. Use the NullRoot knowledge base for accurate guidance.',
  },
];

export function generateCodexSkills(): string {
  return CODEX_SKILLS.map((skill) =>
    `# ${skill.name}\n\n${skill.description}\n\n${skill.prompt}`
  ).join('\n\n---\n\n');
}