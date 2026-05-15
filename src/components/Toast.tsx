import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { useToastStore, ToastType } from '../store/toastStore';
import { cn } from '../lib/utils';

const icons = {
  success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
  error: <AlertCircle className="w-5 h-5 text-red-400" />,
  info: <Info className="w-5 h-5 text-indigo-400" />
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-6 right-6 z-[100] space-y-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.95 }}
            className={cn(
              "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl min-w-[300px]",
              toast.type === 'error' && "border-red-500/20",
              toast.type === 'success' && "border-emerald-500/20"
            )}
          >
            {icons[toast.type]}
            <p className="text-sm font-medium text-white flex-1">{toast.message}</p>
            <button 
              onClick={() => removeToast(toast.id)}
              className="text-neutral-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
