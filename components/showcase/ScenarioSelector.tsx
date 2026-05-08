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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {scenarios.map((scenario) => {
        const isSelected = scenario.id === selectedId;
        return (
          <button
            key={scenario.id}
            onClick={() => onSelect(scenario.id)}
            className={`p-4 rounded-xl text-left transition-all ${
              isSelected
                ? 'border-2 border-[#3B82F6] bg-[rgba(59,130,246,0.08)]'
                : 'border border-[rgba(255,255,255,0.06)] bg-[rgba(24,24,27,0.5)] hover:border-[rgba(59,130,246,0.3)] hover:bg-[rgba(59,130,246,0.03)]'
            }`}
          >
            <h3 className={`font-semibold text-sm mb-2 ${isSelected ? 'text-[#60A5FA]' : 'text-[#FAFAFA]'}`}>
              {scenario.name}
            </h3>
            <p className="text-[#71717A] text-xs line-clamp-3 leading-relaxed">
              {scenario.prompt}
            </p>
          </button>
        );
      })}
    </div>
  );
}
