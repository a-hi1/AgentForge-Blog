'use client';

interface ExecutionStep {
  agent: string;
  task: string;
  output: string;
  status: string;
  timestamp: string;
}

interface Execution {
  id: string;
  prompt: string;
  status?: string;
  summary?: string;
  timestamp: string;
  steps: ExecutionStep[];
}

interface ExportButtonProps {
  execution: Execution;
}

export default function ExportButton({ execution }: ExportButtonProps) {
  const exportAsJSON = () => {
    const data = JSON.stringify(execution, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `execution-${execution.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsMarkdown = () => {
    let markdown = `# Execution Report\n\n`;
    markdown += `**ID:** ${execution.id}\n\n`;
    markdown += `**Date:** ${new Date(execution.timestamp).toLocaleString()}\n\n`;
    markdown += `**Status:** ${execution.status || 'Unknown'}\n\n`;
    markdown += `**Prompt:**\n\n${execution.prompt}\n\n`;
    markdown += `---\n\n`;

    execution.steps.forEach((step, index) => {
      markdown += `## Step ${index + 1}: ${step.agent}\n\n`;
      markdown += `**Task:** ${step.task}\n\n`;
      markdown += `**Status:** ${step.status}\n\n`;
      if (step.output) {
        markdown += `**Output:**\n\n\`\`\`\n${step.output}\n\`\`\`\n\n`;
      }
    });

    if (execution.summary) {
      markdown += `---\n\n**Summary:** ${execution.summary}\n`;
    }

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `execution-${execution.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative group">
      <button className="px-4 py-2 bg-[#1e293b]/80 text-[#94a3b8] rounded-lg hover:bg-[#334155] transition-all flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H5a2 2 0 01-2-2V7a2 2 0 012-2h5l2 2h5a2 2 0 012 2v7a2 2 0 01-2 2z"
          />
        </svg>
        Export
      </button>
      <div className="absolute right-0 mt-2 w-48 bg-[#1e293b] border border-[rgba(255,255,255,0.1)] rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <div className="py-2">
          <button
            onClick={exportAsJSON}
            className="w-full px-4 py-2 text-left text-[#94a3b8] hover:bg-[#334155] transition-all"
          >
            Export as JSON
          </button>
          <button
            onClick={exportAsMarkdown}
            className="w-full px-4 py-2 text-left text-[#94a3b8] hover:bg-[#334155] transition-all"
          >
            Export as Markdown
          </button>
        </div>
      </div>
    </div>
  );
}
