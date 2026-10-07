import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  CalendarDays,
  Car,
  CircleAlert,
  CircleCheck,
  EyeOff,
  Home,
  Image,
  LayoutGrid,
  MessageCircle,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Sun,
  LoaderCircle,
  BarChart3,
  Flag,
  GraduationCap,
  Lock,
  MapPin,
  MessageSquare,
  Sparkles,
  X,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';

export type IconoNav =
  | 'feed'
  | 'eventos'
  | 'aventones'
  | 'marketplace'
  | 'anonimo'
  | 'mensajes'
  | 'directorio'
  | 'ajustes'
  | 'mas'
  | 'publicar';

const MAPA: Record<IconoNav, LucideIcon> = {
  feed: Home,
  eventos: CalendarDays,
  aventones: Car,
  marketplace: ShoppingBag,
  anonimo: EyeOff,
  mensajes: MessageCircle,
  directorio: Search,
  ajustes: Settings,
  mas: MoreHorizontal,
  publicar: Plus,
};

export function IconoNav({
  nombre,
  size = 22,
  strokeWidth = 1.75,
  className,
  ...props
}: { nombre: IconoNav } & LucideProps) {
  const Componente = MAPA[nombre];
  return <Componente size={size} strokeWidth={strokeWidth} className={className} aria-hidden {...props} />;
}

export {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Car,
  CircleAlert,
  CircleCheck,
  EyeOff,
  Flag,
  GraduationCap,
  Image,
  LayoutGrid,
  LoaderCircle,
  Lock,
  MapPin,
  MessageCircle,
  MessageSquare,
  Moon,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Sun,
  X,
};
