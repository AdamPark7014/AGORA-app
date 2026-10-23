import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  CalendarDays,
  Car,
  CircleAlert,
  CircleCheck,
  Eye,
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
  Bell,
  Bookmark,
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
  | 'guardados'
  | 'notificaciones'
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
  guardados: Bookmark,
  notificaciones: Bell,
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
  Eye,
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
