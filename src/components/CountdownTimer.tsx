import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  targetDate: Date;
  label?: string;
  onComplete?: () => void;
  className?: string;
  showIcon?: boolean;
  compact?: boolean;
}

const CountdownTimer = ({ 
  targetDate, 
  label, 
  onComplete, 
  className = '',
  showIcon = true,
  compact = false
}: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });
        onComplete?.();
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, total: difference });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  if (timeLeft.total <= 0) {
    return null;
  }

  const formatTime = () => {
    if (compact) {
      if (timeLeft.days > 0) {
        return `${timeLeft.days}d ${timeLeft.hours}h`;
      }
      if (timeLeft.hours > 0) {
        return `${timeLeft.hours}h ${timeLeft.minutes}m`;
      }
      return `${timeLeft.minutes}m ${timeLeft.seconds}s`;
    }

    const parts = [];
    if (timeLeft.days > 0) parts.push(`${timeLeft.days}d`);
    if (timeLeft.hours > 0) parts.push(`${timeLeft.hours}h`);
    if (timeLeft.minutes > 0) parts.push(`${timeLeft.minutes}m`);
    if (timeLeft.seconds >= 0 && timeLeft.days === 0) parts.push(`${timeLeft.seconds}s`);
    return parts.join(' ');
  };

  return (
    <div className={`flex items-center gap-1.5 text-xs ${className}`}>
      {showIcon && <Clock className="h-3 w-3" />}
      {label && <span className="text-muted-foreground">{label}</span>}
      <span className="font-mono font-medium">{formatTime()}</span>
    </div>
  );
};

export default CountdownTimer;
