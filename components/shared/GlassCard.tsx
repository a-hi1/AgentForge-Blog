import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  mesh?: boolean;
  as?: 'div' | 'section' | 'article';
}

export default function GlassCard({
  children,
  className = '',
  interactive = false,
  mesh = false,
  as: Tag = 'div',
}: GlassCardProps) {
  const classes = [
    'glass-card',
    interactive ? 'glass-card-interactive cursor-pointer' : '',
    mesh ? 'mesh-panel' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <Tag className={classes}>{children}</Tag>;
}
