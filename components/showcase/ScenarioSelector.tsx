'use client';

interface Scenario {
  id: string;
  name: string;
  prompt: string;
}

interface ScenarioSelectorProps {
  scenarios: Scenario[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function ScenarioSelector({ scenarios, selectedId, onSelect }: ScenarioSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {scenarios.map((scenario) => {
        const isSelected = scenario.id === selectedId;
        return (
          <button
            key={scenario.id}
            onClick={() => onSelect(scenario.id)}
            className={`p-4 rounded-xl text-left transition-all ${
              isSelected
                ? 'border-2 border-[#6366f1] bg-[rgba(99,102,241,0.08)] shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                : 'border border-[rgba(255,255,255,0.08)] bg-[#1e293b]/50 hover:border-[rgba(99,102,241,0.3)] hover:bg-[rgba(99,102,241,0.03)]'
            }`}
          >
            <h3 className={`font-semibold text-sm mb-2 ${isSelected ? 'text-[#818cf8]' : 'text-[#f8fafc]'}`}>
              {scenario.name}
            </h3>
            <p className="text-[#64748b] text-xs line-clamp-3 leading-relaxed">
              {scenario.prompt}
            </p>
          </button>
        );
      })}
    </div>
  );
}
