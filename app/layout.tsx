import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'AgentForge — Memory-Augmented Multi-Agent Workbench',
  description:
    '记忆增强多智能体工程工作台。导入 GitHub 仓库，规划 → 执行 → 校验 → 记忆闭环，一键导出给 Claude / Cursor / GPT。',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'AgentForge',
    description: 'Memory-augmented multi-agent engineering workbench',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="font-sans antialiased">
        <div className="relative z-10 min-h-dvh flex flex-col">
          <Header />
          <main className="flex-grow">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
