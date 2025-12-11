import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface VoiceMessagePlayerProps {
  audioUrl: string;
  isOwn?: boolean;
}

const VoiceMessagePlayer = ({ audioUrl, isOwn = false }: VoiceMessagePlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setProgress(0);
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [audioUrl]);

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newProgress = (clickX / rect.width) * 100;
    const newTime = (newProgress / 100) * audioRef.current.duration;
    
    audioRef.current.currentTime = newTime;
    setProgress(newProgress);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 min-w-[180px]">
      <button 
        onClick={togglePlayback}
        className={`p-1.5 rounded-full ${isOwn ? 'bg-white/20 hover:bg-white/30' : 'bg-primary/20 hover:bg-primary/30'} transition-colors`}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </button>
      <div 
        className={`flex-1 h-1.5 ${isOwn ? 'bg-white/30' : 'bg-primary/30'} rounded-full cursor-pointer`}
        onClick={handleProgressClick}
      >
        <div 
          className={`h-full ${isOwn ? 'bg-white' : 'bg-primary'} rounded-full transition-all duration-100`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-[10px] opacity-70 min-w-[32px]">
        {duration > 0 ? formatTime(duration) : '0:00'}
      </span>
      <Volume2 className="h-3.5 w-3.5 opacity-70" />
    </div>
  );
};

export default VoiceMessagePlayer;
