export interface AgentContract {
  maxFilesPerStep: number;
  maxLinesPerFile: number;
  requirePause: boolean;
  forbidAutoRefactor: boolean;
  requireVerification: boolean;
  forbidNewDependencies: boolean;
  forbidModifyUnspecified: boolean;
  requireExplicitImports: boolean;
}

const DEFAULT_CONTRACT: AgentContract = {
  maxFilesPerStep: 5,
  maxLinesPerFile: 300,
  requirePause: true,
  forbidAutoRefactor: true,
  requireVerification: true,
  forbidNewDependencies: true,
  forbidModifyUnspecified: true,
  requireExplicitImports: true,
};

export function buildAgentContract(overrides?: Partial<AgentContract>): AgentContract {
  return { ...DEFAULT_CONTRACT, ...overrides };
}

export function formatContractAsMarkdown(contract: AgentContract): string {
  const lines: string[] = [];

  lines.push('## AGENT EXECUTION CONTRACT');
  lines.push('');
  lines.push('执行以下任务时，你必须严格遵守以下约束：');
  lines.push('');
  lines.push(`- 每步最多修改 ${contract.maxFilesPerStep} 个文件`);
  lines.push(`- 单文件不超过 ${contract.maxLinesPerFile} 行`);

  if (contract.requirePause) {
    lines.push('- 每完成一个 Phase，输出 DONE_PHASE_N，等待用户确认后再继续');
  }
  if (contract.forbidAutoRefactor) {
    lines.push('- 禁止自动重构未指定的代码');
  }
  if (contract.requireVerification) {
    lines.push('- 每个 Phase 完成后必须运行验证命令');
  }
  if (contract.forbidNewDependencies) {
    lines.push('- 禁止安装未在技术决策中列出的依赖');
  }
  if (contract.forbidModifyUnspecified) {
    lines.push('- 禁止修改任务列表中未指定的文件');
  }
  if (contract.requireExplicitImports) {
    lines.push('- 所有 import 必须使用完整路径，禁止相对路径 guess');
  }

  lines.push('');
  lines.push('违反以上任意约束视为任务失败。');

  return lines.join('\n');
}
