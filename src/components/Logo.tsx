import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo = ({ className, iconOnly = false, size = 'md' }: LogoProps) => {
  const containerSizes = {
    sm: "w-8 h-8 rounded-lg",
    md: "w-10 h-10 rounded-xl",
    lg: "w-16 h-16 rounded-2xl"
  };

  const iconSizes = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-10 h-10"
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl"
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn(
        "bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center shadow-lg shadow-indigo-600/20 ring-1 ring-white/10 shrink-0",
        containerSizes[size]
      )}>
        <Sparkles className={cn("text-white", iconSizes[size])} />
      </div>
      {!iconOnly && (
        <div className="flex flex-col">
          <span className={cn("font-bold tracking-tight text-white leading-none", textSizes[size])}>
            Mani AI
          </span>
          <span className={cn(
            "text-neutral-500 font-medium uppercase tracking-[0.2em] mt-1",
            size === 'sm' ? "text-[8px]" : "text-[10px]"
          )}>
            Framework
          </span>
        </div>
      )}
    </div>
  );
};
