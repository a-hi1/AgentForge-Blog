export interface Step {
  step: number;
  agent: string;
  task: string;
  output: string;
  status: 'thinking' | 'executing' | 'completed' | 'pending' | 'running' | 'failed';
  timestamp?: string;
}
