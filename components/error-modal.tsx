'use client';

import { AlertTriangle, X } from 'lucide-react';

type Props = {
  title: string;
  message: string;
  onDismiss: () => void;
};

export function ErrorModal({ title, message, onDismiss }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onDismiss}
      />
      <div className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>

          <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">{message}</p>

          <button
            onClick={onDismiss}
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-2xl transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
