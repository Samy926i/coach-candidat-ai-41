import { Badge } from "@/components/ui/badge";
import { ScoreBadgeProps } from "@/types/coaching";
import { cn } from "@/lib/utils";

export function ScoreBadge({ score, label, size = 'md' }: ScoreBadgeProps) {
  const getScoreVariant = (score: number) => {
    if (score >= 8.5) return 'excellent';
    if (score >= 7.0) return 'good';
    if (score >= 5.0) return 'average';
    return 'poor';
  };

  const getScoreClasses = (variant: string) => {
    switch (variant) {
      case 'excellent':
        return 'score-excellent border';
      case 'good':
        return 'score-good border';
      case 'average':
        return 'score-average border';
      case 'poor':
        return 'score-poor border';
      default:
        return '';
    }
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-1';
      case 'lg':
        return 'text-base px-4 py-2';
      default:
        return 'text-sm px-3 py-1.5';
    }
  };

  const variant = getScoreVariant(score);

  return (
    <Badge 
      className={cn(
        getScoreClasses(variant),
        getSizeClasses(size),
        'font-medium transition-all duration-200'
      )}
    >
      <span className="mr-2">{label}</span>
      <span className="font-bold">{score.toFixed(1)}/10</span>
    </Badge>
  );
}