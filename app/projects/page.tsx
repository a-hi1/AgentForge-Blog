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
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] text-[#818cf8] text-xs font-medium uppercase tracking-wider mb-4">
            Showcase
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#f8fafc] mb-4">
            Projects
          </h1>
          <p className="text-[#94a3b8] text-lg max-w-2xl mx-auto">
            Real products built with AI-powered development workflows.
          </p>
        </div>
        
        {/* Filter */}
        <div className="flex justify-center gap-3 mb-12">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === 'all'
                ? 'bg-[rgba(99,102,241,0.1)] text-[#818cf8] border border-[#6366f1]'
                : 'bg-[#1e293b] text-[#94a3b8] border border-[rgba(255,255,255,0.15)] hover:bg-[#334155]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('live')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === 'live'
                ? 'bg-[rgba(99,102,241,0.1)] text-[#818cf8] border border-[#6366f1]'
                : 'bg-[#1e293b] text-[#94a3b8] border border-[rgba(255,255,255,0.15)] hover:bg-[#334155]'
            }`}
          >
            Live
          </button>
          <button
            onClick={() => setFilter('beta')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === 'beta'
                ? 'bg-[rgba(99,102,241,0.1)] text-[#818cf8] border border-[#6366f1]'
                : 'bg-[#1e293b] text-[#94a3b8] border border-[rgba(255,255,255,0.15)] hover:bg-[#334155]'
            }`}
          >
            Beta
          </button>
        </div>
        
        {/* Project Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </div>
  );
}
