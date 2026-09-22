import { Drumstick, Salad, Wheat, type LucideIcon } from 'lucide-react';
import type { CategoryCode } from '../data/categories';

/** One mark per reel. The dish card draws its three picks with these instead of a photo. */
const ICONS: Record<CategoryCode, LucideIcon> = {
  protein: Drumstick,
  green: Salad,
  grain: Wheat,
};

interface CategoryIconProps {
  category: CategoryCode;
  size?: number;
}

export default function CategoryIcon({ category, size = 22 }: CategoryIconProps) {
  const Icon = ICONS[category];
  return <Icon size={size} strokeWidth={2.75} aria-hidden="true" />;
}
