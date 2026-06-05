'use client';

import { AlertTriangle, X } from 'lucide-react';

type Props = {
  title: string;
  message: string;
  onDismiss: () => void;
};

export function ErrorModal({ title, message, onDismiss }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="error-modal-title"
    >
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
        onClick={onDismiss}
        aria-hidden
      />
      <div className="relative z-10 w-full rounded-t-3xl bg-white p-6 shadow-2xl animate-fade-in-up sm:max-w-sm sm:rounded-3xl sm:animate-scale-in">
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
            <AlertTriangle className="h-9 w-9 text-red-600" aria-hidden />
          </div>

          <h3 id="error-modal-title" className="text-xl font-bold text-slate-900 sm:text-2xl">
            {title}
          </h3>
          <p className="mt-3 text-base leading-relaxed text-slate-600">{message}</p>

          <button
            type="button"
            onClick={onDismiss}
            className="mt-8 min-h-14 w-full rounded-2xl bg-red-600 px-4 text-base font-bold text-white transition-colors hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
