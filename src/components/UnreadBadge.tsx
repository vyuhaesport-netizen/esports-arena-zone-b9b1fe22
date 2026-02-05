import { cn } from '@/lib/utils';

interface UnreadBadgeProps {
  count: number;
  className?: string;
  size?: 'sm' | 'md';
}

export const UnreadBadge = ({ count, className, size = 'md' }: UnreadBadgeProps) => {
  if (count <= 0) return null;

  const displayCount = count > 99 ? '99+' : count.toString();
  
  return (
    <span
      className={cn(
        'absolute bg-destructive text-destructive-foreground font-bold rounded-full flex items-center justify-center animate-pulse shadow-lg',
        size === 'sm' 
          ? 'min-w-[16px] h-[16px] text-[9px] px-1 -top-0.5 -right-0.5' 
          : 'min-w-[20px] h-[20px] text-[10px] px-1 -top-1 -right-1',
        className
      )}
    >
      {displayCount}
    </span>
  );
};
