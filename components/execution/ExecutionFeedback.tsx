'use client';

import { useState } from 'react';

interface ExecutionFeedbackProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: {
    status: 'success' | 'partial' | 'failed';
    rating: number;
    comment: string;
  }) => void;
}

export default function ExecutionFeedback({ isOpen, onClose, onSubmit }: ExecutionFeedbackProps) {
  const [status, setStatus] = useState<'success' | 'partial' | 'failed'>('success');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ status, rating, comment });
    onClose();
  };

  const idleBtn =
    'border-[var(--border-light)] bg-[rgba(255,255,255,0.03)] text-[var(--text-tertiary)] hover:border-[var(--border-strong)]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg glass-card rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--text)]">执行反馈</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">执行结果</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setStatus('success')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  status === 'success'
                    ? 'border-green-500 bg-green-500/20 text-green-400'
                    : idleBtn
                }`}
              >
                <div className="mb-1 flex justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-sm font-medium">成功</div>
              </button>
              <button
                type="button"
                onClick={() => setStatus('partial')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  status === 'partial'
                    ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400'
                    : idleBtn
                }`}
              >
                <div className="mb-1 flex justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <div className="text-sm font-medium">部分成功</div>
              </button>
              <button
                type="button"
                onClick={() => setStatus('failed')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  status === 'failed'
                    ? 'border-red-500 bg-red-500/20 text-red-400'
                    : idleBtn
                }`}
              >
                <div className="mb-1 flex justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-sm font-medium">失败</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">满意度评分</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  aria-label={`${star} 星`}
                  className={`p-2 rounded-lg transition-all ${
                    star <= rating
                      ? 'text-yellow-400'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-tertiary)]'
                  }`}
                >
                  <svg className="w-8 h-8" fill={star <= rating ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
              ))}
              <span className="ml-2 text-[var(--text-tertiary)] text-sm">
                {rating === 1 ? '非常不满意' :
                 rating === 2 ? '不满意' :
                 rating === 3 ? '一般' :
                 rating === 4 ? '满意' : '非常满意'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">改进建议（可选）</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Agent 哪些地方做得不够好？或者有什么可以改进的？"
              className="input-field h-24 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              稍后
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
            >
              提交反馈
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
