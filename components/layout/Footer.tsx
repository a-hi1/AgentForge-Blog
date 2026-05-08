export default function Footer() {
  return (
    <footer className="border-t border-[rgba(255,255,255,0.06)] py-6">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-[#475569] text-xs">
            © 2026 AgentForge 智能工程系统
          </p>
          <div className="flex items-center gap-4 text-[#475569] text-xs">
            <span>Next.js + Supabase</span>
            <span className="text-[rgba(255,255,255,0.1)]">|</span>
            <span>多代理协同架构</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
