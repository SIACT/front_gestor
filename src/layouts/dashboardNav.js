import {
  Award,
  BarChart3,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  DoorOpen,
  FileEdit,
  FolderTree,
  LayoutDashboard,
  LayoutGrid,
  MessageSquare,
  Mic,
  Percent,
  PlusCircle,
  Presentation,
  Receipt,
  Send,
  Settings,
  Tag,
} from 'lucide-react';
import { ROLES } from '../utils/roles';
//This file defines the navigation items for the dashboard and admin groups based on the given congress ID. It exports two functions: `navItems` and `adminGroups`, which return arrays of navigation items and admin group configurations, respectively. Each item includes properties such as the path, label, icon, and roles that can access it.
export function navItems(idCongreso) {
  return [
    {
      to: `/congresos/${idCongreso}`,
      label: 'Congreso',
      icon: LayoutDashboard,
    },
    {
      // Sin `roles`: visible para cualquier usuario autenticado del congreso, Admin incluido
      // (a diferencia de "Mis inscripciones"/"Nueva inscripción", que solo son para Participante).
      to: `/congresos/${idCongreso}/agenda`,
      label: 'Agenda',
      icon: CalendarDays,
    },
    {
      to: `/congresos/${idCongreso}/inscripciones`,
      label: 'Mis inscripciones',
      icon: ClipboardList,
      roles: [ROLES.PARTICIPANTE],
    },
    {
      to: `/congresos/${idCongreso}/inscripciones/nueva`,
      label: 'Nueva inscripción',
      icon: PlusCircle,
      roles: [ROLES.PARTICIPANTE],
    },
    {
      // Sin `roles`: a diferencia de los otros items, este no se filtra por rol de
      // cuenta — se filtra en DashboardLayout por esExpositorEnEsteCongreso (rol de
      // participación de la inscripción en ESTE congreso, no de la cuenta).
      to: `/congresos/${idCongreso}/ponencias`,
      label: 'Mis trabajos',
      icon: Mic,
    },
    {
      // Solo Participante con inscripción en ESTE congreso: el filtro por inscripción se
      // aplica en DashboardLayout (tieneInscripcion), igual que otros items por congreso.
      to: `/congresos/${idCongreso}/mi-asistencia`,
      label: 'Mi Asistencia',
      icon: CheckSquare,
      roles: [ROLES.PARTICIPANTE],
    },
    {
      // Sin `roles`: visible para cualquier usuario del congreso, Admin incluido (placeholder
      // "próximamente" hasta que exista la generación de certificados).
      to: `/congresos/${idCongreso}/certificacion`,
      label: 'Certificación',
      icon: Award,
    },
  ];
}

// Links sueltos bajo "Administración", fuera de los sub-grupos colapsables — para algo
// transversal como las estadísticas (no encaja solo en "Configuración" ni solo en
// "Gestión") que además se quiere accesible en un solo click, sin abrir un sub-grupo.
export function adminLinks(idCongreso) {
  return [
    { label: 'Estadísticas', path: `/congresos/${idCongreso}/admin/estadisticas`, icon: BarChart3 },
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
        {
          label: 'Mensajes predeterminados',
          path: `/congresos/${idCongreso}/admin/mensajes-predeterminados`,
          icon: MessageSquare,
        },
        { label: 'Salones', path: `/congresos/${idCongreso}/admin/salones`, icon: DoorOpen },
        {
          label: 'Editor de certificados',
          path: `/congresos/${idCongreso}/admin/editor-certificado`,
          icon: FileEdit,
        },
      ],
    },
    {
      label: 'Gestión',
      icon: LayoutGrid,
      items: [
        { label: 'Inscripciones', path: `/congresos/${idCongreso}/admin/inscripciones`, icon: Receipt },
        { label: 'Trabajos', path: `/congresos/${idCongreso}/admin/ponencias`, icon: Mic },
        { label: 'Horarios', path: `/congresos/${idCongreso}/admin/horarios`, icon: CalendarClock },
        { label: 'Calendario', path: `/congresos/${idCongreso}/admin/calendario`, icon: CalendarDays },
        { label: 'Asistencia', path: `/congresos/${idCongreso}/admin/asistencia`, icon: CheckSquare },
        {
          label: 'Certificados por trabajo',
          path: `/congresos/${idCongreso}/admin/certificados-trabajo`,
          icon: Award,
        },
        { label: 'Emisión masiva', path: `/congresos/${idCongreso}/admin/emision-masiva`, icon: Send },
      ],
    },
  ];
}
