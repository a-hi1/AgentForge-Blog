'use client';

import React from 'react';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: number | string;
  height?: number | string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
}) => {
  const baseStyles = 'shimmer';

  const variantStyles = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

export const SkeletonCard = () => (
  <div className="glass-card rounded-xl p-6 space-y-4">
    <Skeleton variant="rectangular" height={120} className="mb-4" />
    <Skeleton width="60%" />
    <Skeleton width="80%" />
  </div>
);

export const SkeletonMetrics = () => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="glass-card rounded-xl p-4 text-center">
        <Skeleton variant="text" width="60%" className="mx-auto mb-2" />
        <Skeleton variant="text" width="40%" className="mx-auto" />
      </div>
    ))}
  </div>
);
