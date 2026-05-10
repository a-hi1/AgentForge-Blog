export default function Footer() {
  return (
    <footer className="border-t border-[rgba(255,255,255,0.06)] py-6">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-[#71717A] text-xs">
            © 2026 AgentForge DevOS — Prompt 驱动的个人开发操作系统
          </p>
          <div className="flex items-center gap-4 text-[#71717A] text-xs">
            <span>Next.js + Supabase</span>
            <span className="text-[rgba(255,255,255,0.1)]">|</span>
            <span>Prompt-Driven Development</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
