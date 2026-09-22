import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  UserRound,
  ShieldAlert,
  ClipboardCheck,
  ListChecks,
  Users,
  Settings,
  Grid3x3,
  Gauge,
  AlertOctagon,
} from "lucide-react";

export interface ModuleDef {
  slug: string;
  path: string;
  label: string;
  icon: LucideIcon;
  description: string;
  status: "pronto" | "em-construcao";
}

export interface ModuleGroup {
  id: string;
  label: string;
  modules: ModuleDef[];
  recolhidoPorPadrao?: boolean;
}

export const moduleGroups: ModuleGroup[] = [
  {
    id: "visao-geral",
    label: "Visão geral",
    modules: [
      {
        slug: "dashboard",
        path: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        description: "Panorama de risco: pacientes por nível, avaliações pendentes, planos de ação em aberto.",
        status: "pronto",
      },
      {
        slug: "painel-executivo",
        path: "/painel-executivo",
        label: "Painel Executivo",
        icon: Gauge,
        description: "Índice de Risco Hospitalar, cobertura de avaliação, tendência semanal e ranking de unidades e tipos de risco.",
        status: "pronto",
      },
      {
        slug: "matriz-risco",
        path: "/matriz-risco",
        label: "Matriz de Risco",
        icon: Grid3x3,
        description: "Heatmap unidade × tipo de risco — onde estão os focos de risco alto/muito alto agora.",
        status: "pronto",
      },
    ],
  },
  {
    id: "assistencial",
    label: "Assistencial",
    modules: [
      {
        slug: "pacientes",
        path: "/pacientes",
        label: "Pacientes",
        icon: UserRound,
        description: "Pacientes internados (dados do inovare.fisio) com o risco avaliado em cada tipo.",
        status: "pronto",
      },
      {
        slug: "reavaliacoes",
        path: "/reavaliacoes",
        label: "Reavaliações",
        icon: ClipboardCheck,
        description: "Avaliações de risco com data de reavaliação vencida ou próxima de vencer.",
        status: "pronto",
      },
      {
        slug: "planos-acao",
        path: "/planos-acao",
        label: "Planos de Ação",
        icon: ListChecks,
        description: "Medidas preventivas com responsável e prazo, por paciente.",
        status: "pronto",
      },
      {
        slug: "eventos-sentinela",
        path: "/eventos-sentinela",
        label: "Eventos Sentinela",
        icon: AlertOctagon,
        description: "Notificação do que de fato aconteceu (queda, LPP...), cruzado com o risco previsto pela triagem.",
        status: "pronto",
      },
      {
        slug: "tipos-risco",
        path: "/tipos-risco",
        label: "Tipos de Risco",
        icon: ShieldAlert,
        description: "Configuração dos tipos de risco avaliados — campos, faixas de pontuação e medidas preventivas.",
        status: "pronto",
      },
    ],
  },
  {
    id: "administracao",
    label: "Administração",
    recolhidoPorPadrao: true,
    modules: [
      {
        slug: "usuarios",
        path: "/usuarios",
        label: "Usuários",
        icon: Users,
        description: "Quem tem acesso ao inovare.risco e com qual papel.",
        status: "pronto",
      },
      {
        slug: "configuracoes",
        path: "/configuracoes",
        label: "Configurações",
        icon: Settings,
        description: "Preferências da conta e da empresa no inovare.risco.",
        status: "pronto",
      },
    ],
  },
];

export const todosOsModulos: ModuleDef[] = moduleGroups.flatMap((g) => g.modules);
