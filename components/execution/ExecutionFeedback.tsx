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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">执行反馈</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 执行状态 */}
          <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">执行结果</label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setStatus('success')}
              className={`p-4 rounded-xl border-2 transition-all ${
                status === 'success'
                  ? 'border-green-500 bg-green-500/20 text-green-400'
                  : 'border-slate-700 bg-slate-800 text-gray-400 hover:border-slate-600'
              }`}
            >
              <div className="text-2xl mb-1">✅</div>
              <div className="text-sm font-medium">成功</div>
            </button>
            <button
              type="button"
              onClick={() => setStatus('partial')}
              className={`p-4 rounded-xl border-2 transition-all ${
                status === 'partial'
                  ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400'
                  : 'border-slate-700 bg-slate-800 text-gray-400 hover:border-slate-600'
              }`}
            >
              <div className="text-2xl mb-1">⚠️</div>
              <div className="text-sm font-medium">部分成功</div>
            </button>
            <button
              type="button"
              onClick={() => setStatus('failed')}
              className={`p-4 rounded-xl border-2 transition-all ${
                status === 'failed'
                  ? 'border-red-500 bg-red-500/20 text-red-400'
                  : 'border-slate-700 bg-slate-800 text-gray-400 hover:border-slate-600'
              }`}
            >
              <div className="text-2xl mb-1">❌</div>
              <div className="text-sm font-medium">失败</div>
            </button>
          </div>
        </div>

          {/* 评分 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">满意度评分</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`p-2 rounded-lg transition-all ${
                    star <= rating
                      ? 'text-yellow-400'
                      : 'text-gray-600 hover:text-gray-400'
                  }`}
                >
                  <svg className="w-8 h-8" fill={star <= rating ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
              ))}
              <span className="ml-2 text-gray-400 text-sm">
                {rating === 1 ? '非常不满意' :
                 rating === 2 ? '不满意' :
                 rating === 3 ? '一般' :
                 rating === 4 ? '满意' : '非常满意'}
              </span>
            </div>
          </div>

          {/* 评论 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">改进建议（可选）</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Agent 哪些地方做得不够好？或者有什么可以改进的？"
              className="w-full h-24 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          {/* 按钮 */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl bg-slate-800 text-gray-300 hover:bg-slate-700 transition-colors font-medium"
            >
              稍后
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium transition-all"
            >
              提交反馈
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
