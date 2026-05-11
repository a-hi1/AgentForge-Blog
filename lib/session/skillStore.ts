const STORAGE_KEY = 'agentforge_skills';
const MAX_SKILLS = 200;

export interface Skill {
  id: string;
  title: string;
  category: string;
  sourceConversationId: string;
  prompt: string;
  repairHistory: string[];
  usageCount: number;
  successRate: number;
  stabilityScore: number;
  manualConfirmed: boolean;
  promotedAt: number;
  lastUsedAt: number;
  tags: string[];
}

function generateId(): string {
  return `skill_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function loadSkills(): Skill[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Skill[];
  } catch {
    return [];
  }
}

function saveSkills(skills: Skill[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(skills));
  } catch {}
}

export function promoteToSkill(input: {
  title: string;
  category: string;
  sourceConversationId: string;
  prompt: string;
  repairHistory?: string[];
  successRate?: number;
  usageCount?: number;
  stabilityScore?: number;
  manualConfirmed?: boolean;
  tags?: string[];
}): Skill | null {
  const {
    title,
    category,
    sourceConversationId,
    prompt,
    repairHistory = [],
    successRate = 0.5,
    usageCount = 0,
    stabilityScore = 0.5,
    manualConfirmed = false,
    tags = [],
  } = input;

  const usageCountNorm = Math.min(usageCount / 10, 1);
  const score =
    successRate * 0.4 +
    usageCountNorm * 0.3 +
    stabilityScore * 0.2 +
    (manualConfirmed ? 1 : 0) * 0.1;

  if (score < 0.8) return null;

  const skill: Skill = {
    id: generateId(),
    title,
    category,
    sourceConversationId,
    prompt,
    repairHistory,
    usageCount,
    successRate,
    stabilityScore,
    manualConfirmed,
    promotedAt: Date.now(),
    lastUsedAt: Date.now(),
    tags,
  };

  const skills = loadSkills();
  skills.unshift(skill);
  if (skills.length > MAX_SKILLS) {
    skills.pop();
  }
  saveSkills(skills);
  return skill;
}

export function getSkill(id: string): Skill | undefined {
  return loadSkills().find(s => s.id === id);
}

export function recordSkillUsage(id: string): void {
  const skills = loadSkills();
  const skill = skills.find(s => s.id === id);
  if (!skill) return;
  skill.usageCount += 1;
  skill.lastUsedAt = Date.now();
  saveSkills(skills);
}

export function recordSkillResult(id: string, success: boolean): void {
  const skills = loadSkills();
  const skill = skills.find(s => s.id === id);
  if (!skill) return;
  const total = skill.usageCount;
  skill.successRate = (skill.successRate * (total - 1) + (success ? 1 : 0)) / total;
  skill.stabilityScore = success
    ? Math.min(skill.stabilityScore + 0.05, 1)
    : Math.max(skill.stabilityScore - 0.1, 0);
  saveSkills(skills);
}

export function confirmSkill(id: string): void {
  const skills = loadSkills();
  const skill = skills.find(s => s.id === id);
  if (!skill) return;
  skill.manualConfirmed = true;
  saveSkills(skills);
}

export function removeSkill(id: string): void {
  const skills = loadSkills().filter(s => s.id !== id);
  saveSkills(skills);
}

export function searchSkills(query: string): Skill[] {
  const lower = query.toLowerCase();
  return loadSkills().filter(s =>
    s.title.toLowerCase().includes(lower) ||
    s.category.toLowerCase().includes(lower) ||
    s.tags.some(t => t.toLowerCase().includes(lower))
  );
}

export function getSkillsByCategory(category: string): Skill[] {
  return loadSkills().filter(s => s.category === category);
}

export function getTopSkills(limit: number = 10): Skill[] {
  return loadSkills()
    .sort((a, b) => {
      const scoreA = a.successRate * 0.4 + Math.min(a.usageCount / 10, 1) * 0.3 + a.stabilityScore * 0.2 + (a.manualConfirmed ? 0.1 : 0);
      const scoreB = b.successRate * 0.4 + Math.min(b.usageCount / 10, 1) * 0.3 + b.stabilityScore * 0.2 + (b.manualConfirmed ? 0.1 : 0);
      return scoreB - scoreA;
    })
    .slice(0, limit);
}

export function getSkillCategories(): { name: string; count: number }[] {
  const skills = loadSkills();
  const map = new Map<string, number>();
  for (const s of skills) {
    map.set(s.category, (map.get(s.category) || 0) + 1);
  }
  return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
}

export function calculatePromotionScore(input: {
  successRate: number;
  usageCount: number;
  stabilityScore: number;
  manualConfirmed: boolean;
}): number {
  const { successRate, usageCount, stabilityScore, manualConfirmed } = input;
  const usageCountNorm = Math.min(usageCount / 10, 1);
  return (
    successRate * 0.4 +
    usageCountNorm * 0.3 +
    stabilityScore * 0.2 +
    (manualConfirmed ? 1 : 0) * 0.1
  );
}
