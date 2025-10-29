export type Weekday =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export const WEEKDAY_LABELS_PT: Record<Weekday, string> = {
  sunday: "Domingo",
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
};

export type RosaryMystery = {
  id: string;
  title: string;
  meditation: string;
};

export type RosarySet = {
  id: "joyful" | "sorrowful" | "glorious" | "luminous";
  title: string;
  subtitle: string;
  weekdays: Weekday[];
  color: string;
  mysteries: RosaryMystery[];
};

export const ROSARY_SETS: RosarySet[] = [
  {
    id: "joyful",
    title: "Mistérios Gozosos",
    subtitle: "Contemple os momentos de alegria no início da vida de Jesus.",
    weekdays: ["monday", "saturday"],
    color: "#fbbf24",
    mysteries: [
      {
        id: "joyful-1",
        title: "A Anunciação do Anjo Gabriel a Maria",
        meditation: "Peçamos a graça de acolher a vontade de Deus com fé e humildade.",
      },
      {
        id: "joyful-2",
        title: "A Visitação de Maria a Santa Isabel",
        meditation: "Peçamos a graça de levar Cristo aos outros com alegria.",
      },
      {
        id: "joyful-3",
        title: "O Nascimento de Jesus em Belém",
        meditation: "Peçamos a graça de uma fé simples que reconhece Deus no cotidiano.",
      },
      {
        id: "joyful-4",
        title: "A Apresentação de Jesus no Templo",
        meditation: "Peçamos a graça da obediência confiante aos desígnios de Deus.",
      },
      {
        id: "joyful-5",
        title: "O Encontro de Jesus no Templo",
        meditation: "Peçamos a graça de buscar Jesus com perseverança e amor.",
      },
    ],
  },
  {
    id: "sorrowful",
    title: "Mistérios Dolorosos",
    subtitle: "Una-se ao sofrimento redentor de Cristo.",
    weekdays: ["tuesday", "friday"],
    color: "#ef4444",
    mysteries: [
      {
        id: "sorrowful-1",
        title: "A Agonia de Jesus no Horto das Oliveiras",
        meditation: "Peçamos a graça de confiar em Deus diante das provações.",
      },
      {
        id: "sorrowful-2",
        title: "A Flagelação de Jesus",
        meditation: "Peçamos a graça da fortaleza para suportar os sofrimentos.",
      },
      {
        id: "sorrowful-3",
        title: "A Coroação de Espinhos",
        meditation: "Peçamos a graça da humildade para aceitar as humilhações.",
      },
      {
        id: "sorrowful-4",
        title: "Jesus Carrega a Cruz",
        meditation: "Peçamos a graça de abraçar a cruz de cada dia com amor.",
      },
      {
        id: "sorrowful-5",
        title: "A Crucifixão e Morte de Jesus",
        meditation: "Peçamos a graça de permanecer fiéis até o fim.",
      },
    ],
  },
  {
    id: "glorious",
    title: "Mistérios Gloriosos",
    subtitle: "Celebre a vitória de Cristo e a glória de Maria.",
    weekdays: ["wednesday", "sunday"],
    color: "#22d3ee",
    mysteries: [
      {
        id: "glorious-1",
        title: "A Ressurreição de Jesus",
        meditation: "Peçamos a graça de viver a alegria da vida nova em Cristo.",
      },
      {
        id: "glorious-2",
        title: "A Ascensão de Jesus ao Céu",
        meditation: "Peçamos a graça de buscar as coisas do alto.",
      },
      {
        id: "glorious-3",
        title: "A Vinda do Espírito Santo",
        meditation: "Peçamos a graça de ser conduzidos pelo Espírito em nossa missão.",
      },
      {
        id: "glorious-4",
        title: "A Assunção de Maria",
        meditation: "Peçamos a graça da esperança na vida eterna.",
      },
      {
        id: "glorious-5",
        title: "A Coroação de Maria como Rainha do Céu",
        meditation: "Peçamos a graça de perseverar na santidade até o céu.",
      },
    ],
  },
  {
    id: "luminous",
    title: "Mistérios Luminosos",
    subtitle: "Contemple a vida pública de Jesus e a luz de sua missão.",
    weekdays: ["thursday"],
    color: "#a855f7",
    mysteries: [
      {
        id: "luminous-1",
        title: "O Batismo de Jesus no Rio Jordão",
        meditation: "Peçamos a graça de renovar as promessas do nosso batismo.",
      },
      {
        id: "luminous-2",
        title: "As Bodas de Caná",
        meditation: "Peçamos a graça de fazer tudo o que Jesus nos disser.",
      },
      {
        id: "luminous-3",
        title: "O Anúncio do Reino de Deus",
        meditation: "Peçamos a graça da conversão diária do coração.",
      },
      {
        id: "luminous-4",
        title: "A Transfiguração de Jesus",
        meditation: "Peçamos a graça de reconhecer a glória de Cristo.",
      },
      {
        id: "luminous-5",
        title: "A Instituição da Eucaristia",
        meditation: "Peçamos a graça de adorar Jesus presente na Eucaristia.",
      },
    ],
  },
];

const ENGLISH_WEEKDAY_TO_WEEKDAY: Record<string, Weekday> = {
  sunday: "sunday",
  monday: "monday",
  tuesday: "tuesday",
  wednesday: "wednesday",
  thursday: "thursday",
  friday: "friday",
  saturday: "saturday",
};

export function getWeekdayInSaoPaulo(date: Date = new Date()): Weekday {
  const formatter = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "America/Sao_Paulo",
  });
  const formatted = formatter.format(date).toLowerCase();
  const weekday = ENGLISH_WEEKDAY_TO_WEEKDAY[formatted];

  if (!weekday) {
    throw new Error(`Unexpected weekday string: ${formatted}`);
  }

  return weekday;
}

export function getRosaryForDate(date: Date = new Date()): RosarySet | undefined {
  const weekday = getWeekdayInSaoPaulo(date);
  return ROSARY_SETS.find((set) => set.weekdays.includes(weekday));
}

export function formatWeekdaysPt(weekdays: Weekday[]): string {
  return weekdays.map((weekday) => WEEKDAY_LABELS_PT[weekday]).join(", ");
}
