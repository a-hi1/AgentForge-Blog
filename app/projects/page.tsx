'use client';

import { useState } from 'react';
import ProjectCard from '@/components/projects/ProjectCard';
import projectsData from '@/data/projects.json';

export default function ProjectsPage() {
  const [filter, setFilter] = useState('all');
  
  const filteredProjects = filter === 'all' 
    ? projectsData 
    : projectsData.filter(p => p.status === filter);
  
  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.2)] text-[#60A5FA] text-xs font-medium uppercase tracking-wider mb-4">
            项目展示
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#FAFAFA] mb-4">
            项目中心
          </h1>
          <p className="text-[#A1A1AA] text-lg max-w-2xl mx-auto">
            由 AI 智能工程流构建的真实产品。
          </p>
        </div>
        
        <div className="flex justify-center gap-3 mb-12">
          {['all', 'live', 'beta'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-[rgba(59,130,246,0.1)] text-[#60A5FA] border border-[#3B82F6]'
                  : 'bg-[rgba(24,24,27,0.72)] text-[#A1A1AA] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(63,63,70,0.6)]'
              }`}
            >
              {{ all: '全部', live: '已上线', beta: '测试中' }[f]}
            </button>
          ))}
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </div>
  );
}
