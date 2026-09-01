import {
  BookOpen,
  ClipboardList,
  FolderTree,
  LayoutDashboard,
  LayoutGrid,
  Mic,
  Percent,
  PlusCircle,
  Presentation,
  Receipt,
  Settings,
  Tag,
} from 'lucide-react';
import { ROLES } from '../utils/roles';

export function navItems(idCongreso) {
  return [
    {
      to: `/congresos/${idCongreso}`,
      label: 'Resumen',
      icon: LayoutDashboard,
    },
    {
      to: `/congresos/${idCongreso}/inscripciones`,
      label: 'Mis inscripciones',
      icon: ClipboardList,
      roles: [ROLES.PONENTE, ROLES.ESTUDIANTE],
    },
    {
      to: `/congresos/${idCongreso}/inscripciones/nueva`,
      label: 'Nueva inscripción',
      icon: PlusCircle,
      roles: [ROLES.PONENTE, ROLES.ESTUDIANTE],
    },
    {
      to: `/congresos/${idCongreso}/ponencias`,
      label: 'Mis ponencias',
      icon: Mic,
      roles: [ROLES.PONENTE],
    },
  ];
}

export function adminGroups(idCongreso) {
  return [
    {
      label: 'Configuración',
      icon: Settings,
      items: [
        { label: 'Áreas de estudio', path: `/congresos/${idCongreso}/admin/areas-estudio`, icon: BookOpen },
        { label: 'Tipos de participación', path: `/congresos/${idCongreso}/admin/tipos-participacion`, icon: Presentation },
        { label: 'Tipos de asistente', path: `/congresos/${idCongreso}/admin/tipos-asistente`, icon: Tag },
        { label: 'Categorías', path: `/congresos/${idCongreso}/admin/categorias`, icon: FolderTree },
        { label: 'Descuentos', path: `/congresos/${idCongreso}/admin/descuentos`, icon: Percent },
      ],
    },
    {
      label: 'Gestión',
      icon: LayoutGrid,
      items: [
        { label: 'Inscripciones', path: `/congresos/${idCongreso}/admin/inscripciones`, icon: Receipt },
        { label: 'Ponencias', path: `/congresos/${idCongreso}/admin/ponencias`, icon: Mic },
      ],
    },
  ];
}
