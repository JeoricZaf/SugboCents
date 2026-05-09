import { FormEvent, useMemo, useState } from "react";

type Page =
  | "dashboard"
  | "quests"
  | "leaderboard"
  | "profile"
  | "activity"
  | "goals"
  | "chat"
  | "more";

type ResourceSheet = "streak" | "sentimos" | "level" | null;

type Category = {
  label: string;
  icon: string;
};

type Expense = {
  id: number;
  category: string;
  icon: string;
  amount: number;
  note: string;
  time: string;
  dateGroup: string;
};

type Quest = {
  id: number;
  icon: string;
  title: string;
  description: string;
  progress: number;
  total: number;
  xp: number;
  reward: number;
  complete: boolean;
  claimed: boolean;
  locked?: boolean;
};

type Goal = {
  id: number;
  name: string;
  saved: number;
  target: number;
  deadline: string;
};

type ChatMessage = {
  id: number;
  sender: "user" | "tigom";
  text: string;
  time: string;
};

type Celebration = {
  title: string;
  subtitle: string;
  reward: string;
} | null;

const categories: Category[] = [
  { label: "Transport", icon: "🚌" },
  { label: "Food", icon: "🍔" },
  { label: "Groceries", icon: "🛒" },
  { label: "Education", icon: "📚" },
  { label: "Shopping", icon: "🛍️" },
  { label: "Health", icon: "💊" },
  { label: "Entertainment", icon: "🎮" },
  { label: "Utilities", icon: "💡" },
  { label: "Personal Care", icon: "💄" },
  { label: "Others", icon: "📦" },
];

const initialExpenses: Expense[] = [
  {
    id: 1,
    category: "Food",
    icon: "🍔",
    amount: 95,
    note: "Lunch near campus",
    time: "2h ago",
    dateGroup: "Today",
  },
  {
    id: 2,
    category: "Transport",
    icon: "🚌",
    amount: 42,
    note: "Jeepney and bus",
    time: "5h ago",
    dateGroup: "Today",
  },
  {
    id: 3,
    category: "Groceries",
    icon: "🛒",
    amount: 520,
    note: "Rice, eggs, canned tuna",
    time: "Yesterday",
    dateGroup: "Yesterday",
  },
  {
    id: 4,
    category: "Education",
    icon: "📚",
    amount: 180,
    note: "Printed handouts",
    time: "Yesterday",
    dateGroup: "Yesterday",
  },
  {
    id: 5,
    category: "Shopping",
    icon: "🛍️",
    amount: 240,
    note: "Rain jacket",
    time: "May 5",
    dateGroup: "May 5",
  },
  {
    id: 6,
    category: "Utilities",
    icon: "💡",
    amount: 140,
    note: "Shared Wi-Fi",
    time: "May 4",
    dateGroup: "May 4",
  },
  {
    id: 7,
    category: "Entertainment",
    icon: "🎮",
    amount: 85,
    note: "Game cafe with friends",
    time: "May 4",
    dateGroup: "May 4",
  },
];

const initialQuests: Quest[] = [
  {
    id: 1,
    icon: "⚡",
    title: "Logging Habit",
    description: "Log at least one expense every day this week.",
    progress: 5,
    total: 7,
    xp: 200,
    reward: 50,
    complete: false,
    claimed: false,
  },
  {
    id: 2,
    icon: "🎯",
    title: "Budget Warrior",
    description: "Stay under your daily budget for 4 more days.",
    progress: 4,
    total: 7,
    xp: 175,
    reward: 50,
    complete: false,
    claimed: false,
  },
  {
    id: 3,
    icon: "🛡️",
    title: "Category Explorer",
    description: "Log expenses in 5 different categories.",
    progress: 5,
    total: 5,
    xp: 100,
    reward: 25,
    complete: true,
    claimed: false,
  },
];

const lockedQuests: Quest[] = [
  {
    id: 10,
    icon: "🕐",
    title: "Early Bird",
    description: "Log your first expense before noon, 3 days in a row.",
    progress: 0,
    total: 3,
    xp: 125,
    reward: 30,
    complete: false,
    claimed: false,
    locked: true,
  },
  {
    id: 11,
    icon: "🎯",
    title: "Frugal Run",
    description: "Spend 50% or less of your weekly budget.",
    progress: 0,
    total: 1,
    xp: 175,
    reward: 50,
    complete: false,
    claimed: false,
    locked: true,
  },
];

const initialGoals: Goal[] = [
  {
    id: 1,
    name: "Trip to Palawan",
    saved: 3200,
    target: 15000,
    deadline: "December 2026",
  },
  {
    id: 2,
    name: "New Laptop",
    saved: 18500,
    target: 30000,
    deadline: "August 2026",
  },
  {
    id: 3,
    name: "Emergency Fund",
    saved: 5000,
    target: 5000,
    deadline: "Complete",
  },
];

const activityEvents = [
  {
    icon: "🔥",
    title: "You hit an 8-day streak!",
    detail: "Tigom is cheering. Keep the thread alive tonight.",
    time: "Today, 8:04 PM",
    featured: true,
  },
  {
    icon: "🏅",
    title: "Badge unlocked: Budget Regular",
    detail: "You logged expenses 5 days this week.",
    time: "Yesterday",
    featured: false,
  },
  {
    icon: "⚡",
    title: "You reached Level 4 — Budget Keeper",
    detail: "+100 XP pushed you into a new tier.",
    time: "May 5",
    featured: true,
  },
  {
    icon: "✅",
    title: "Quest complete: Category Explorer",
    detail: "+₵25 is ready to claim.",
    time: "May 5",
    featured: false,
  },
  {
    icon: "💸",
    title: "You logged 5 expenses today",
    detail: "+25 XP reached the daily logging cap.",
    time: "May 4",
    featured: false,
  },
];

const weekNodes = [
  { day: "Mon", state: "done" },
  { day: "Tue", state: "done" },
  { day: "Wed", state: "done" },
  { day: "Thu", state: "today" },
  { day: "Fri", state: "future" },
  { day: "Sat", state: "future" },
  { day: "Sun", state: "chest" },
];

const leaderboardRows = [
  { rank: 1, name: "Maria", streak: 21, league: "emerald", current: false },
  { rank: 2, name: "Carlo", streak: 18, league: "gold", current: false },
  { rank: 3, name: "Ana", streak: 16, league: "silver", current: false },
  { rank: 4, name: "You", streak: 8, league: "silver", current: true },
  { rank: 5, name: "Jules", streak: 7, league: "bronze", current: false },
  { rank: 6, name: "Nico", streak: 4, league: "bronze", current: false },
];

const suggestedPrompts = [
  "How's my budget looking this week?",
  "What's my biggest spending category?",
  "Give me a tip to save more.",
  "How close am I to my savings goal?",
  "What quests should I focus on?",
];

const mobileNav = [
  { page: "dashboard" as Page, label: "Home", icon: "⌂" },
  { page: "quests" as Page, label: "Quests", icon: "◇" },
  { page: "leaderboard" as Page, label: "League", icon: "♛" },
  { page: "profile" as Page, label: "Profile", icon: "◉" },
  { page: "more" as Page, label: "More", icon: "☰" },
];

const desktopNav = [
  ...mobileNav.slice(0, 4),
  { page: "activity" as Page, label: "Activity", icon: "≋" },
  { page: "goals" as Page, label: "Goals", icon: "◎" },
  { page: "chat" as Page, label: "AI Chat", icon: "✦" },
  { page: "more" as Page, label: "Settings", icon: "☰" },
];

function formatPeso(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getBudgetMood(percent: number) {
  if (percent >= 90) return "alarmed";
  if (percent >= 65) return "worried";
  if (percent >= 30) return "neutral";
  return "happy";
}

function moodMessage(mood: string) {
  if (mood === "alarmed") return "Almost at the limit. Tiny spends muna, kaya pa.";
  if (mood === "worried") return "Budget is getting tight. Tigom says check before you tap.";
  if (mood === "neutral") return "Steady lang. You still have room to move this week.";
  return "Fresh week energy. You're giving future-you a favor.";
}

function pageTitle(page: Page) {
  const titles: Record<Page, string> = {
    dashboard: "Dashboard",
    quests: "Quests",
    leaderboard: "Leaderboard",
    profile: "Profile",
    activity: "Activity",
    goals: "Goals",
    chat: "AI Chat",
    more: "More",
  };
  return titles[page];
}

function ResourceChip({
  label,
  value,
  sublabel,
  tone,
  activePulse,
  onClick,
}: {
  label: string;
  value: string;
  sublabel: string;
  tone: "streak" | "sentimos" | "level";
  activePulse?: boolean;
  onClick: () => void;
}) {
  const toneClasses = {
    streak: "border-[#F97316]/30 bg-[#fff7ed] text-[#9a3412]",
    sentimos: "border-[#0D9488]/25 bg-[#f0fdfa] text-[#0f766e]",
    level: "border-[#EAB308]/30 bg-[#fefce8] text-[#854d0e]",
  };

  return (
    <button
      onClick={onClick}
      className={`group min-w-0 rounded-2xl border px-3 py-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${toneClasses[tone]} ${
        activePulse ? "animate-risk" : ""
      }`}
      type="button"
    >
      <span className="block text-[0.62rem] font-bold uppercase tracking-[0.18em] opacity-70">
        {label}
      </span>
      <span className="mt-0.5 block truncate font-display text-xl font-extrabold leading-none sm:text-2xl">
        {value}
      </span>
      <span className="mt-1 block truncate text-[0.68rem] font-semibold opacity-75">
        {sublabel}
      </span>
    </button>
  );
}

function ResourceBar({
  streak,
  sentimos,
  level,
  atRisk,
  onOpenSheet,
}: {
  streak: number;
  sentimos: number;
  level: number;
  atRisk: boolean;
  onOpenSheet: (sheet: ResourceSheet) => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#d8d1bd]/70 bg-[#f7f3e8]/88 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <div className="hidden min-w-[9rem] lg:block">
          <p className="font-display text-lg font-extrabold tracking-tight text-[#164f33]">
            SugboCents
          </p>
          <p className="text-xs font-semibold text-[#5f6f63]">Habit finance game</p>
        </div>
        <div className="grid flex-1 grid-cols-3 gap-2 sm:gap-3">
          <ResourceChip
            label="Streak"
            value={`🔥 ${streak}`}
            sublabel={atRisk ? "Log before midnight" : "days alive"}
            tone="streak"
            activePulse={atRisk}
            onClick={() => onOpenSheet("streak")}
          />
          <ResourceChip
            label="Sentimos"
            value={`₵ ${sentimos}`}
            sublabel="shop balance"
            tone="sentimos"
            onClick={() => onOpenSheet("sentimos")}
          />
          <ResourceChip
            label="Level"
            value={`Lv. ${level}`}
            sublabel="Budget Keeper"
            tone="level"
            onClick={() => onOpenSheet("level")}
          />
        </div>
      </div>
    </header>
  );
}

function TigomFace({ mood = "happy", size = "md" }: { mood?: string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-12 w-12",
    md: "h-16 w-16",
    lg: "h-24 w-24",
  };
  const eyeShape = mood === "alarmed" ? "h-3 w-3" : "h-2.5 w-2.5";

  return (
    <div className={`relative ${sizeClasses[size]} shrink-0 animate-float`} aria-label={`Tigom is ${mood}`}>
      <div className="absolute left-2 top-0 h-5 w-5 rounded-full bg-[#2b8259]" />
      <div className="absolute right-2 top-0 h-5 w-5 rounded-full bg-[#2b8259]" />
      <div className="absolute inset-1 rounded-[38%_38%_44%_44%] bg-[#2b8259] shadow-[inset_0_-10px_0_rgba(22,79,51,0.26)]" />
      <div className="absolute left-[27%] top-[36%] h-3 w-3 rounded-full bg-white/80" />
      <div className="absolute right-[27%] top-[36%] h-3 w-3 rounded-full bg-white/80" />
      <div className={`absolute left-[31%] top-[39%] rounded-full bg-[#102b1d] ${eyeShape}`} />
      <div className={`absolute right-[31%] top-[39%] rounded-full bg-[#102b1d] ${eyeShape}`} />
      {mood === "alarmed" ? (
        <div className="absolute bottom-[22%] left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-[#102b1d]" />
      ) : mood === "worried" ? (
        <div className="absolute bottom-[22%] left-1/2 h-4 w-8 -translate-x-1/2 rounded-t-full border-t-4 border-[#102b1d]" />
      ) : mood === "neutral" ? (
        <div className="absolute bottom-[27%] left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-[#102b1d]" />
      ) : (
        <div className="absolute bottom-[26%] left-1/2 h-4 w-8 -translate-x-1/2 rounded-b-full border-b-4 border-[#102b1d]" />
      )}
      <div className="absolute -bottom-1 left-1/2 flex h-6 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-[#f7f3e8] text-xs font-black text-[#164f33]">
        ₱
      </div>
    </div>
  );
}

function SectionHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#6b756c]">{eyebrow}</p>
        ) : null}
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-[#102b1d]">{title}</h2>
      </div>
      {action ? <button className="text-sm font-extrabold text-[#164f33]" type="button">{action}</button> : null}
    </div>
  );
}

function ProgressBar({
  value,
  label,
  tone = "green",
  tall,
}: {
  value: number;
  label?: string;
  tone?: "green" | "gold" | "danger";
  tall?: boolean;
}) {
  const fillClass = {
    green: "bg-[#2b8259]",
    gold: "bg-[#EAB308]",
    danger: "bg-[#b91c1c]",
  };

  return (
    <div className={`relative overflow-hidden rounded-full bg-[#e7e0cf] ${tall ? "h-5" : "h-3"}`}>
      <div
        className={`h-full rounded-full transition-all duration-700 ${fillClass[tone]}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
      {label ? (
        <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-[#102b1d]">
          {label}
        </span>
      ) : null}
    </div>
  );
}

function WeekMap({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "flex items-center gap-2" : "rounded-[2rem] bg-white/72 p-4 shadow-sm ring-1 ring-[#ded7c6]"}>
      {!compact ? <SectionHeader eyebrow="Streak path" title="This week's map" /> : null}
      <div className={`relative grid grid-cols-7 ${compact ? "gap-1" : "gap-2"}`}>
        {!compact ? <div className="absolute left-[7%] right-[7%] top-5 h-1 rounded-full bg-[#ded7c6]" /> : null}
        {weekNodes.map((node) => {
          const isDone = node.state === "done";
          const isToday = node.state === "today";
          const isChest = node.state === "chest";
          return (
            <div key={node.day} className="relative z-10 flex flex-col items-center gap-2">
              <div
                className={`flex items-center justify-center rounded-full font-black shadow-sm ${
                  compact ? "h-7 w-7 text-xs" : "h-11 w-11 text-sm"
                } ${
                  isDone
                    ? "bg-[#2b8259] text-white"
                    : isToday
                      ? "animate-nodePulse bg-[#F97316] text-white"
                      : isChest
                        ? "border-2 border-[#164f33] bg-[#f6f0d9] text-[#164f33]"
                        : "bg-[#d8d1bd] text-[#7b776c]"
                }`}
              >
                {isDone ? "✓" : isChest ? "▣" : isToday ? "!" : ""}
              </div>
              {!compact ? <span className="text-xs font-bold text-[#6f756f]">{node.day}</span> : null}
            </div>
          );
        })}
      </div>
      {!compact ? (
        <p className="mt-4 text-sm font-semibold text-[#5f6f63]">
          Thursday is waiting. One quick log keeps your 8-day streak safe.
        </p>
      ) : null}
    </div>
  );
}

function DashboardPage({
  spent,
  budget,
  remaining,
  budgetPercent,
  mood,
  expenses,
  quests,
  onOpenCategory,
  onNavigate,
}: {
  spent: number;
  budget: number;
  remaining: number;
  budgetPercent: number;
  mood: string;
  expenses: Expense[];
  quests: Quest[];
  onOpenCategory: (category: Category) => void;
  onNavigate: (page: Page) => void;
}) {
  const budgetTone = budgetPercent >= 90 ? "danger" : budgetPercent >= 65 ? "danger" : "green";
  const activeQuest = quests[0];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-5 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#164f33] px-5 py-6 text-white shadow-xl shadow-[#164f33]/15 sm:px-8 sm:py-8">
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-[#2b8259]/40" />
        <div className="relative flex items-center justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/70">Good evening, Maria</p>
            <h1 className="mt-2 font-display text-4xl font-black tracking-tight sm:text-6xl">SugboCents</h1>
            <p className="mt-3 max-w-xl text-base font-medium text-white/78 sm:text-lg">
              Your streak is alive, your budget has a story, and Tigom is watching the small wins.
            </p>
          </div>
          <div className="hidden sm:block">
            <TigomFace mood={mood} size="lg" />
          </div>
        </div>
        <div className="relative mt-7 grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">Streak</p>
            <p className="font-display text-4xl font-black text-[#F97316]">8</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">Sentimos</p>
            <p className="font-display text-4xl font-black text-[#5eead4]">₵420</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">Level</p>
            <p className="font-display text-4xl font-black text-[#EAB308]">4</p>
            <ProgressBar value={72} tone="gold" />
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-[#ded7c6] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#6b756c]">Weekly budget</p>
              <h2 className="mt-1 font-display text-3xl font-black tracking-tight text-[#102b1d]">
                {formatPeso(remaining)} left
              </h2>
              <p className="mt-1 text-sm font-semibold text-[#617063]">
                {formatPeso(spent)} spent of {formatPeso(budget)}
              </p>
            </div>
            <div
              className="grid h-24 w-24 place-items-center rounded-full p-2"
              style={{ background: `conic-gradient(${budgetPercent >= 65 ? "#b91c1c" : "#2b8259"} ${budgetPercent * 3.6}deg, #e7e0cf 0deg)` }}
            >
              <div className="grid h-full w-full place-items-center rounded-full bg-white text-center">
                <span className="font-display text-2xl font-black text-[#102b1d]">{Math.round(budgetPercent)}%</span>
                <span className="-mt-2 text-[0.62rem] font-bold uppercase text-[#69746b]">used</span>
              </div>
            </div>
          </div>
          <div className="mt-5">
            <ProgressBar value={budgetPercent} tone={budgetTone} />
            <p className="mt-3 text-sm font-semibold text-[#5f6f63]">{moodMessage(mood)}</p>
          </div>
        </section>

        <section className="rounded-[2rem] bg-[#edf7ef] p-5 shadow-sm ring-1 ring-[#cfe2d3] sm:p-6">
          <div className="flex items-center gap-4">
            <TigomFace mood={mood} size="md" />
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#5b7160]">Tigom says</p>
              <h2 className="font-display text-2xl font-black text-[#102b1d]">{mood === "worried" ? "Careful lang" : "Nice pace"}</h2>
              <p className="mt-1 text-sm font-semibold text-[#526b57]">{moodMessage(mood)}</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate("chat")}
            className="mt-5 w-full rounded-2xl bg-[#164f33] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#1d6843]"
            type="button"
          >
            Ask Tigom for a budget read
          </button>
        </section>
      </div>

      <section>
        <SectionHeader eyebrow="Quick add" title="Log in one tap" />
        <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0 lg:grid-cols-10">
          {categories.map((category) => (
            <button
              key={category.label}
              onClick={() => onOpenCategory(category)}
              className="min-w-[7rem] rounded-3xl bg-white px-4 py-4 text-left shadow-sm ring-1 ring-[#ded7c6] transition hover:-translate-y-1 hover:shadow-md sm:min-w-0"
              type="button"
            >
              <span className="block text-2xl">{category.icon}</span>
              <span className="mt-3 block text-sm font-extrabold text-[#102b1d]">{category.label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <WeekMap />

        <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-[#ded7c6] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#6b756c]">Active quest</p>
              <h2 className="mt-1 font-display text-2xl font-black text-[#102b1d]">{activeQuest.title}</h2>
              <p className="mt-1 text-sm font-semibold text-[#617063]">{activeQuest.description}</p>
            </div>
            <div className="rounded-full bg-[#f0fdfa] px-3 py-1 text-sm font-black text-[#0f766e] ring-1 ring-[#0D9488]/25">
              ₵{activeQuest.reward}
            </div>
          </div>
          <div className="mt-5">
            <ProgressBar
              value={(activeQuest.progress / activeQuest.total) * 100}
              label={`${activeQuest.progress} / ${activeQuest.total} days`}
              tone="gold"
              tall
            />
          </div>
          <button
            onClick={() => onNavigate("quests")}
            className="mt-5 text-sm font-extrabold text-[#164f33]"
            type="button"
          >
            See weekly quests →
          </button>
        </section>
      </div>

      <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-[#ded7c6] sm:p-6">
        <SectionHeader eyebrow="Activity" title="Recent expenses" action="View all" />
        <div className="divide-y divide-[#ece6d8]">
          {expenses.slice(0, 5).map((expense) => (
            <div key={expense.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f4f0e5] text-xl">{expense.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-[#102b1d]">{expense.category}</p>
                <p className="truncate text-xs font-semibold text-[#6c756e]">{expense.note || "No note"} · {expense.time}</p>
              </div>
              <p className="font-display text-lg font-black text-[#102b1d]">{formatPeso(expense.amount)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function QuestCard({ quest, onClaim }: { quest: Quest; onClaim?: (quest: Quest) => void }) {
  const progress = (quest.progress / quest.total) * 100;
  const progressTone = quest.complete ? "green" : "gold";

  return (
    <div className={`relative rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-[#ded7c6] ${quest.locked ? "opacity-40 blur-[0.4px]" : ""}`}>
      <div className="grid grid-cols-[3rem_1fr_auto] items-center gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#edf7ef] text-2xl ring-1 ring-[#cfe2d3]">
          {quest.icon}
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg font-black text-[#102b1d]">{quest.title}</h3>
          <p className="mt-1 text-sm font-semibold text-[#617063]">{quest.description}</p>
        </div>
        <div className="rounded-full bg-[#f0fdfa] px-3 py-2 text-sm font-black text-[#0f766e] ring-1 ring-[#0D9488]/25">
          {quest.claimed ? "✓ Claimed" : `₵${quest.reward}`}
        </div>
      </div>
      <div className="mt-5">
        <ProgressBar value={progress} label={`${quest.progress} / ${quest.total} ${quest.total === 1 ? "goal" : "days"}`} tone={progressTone} tall />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b756c]">+{quest.xp} XP</p>
        {quest.complete && !quest.claimed && onClaim ? (
          <button
            onClick={() => onClaim(quest)}
            className="animate-glow rounded-full bg-[#0D9488] px-5 py-2 text-sm font-black text-white shadow-lg shadow-[#0D9488]/20"
            type="button"
          >
            Claim
          </button>
        ) : null}
      </div>
      {quest.locked ? (
        <div className="absolute inset-0 grid place-items-center rounded-[2rem] bg-[#f7f3e8]/40">
          <div className="rounded-full bg-[#102b1d] px-4 py-2 text-sm font-black text-white">Locked</div>
        </div>
      ) : null}
    </div>
  );
}

function QuestsPage({ quests, onClaim }: { quests: Quest[]; onClaim: (quest: Quest) => void }) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-5 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#164f33] via-[#1f6f47] to-[#2b8259] p-6 text-white shadow-xl shadow-[#164f33]/15 sm:p-8">
        <div className="absolute -right-12 top-6 h-28 w-28 rounded-full bg-white/10" />
        <div className="absolute bottom-4 left-8 h-3 w-3 rounded-full bg-white/50" />
        <div className="relative flex items-center justify-between gap-5">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-white/70">This week's quest</p>
            <h1 className="mt-2 font-display text-4xl font-black tracking-tight sm:text-5xl">Earn XP + ₵</h1>
            <p className="mt-3 max-w-xl text-base font-semibold text-white/80">
              Complete warm-up habits, claim Sentimos, and keep next Monday from feeling like a reset.
            </p>
          </div>
          <div className="relative hidden sm:block">
            <TigomFace mood="happy" size="lg" />
            <div className="absolute -right-4 bottom-0 rounded-2xl bg-[#f0fdfa] px-3 py-2 font-display text-xl font-black text-[#0f766e] shadow-lg">
              ₵
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between rounded-full bg-white px-4 py-3 shadow-sm ring-1 ring-[#ded7c6]">
        <span className="text-sm font-extrabold text-[#102b1d]">Weekly reset</span>
        <span className="rounded-full bg-[#edf7ef] px-3 py-1 text-sm font-black text-[#164f33]">Resets in 3 days</span>
      </div>

      <section className="space-y-4">
        <SectionHeader eyebrow="Active" title="Quest cards" />
        {quests.map((quest) => (
          <QuestCard key={quest.id} quest={quest} onClaim={onClaim} />
        ))}
      </section>

      <section>
        <SectionHeader eyebrow="Coming next" title="More quests unlock soon" />
        <div className="grid gap-4 md:grid-cols-2">
          {lockedQuests.map((quest) => (
            <QuestCard key={quest.id} quest={quest} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Shield({ title, tone, size = "md", faded = false }: { title: string; tone: string; size?: "sm" | "md" | "lg"; faded?: boolean }) {
  const sizeClasses = {
    sm: "h-16 w-14 text-xs",
    md: "h-24 w-20 text-sm",
    lg: "h-32 w-28 text-base",
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${faded ? "opacity-45" : ""}`}>
      <div
        className={`${sizeClasses[size]} grid place-items-center px-2 text-center font-display font-black text-white shadow-lg ${tone}`}
        style={{ clipPath: "polygon(50% 0, 100% 18%, 86% 100%, 50% 84%, 14% 100%, 0 18%)" }}
      >
        {title.split(" ")[0]}
      </div>
      <p className="max-w-24 text-center text-xs font-extrabold text-[#102b1d]">{title}</p>
    </div>
  );
}

function LeaderboardPage() {
  const leagueTone: Record<string, string> = {
    bronze: "bg-[#9a6b45]",
    silver: "bg-[#84919a]",
    gold: "bg-[#EAB308]",
    emerald: "bg-[#2b8259]",
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-5 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-[#ded7c6] sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#6b756c]">League ladder</p>
            <h1 className="mt-1 font-display text-4xl font-black text-[#102b1d]">Budget Keeper</h1>
            <p className="mt-2 text-sm font-semibold text-[#617063]">Friends compete by consistency, not pesos spent.</p>
          </div>
          <span className="rounded-full bg-[#edf7ef] px-3 py-2 text-sm font-black text-[#164f33]">Resets in 3 days</span>
        </div>
        <div className="mt-7 flex items-end justify-center gap-4 sm:gap-8">
          <Shield title="Rookie Saver" tone="bg-[#9a6b45]" size="sm" faded />
          <Shield title="Budget Keeper" tone="bg-[#84919a]" size="lg" />
          <Shield title="Spending Scout" tone="bg-[#EAB308]" size="md" faded />
          <Shield title="Frugal Fighter" tone="bg-[#2b8259]" size="sm" faded />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.82fr]">
        <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-[#ded7c6] sm:p-6">
          <SectionHeader eyebrow="Friends" title="Weekly rankings" />
          <div className="space-y-3">
            {leaderboardRows.map((row) => (
              <div
                key={row.rank}
                className={`flex items-center gap-4 rounded-3xl px-3 py-3 ${row.current ? "bg-[#edf7ef] ring-2 ring-[#2b8259]/30" : "bg-[#faf8f1]"}`}
              >
                <div className="w-7 text-center font-display text-xl font-black text-[#102b1d]">{row.rank}</div>
                <div className={`grid h-12 w-12 place-items-center rounded-full text-sm font-black text-white ${leagueTone[row.league]}`}>
                  {row.name === "You" ? "Y" : row.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-[#102b1d]">{row.name}</p>
                  <p className="text-xs font-semibold text-[#6a746c]">{row.current ? "Your public rank" : "Friend"}</p>
                </div>
                {row.current ? <span className="text-[#164f33]">◀</span> : null}
                <div className="rounded-full bg-[#fff7ed] px-3 py-1 text-sm font-black text-[#9a3412] ring-1 ring-[#F97316]/30">
                  🔥 {row.streak}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-[#ded7c6] sm:p-6">
            <SectionHeader eyebrow="Live feed" title="Friends are moving" />
            <div className="space-y-4">
              {["Maria logged 3 expenses · 2h ago", "Carlo hit a 14-day streak! 🔥 · 4h ago", "Ana completed Budget Warrior · Yesterday"].map((item) => (
                <div key={item} className="rounded-3xl bg-[#faf8f1] px-4 py-3 text-sm font-bold text-[#334438]">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[2rem] bg-[#164f33] p-5 text-white shadow-lg shadow-[#164f33]/15 sm:p-6">
            <h2 className="font-display text-2xl font-black">Leaderboard needs barkada energy</h2>
            <p className="mt-2 text-sm font-semibold text-white/75">Add at least 5 friends to make the weekly race feel alive.</p>
            <button className="mt-5 rounded-full bg-white px-5 py-3 text-sm font-black text-[#164f33]" type="button">
              + Add Friends
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: string; tone: "streak" | "xp" | "green" | "neutral" }) {
  const toneClass = {
    streak: "text-[#F97316]",
    xp: "text-[#EAB308]",
    green: "text-[#164f33]",
    neutral: "text-[#102b1d]",
  };

  return (
    <div className="rounded-[1.7rem] bg-white p-4 shadow-sm ring-1 ring-[#ded7c6]">
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b756c]">{label}</p>
      <p className={`mt-2 font-display text-3xl font-black ${toneClass[tone]}`}>{value}</p>
    </div>
  );
}

function ProfilePage({ sentimos }: { sentimos: number }) {
  const badges = [
    { name: "Budget Regular", status: "earned" },
    { name: "Perfect Week", status: "earned" },
    { name: "Quest Closer", status: "earned" },
    { name: "Savings Seed", status: "locked" },
    { name: "Legend Run", status: "locked" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-5 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-[#ded7c6] sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-[#84919a] font-display text-3xl font-black text-white">
                M
              </div>
              <div className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full bg-[#EAB308] text-xs font-black text-white ring-4 ring-white">
                Lv4
              </div>
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#6b756c]">Own profile</p>
              <h1 className="font-display text-4xl font-black text-[#102b1d]">Maria Santos</h1>
              <p className="mt-1 text-sm font-bold text-[#617063]">Budget Keeper · Level 4</p>
              <p className="text-sm font-semibold text-[#7a817a]">Saving since February 2026</p>
            </div>
          </div>
          <div className="rounded-3xl bg-[#f0fdfa] px-5 py-4 text-[#0f766e] ring-1 ring-[#0D9488]/25">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em]">Sentimos</p>
            <p className="font-display text-3xl font-black">₵{sentimos}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Current streak" value="8" tone="streak" />
        <StatTile label="Total XP" value="3,840" tone="xp" />
        <StatTile label="Badges" value="12" tone="green" />
        <StatTile label="Quests" value="19" tone="neutral" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.86fr]">
        <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-[#ded7c6] sm:p-6">
          <SectionHeader eyebrow="Badge shelf" title="Recent trophies" action="View all →" />
          <div className="flex gap-3 overflow-x-auto pb-1">
            {badges.map((badge) => (
              <div
                key={badge.name}
                className={`relative grid min-h-28 min-w-28 place-items-center rounded-[1.7rem] bg-[#f8f5eb] p-3 text-center ring-1 ring-[#ded7c6] ${
                  badge.status === "locked" ? "opacity-40 grayscale" : ""
                }`}
              >
                <div className="grid h-12 w-12 place-items-center rounded-full bg-[#edf7ef] text-lg font-black text-[#164f33]">🏅</div>
                <p className="text-xs font-extrabold text-[#102b1d]">{badge.name}</p>
                {badge.status === "locked" ? <div className="absolute inset-0 grid place-items-center text-xl">🔒</div> : null}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-[#ded7c6] sm:p-6">
          <SectionHeader eyebrow="This week" title="Activity mini-map" />
          <WeekMap compact />
          <p className="mt-4 text-sm font-semibold text-[#617063]">Logged 4 of 7 days so far. Thursday is the next save point.</p>
        </section>
      </div>

      <section>
        <SectionHeader eyebrow="Personal records" title="Money memories" />
        <div className="scrollbar-none -mx-4 flex gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {[
            ["Longest Streak", "30 days", "Apr 30, 2026"],
            ["Best Week XP", "640 XP", "Week of May 4"],
            ["Best Month Saved", "₱4,800", "March 2026"],
          ].map(([label, value, date]) => (
            <div key={label} className="min-w-[15rem] rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-[#ded7c6]">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b756c]">{label}</p>
              <p className="mt-2 font-display text-3xl font-black text-[#102b1d]">{value}</p>
              <p className="mt-2 text-sm font-bold text-[#617063]">{date}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-[#ded7c6] sm:p-6">
        <SectionHeader eyebrow="Friends" title="Barkada list" />
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {["C", "A", "J", "N", "L"].map((initial) => (
            <div key={initial} className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#2b8259] font-display text-lg font-black text-white">
              {initial}
            </div>
          ))}
          <button className="h-14 shrink-0 rounded-full border-2 border-dashed border-[#b7ad96] px-5 text-sm font-black text-[#164f33]" type="button">
            + Find Friends
          </button>
        </div>
      </section>
    </div>
  );
}

function ActivityPage({ expenses, budget, spent }: { expenses: Expense[]; budget: number; spent: number }) {
  const [tab, setTab] = useState<"expenses" | "activity">("expenses");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const filteredExpenses = expenses.filter((expense) => {
    const matchesFilter = filter === "All" || expense.category === filter;
    const matchesQuery = `${expense.category} ${expense.note}`.toLowerCase().includes(query.toLowerCase());
    return matchesFilter && matchesQuery;
  });
  const groupedExpenses = filteredExpenses.reduce<Record<string, Expense[]>>((groups, expense) => {
    groups[expense.dateGroup] = [...(groups[expense.dateGroup] || []), expense];
    return groups;
  }, {});

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-5 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] bg-[#164f33] p-5 text-white shadow-lg shadow-[#164f33]/15 sm:p-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/65">Weekly summary</p>
        <h1 className="mt-1 font-display text-3xl font-black">{formatPeso(spent)} of {formatPeso(budget)}</h1>
        <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="font-display text-2xl font-black">{expenses.length}</p>
            <p className="font-bold text-white/65">logs</p>
          </div>
          <div>
            <p className="font-display text-2xl font-black text-[#EAB308]">265</p>
            <p className="font-bold text-white/65">XP week</p>
          </div>
          <div>
            <p className="font-display text-2xl font-black text-[#F97316]">8</p>
            <p className="font-bold text-white/65">streak</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 rounded-full bg-[#e7e0cf] p-1">
        <button
          onClick={() => setTab("expenses")}
          className={`rounded-full px-4 py-3 text-sm font-black transition ${tab === "expenses" ? "bg-white text-[#102b1d] shadow-sm" : "text-[#657064]"}`}
          type="button"
        >
          Expenses
        </button>
        <button
          onClick={() => setTab("activity")}
          className={`rounded-full px-4 py-3 text-sm font-black transition ${tab === "activity" ? "bg-white text-[#102b1d] shadow-sm" : "text-[#657064]"}`}
          type="button"
        >
          Activity
        </button>
      </div>

      {tab === "expenses" ? (
        <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-[#ded7c6] sm:p-6">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by note or category"
              className="rounded-2xl border border-[#d8d1bd] bg-[#faf8f1] px-4 py-3 text-sm font-semibold outline-none focus:border-[#164f33]"
            />
            <div className="scrollbar-none flex gap-2 overflow-x-auto">
              {["All", "Food", "Transport", "Groceries", "Education"].map((chip) => (
                <button
                  key={chip}
                  onClick={() => setFilter(chip)}
                  className={`shrink-0 rounded-full px-4 py-3 text-sm font-black ${filter === chip ? "bg-[#164f33] text-white" : "bg-[#f4f0e5] text-[#526257]"}`}
                  type="button"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-6 space-y-6">
            {Object.entries(groupedExpenses).map(([date, items]) => (
              <div key={date}>
                <h2 className="mb-2 text-sm font-black text-[#102b1d]">{date}</h2>
                <div className="divide-y divide-[#ece6d8]">
                  {items.map((expense) => (
                    <div key={expense.id} className="flex items-center gap-4 py-3">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f4f0e5] text-xl">{expense.icon}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-extrabold text-[#102b1d]">{expense.category}</p>
                        <p className="truncate text-xs font-semibold text-[#6c756e]">{expense.note} · {expense.time}</p>
                      </div>
                      <p className="font-display text-lg font-black text-[#102b1d]">{formatPeso(expense.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          {activityEvents.map((event) => (
            <div key={event.title} className={`rounded-[2rem] p-5 shadow-sm ring-1 ring-[#ded7c6] ${event.featured ? "bg-[#edf7ef]" : "bg-white"}`}>
              <div className="flex gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-2xl shadow-sm">{event.icon}</div>
                <div>
                  <h3 className="font-display text-lg font-black text-[#102b1d]">{event.title}</h3>
                  <p className="mt-1 text-sm font-semibold text-[#617063]">{event.detail}</p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-[#7b837b]">{event.time}</p>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function GoalsPage({ goals, onDeposit, onOpenAddGoal }: { goals: Goal[]; onDeposit: (goalId: number) => void; onOpenAddGoal: () => void }) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-5 sm:px-6 lg:px-8">
      <section>
        <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[#6b756c]">Savings</p>
        <div className="mt-1 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-black text-[#102b1d]">Goals</h1>
            <p className="mt-2 text-sm font-semibold text-[#617063]">Separate from your weekly budget. This is future-you money.</p>
          </div>
          <button onClick={onOpenAddGoal} className="hidden rounded-full bg-[#164f33] px-5 py-3 text-sm font-black text-white sm:block" type="button">
            + New Goal
          </button>
        </div>
      </section>

      {goals.length === 0 ? (
        <section className="grid min-h-72 place-items-center rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-[#ded7c6]">
          <div>
            <TigomFace mood="happy" size="lg" />
            <h2 className="mt-4 font-display text-3xl font-black text-[#102b1d]">What are you saving for?</h2>
            <p className="mt-2 text-sm font-semibold text-[#617063]">Create your first goal and make every deposit feel visible.</p>
            <button onClick={onOpenAddGoal} className="mt-5 rounded-full bg-[#164f33] px-5 py-3 text-sm font-black text-white" type="button">
              Create a goal
            </button>
          </div>
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-3">
          {goals.map((goal) => {
            const progress = (goal.saved / goal.target) * 100;
            const done = progress >= 100;
            return (
              <div key={goal.id} className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-[#ded7c6]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-2xl font-black text-[#102b1d]">{goal.name}</h2>
                    <p className="mt-1 text-sm font-bold text-[#617063]">{formatPeso(goal.saved)} / {formatPeso(goal.target)}</p>
                  </div>
                  {done ? <span className="rounded-full bg-[#edf7ef] px-3 py-1 text-xs font-black text-[#164f33]">✓ Done</span> : null}
                </div>
                <div className="mt-5">
                  <ProgressBar value={progress} tone="green" />
                  <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b756c]">Target: {goal.deadline}</p>
                </div>
                <button
                  onClick={() => onDeposit(goal.id)}
                  className="mt-5 w-full rounded-2xl bg-[#164f33] px-4 py-3 text-sm font-black text-white disabled:bg-[#9a9f98]"
                  type="button"
                  disabled={done}
                >
                  Add ₱500
                </button>
              </div>
            );
          })}
        </section>
      )}

      <section className="rounded-[2rem] bg-[#f8f5eb] p-5 ring-1 ring-[#ded7c6] sm:p-6">
        <SectionHeader eyebrow="Savings badges" title="Unlock by depositing" />
        <div className="grid gap-3 sm:grid-cols-3">
          {["Saver Seed", "Palawan Planner", "Emergency Ready"].map((badge, index) => (
            <div key={badge} className={`rounded-3xl bg-white p-4 text-center ring-1 ring-[#ded7c6] ${index > 0 ? "opacity-40 grayscale" : ""}`}>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#edf7ef] text-xl">🌱</div>
              <p className="mt-3 font-extrabold text-[#102b1d]">{badge}</p>
              <p className="mt-1 text-xs font-semibold text-[#617063]">Log a savings contribution.</p>
            </div>
          ))}
        </div>
      </section>

      <button onClick={onOpenAddGoal} className="fixed bottom-24 right-4 z-30 rounded-full bg-[#164f33] px-5 py-4 text-sm font-black text-white shadow-xl shadow-[#164f33]/25 sm:hidden" type="button">
        + New Goal
      </button>
    </div>
  );
}

function ChatPage({
  mood,
  messages,
  input,
  typing,
  onInputChange,
  onSend,
}: {
  mood: string;
  messages: ChatMessage[];
  input: string;
  typing: boolean;
  onInputChange: (value: string) => void;
  onSend: (value?: string) => void;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-5.5rem)] max-w-4xl flex-col px-4 py-5 sm:px-6 lg:px-8">
      <section className="flex items-center gap-4 rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-[#ded7c6]">
        <TigomFace mood={mood} size="sm" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-black text-[#102b1d]">Tigom · AI Coach</h1>
          <p className="text-sm font-semibold text-[#617063]">Your personal budgeting buddy</p>
        </div>
        <span className="flex items-center gap-2 rounded-full bg-[#edf7ef] px-3 py-1 text-xs font-black text-[#164f33]">
          <span className="h-2 w-2 rounded-full bg-[#2b8259]" /> Active
        </span>
      </section>

      <section className="scrollbar-none flex-1 space-y-4 overflow-y-auto py-5">
        <div className="text-center text-xs font-bold uppercase tracking-[0.18em] text-[#7a817a]">Today</div>
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-3 ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
            {message.sender === "tigom" ? <TigomFace mood={mood} size="sm" /> : null}
            <div
              className={`max-w-[82%] rounded-[1.5rem] px-4 py-3 text-sm font-semibold shadow-sm ${
                message.sender === "user" ? "bg-[#164f33] text-white" : "bg-white text-[#26372c] ring-1 ring-[#ded7c6]"
              }`}
            >
              <p>{message.text}</p>
              <p className={`mt-2 text-[0.65rem] font-bold ${message.sender === "user" ? "text-white/60" : "text-[#7a817a]"}`}>{message.time}</p>
            </div>
          </div>
        ))}
        {typing ? (
          <div className="flex gap-3">
            <TigomFace mood={mood} size="sm" />
            <div className="flex items-center gap-1 rounded-[1.5rem] bg-white px-4 py-4 ring-1 ring-[#ded7c6]">
              <span className="typing-dot" />
              <span className="typing-dot delay-150" />
              <span className="typing-dot delay-300" />
            </div>
          </div>
        ) : null}
      </section>

      <section className="mb-3">
        <div className="scrollbar-none flex gap-2 overflow-x-auto pb-2">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onSend(prompt)}
              className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-black text-[#164f33] ring-1 ring-[#ded7c6]"
              type="button"
            >
              {prompt}
            </button>
          ))}
        </div>
      </section>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
        className="safe-bottom sticky bottom-0 flex items-center gap-3 rounded-[2rem] bg-white p-3 shadow-xl shadow-[#102b1d]/10 ring-1 ring-[#ded7c6]"
      >
        <TigomFace mood={mood} size="sm" />
        <input
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder="Ask Tigom anything..."
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
        />
        <button className="rounded-full bg-[#164f33] px-5 py-3 text-sm font-black text-white" type="submit">
          Send
        </button>
      </form>
    </div>
  );
}

function MorePage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const shortcuts = [
    { page: "activity" as Page, title: "Activity", detail: "Expenses and game events", icon: "≋" },
    { page: "goals" as Page, title: "Savings Goals", detail: "Track long-term targets", icon: "◎" },
    { page: "chat" as Page, title: "Tigom AI Chat", detail: "Ask for a budget read", icon: "✦" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-5 sm:px-6 lg:px-8">
      <section>
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#6b756c]">More / Settings</p>
        <h1 className="mt-1 font-display text-4xl font-black text-[#102b1d]">App hub</h1>
        <p className="mt-2 text-sm font-semibold text-[#617063]">Quick routes for the pages outside the main mobile nav.</p>
      </section>
      <section className="space-y-3">
        {shortcuts.map((shortcut) => (
          <button
            key={shortcut.page}
            onClick={() => onNavigate(shortcut.page)}
            className="flex w-full items-center gap-4 rounded-[2rem] bg-white p-5 text-left shadow-sm ring-1 ring-[#ded7c6] transition hover:-translate-y-0.5 hover:shadow-md"
            type="button"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#edf7ef] text-2xl text-[#164f33]">{shortcut.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-xl font-black text-[#102b1d]">{shortcut.title}</span>
              <span className="mt-1 block text-sm font-semibold text-[#617063]">{shortcut.detail}</span>
            </span>
            <span className="text-[#164f33]">→</span>
          </button>
        ))}
      </section>
      <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-[#ded7c6]">
        <SectionHeader eyebrow="Settings" title="Gentle controls" />
        <div className="space-y-4">
          {["Streak risk reminder", "Weekly quest recap", "Friend activity nudges"].map((setting) => (
            <div key={setting} className="flex items-center justify-between gap-4 rounded-3xl bg-[#faf8f1] px-4 py-3">
              <span className="text-sm font-extrabold text-[#102b1d]">{setting}</span>
              <span className="h-7 w-12 rounded-full bg-[#2b8259] p-1">
                <span className="block h-5 w-5 translate-x-5 rounded-full bg-white" />
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function DesktopSidebar({ currentPage, onNavigate }: { currentPage: Page; onNavigate: (page: Page) => void }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-[#d8d1bd]/80 bg-[#f7f3e8] p-5 lg:block">
      <div className="rounded-[2rem] bg-[#164f33] p-5 text-white">
        <div className="flex items-center gap-3">
          <TigomFace mood="happy" size="sm" />
          <div>
            <p className="font-display text-2xl font-black">SugboCents</p>
            <p className="text-xs font-bold text-white/65">Budgeting that feels alive</p>
          </div>
        </div>
      </div>
      <nav className="mt-6 space-y-2">
        {desktopNav.map((item) => {
          const active = currentPage === item.page;
          return (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                active ? "bg-[#164f33] text-white shadow-lg shadow-[#164f33]/15" : "text-[#516054] hover:bg-white"
              }`}
              type="button"
            >
              <span className="w-6 text-center text-lg">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function BottomNav({ currentPage, onNavigate }: { currentPage: Page; onNavigate: (page: Page) => void }) {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-[#d8d1bd] bg-[#fbf8ef]/94 px-2 py-2 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {mobileNav.map((item) => {
          const active = currentPage === item.page || (["activity", "goals", "chat"].includes(currentPage) && item.page === "more");
          return (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              className={`rounded-2xl px-2 py-2 text-center text-[0.68rem] font-black transition ${active ? "bg-[#164f33] text-white" : "text-[#607064]"}`}
              type="button"
            >
              <span className="block text-lg leading-none">{item.icon}</span>
              <span className="mt-1 block">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function ResourceSheetModal({ sheet, onClose }: { sheet: ResourceSheet; onClose: () => void }) {
  if (!sheet) return null;

  const content = {
    streak: {
      title: "8-day streak",
      tone: "text-[#F97316]",
      metric: "🔥 8",
      body: "Log one expense before midnight to keep the thread alive. Your longest streak is 30 days.",
    },
    sentimos: {
      title: "Sentimos balance",
      tone: "text-[#0D9488]",
      metric: "₵420",
      body: "Recent: +₵25 from Category Explorer, -₵40 for a Tigom cap cosmetic.",
    },
    level: {
      title: "Level progress",
      tone: "text-[#EAB308]",
      metric: "Lv. 4",
      body: "Budget Keeper is 72% complete. Next up: Spending Scout at 5,000 lifetime XP.",
    },
  }[sheet];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#102b1d]/35 p-3 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#d8d1bd]" />
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#6b756c]">Resource detail</p>
        <h2 className={`mt-2 font-display text-5xl font-black ${content.tone}`}>{content.metric}</h2>
        <h3 className="mt-3 font-display text-2xl font-black text-[#102b1d]">{content.title}</h3>
        <p className="mt-2 text-sm font-semibold text-[#617063]">{content.body}</p>
        {sheet === "level" ? <div className="mt-5"><ProgressBar value={72} tone="gold" /></div> : null}
        <button onClick={onClose} className="mt-6 w-full rounded-2xl bg-[#164f33] px-4 py-3 text-sm font-black text-white" type="button">
          Close
        </button>
      </div>
    </div>
  );
}

function ExpenseModal({
  category,
  amount,
  note,
  onAmountChange,
  onNoteChange,
  onClose,
  onSubmit,
}: {
  category: Category | null;
  amount: string;
  note: string;
  onAmountChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!category) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-[#102b1d]/35 p-3 backdrop-blur-sm sm:place-items-center" onClick={onClose}>
      <form className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()} onSubmit={onSubmit}>
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#f4f0e5] text-3xl">{category.icon}</div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#6b756c]">Quick add</p>
            <h2 className="font-display text-2xl font-black text-[#102b1d]">{category.label}</h2>
          </div>
        </div>
        <label className="mt-6 block">
          <span className="text-sm font-black text-[#102b1d]">Amount</span>
          <input
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            autoFocus
            inputMode="decimal"
            placeholder="₱ 0.00"
            className="mt-2 w-full rounded-2xl border border-[#d8d1bd] bg-[#faf8f1] px-4 py-4 font-display text-3xl font-black outline-none focus:border-[#164f33]"
          />
        </label>
        <label className="mt-4 block">
          <span className="text-sm font-black text-[#102b1d]">Note optional</span>
          <input
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="e.g. lunch with blockmates"
            className="mt-2 w-full rounded-2xl border border-[#d8d1bd] bg-[#faf8f1] px-4 py-3 text-sm font-semibold outline-none focus:border-[#164f33]"
          />
        </label>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={onClose} className="rounded-2xl bg-[#f4f0e5] px-4 py-3 text-sm font-black text-[#526257]" type="button">
            Cancel
          </button>
          <button className="rounded-2xl bg-[#164f33] px-4 py-3 text-sm font-black text-white" type="submit">
            Log +5 XP
          </button>
        </div>
      </form>
    </div>
  );
}

function AddGoalModal({
  open,
  name,
  target,
  deadline,
  onNameChange,
  onTargetChange,
  onDeadlineChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  name: string;
  target: string;
  deadline: string;
  onNameChange: (value: string) => void;
  onTargetChange: (value: string) => void;
  onDeadlineChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-[#102b1d]/35 p-3 backdrop-blur-sm sm:place-items-center" onClick={onClose}>
      <form className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()} onSubmit={onSubmit}>
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#6b756c]">Savings goal</p>
        <h2 className="mt-1 font-display text-3xl font-black text-[#102b1d]">Create a goal</h2>
        <label className="mt-6 block">
          <span className="text-sm font-black text-[#102b1d]">Goal name</span>
          <input value={name} onChange={(event) => onNameChange(event.target.value)} className="mt-2 w-full rounded-2xl border border-[#d8d1bd] bg-[#faf8f1] px-4 py-3 text-sm font-semibold outline-none focus:border-[#164f33]" placeholder="Trip to Siargao" />
        </label>
        <label className="mt-4 block">
          <span className="text-sm font-black text-[#102b1d]">Target amount</span>
          <input value={target} onChange={(event) => onTargetChange(event.target.value)} inputMode="decimal" className="mt-2 w-full rounded-2xl border border-[#d8d1bd] bg-[#faf8f1] px-4 py-3 text-sm font-semibold outline-none focus:border-[#164f33]" placeholder="₱ 10000" />
        </label>
        <label className="mt-4 block">
          <span className="text-sm font-black text-[#102b1d]">Optional deadline</span>
          <input value={deadline} onChange={(event) => onDeadlineChange(event.target.value)} className="mt-2 w-full rounded-2xl border border-[#d8d1bd] bg-[#faf8f1] px-4 py-3 text-sm font-semibold outline-none focus:border-[#164f33]" placeholder="December 2026" />
        </label>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={onClose} className="rounded-2xl bg-[#f4f0e5] px-4 py-3 text-sm font-black text-[#526257]" type="button">
            Cancel
          </button>
          <button className="rounded-2xl bg-[#164f33] px-4 py-3 text-sm font-black text-white" type="submit">
            Save goal
          </button>
        </div>
      </form>
    </div>
  );
}

function CelebrationModal({ celebration, onClose }: { celebration: Celebration; onClose: () => void }) {
  if (!celebration) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#164f33] p-6 text-white">
      <div className="absolute left-8 top-10 h-5 w-5 animate-confetti rounded-full bg-[#EAB308]" />
      <div className="absolute right-10 top-24 h-4 w-4 animate-confetti rounded-full bg-[#0D9488]" />
      <div className="absolute bottom-20 left-14 h-4 w-4 animate-confetti rounded-full bg-white" />
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex justify-center"><TigomFace mood="happy" size="lg" /></div>
        <p className="text-sm font-extrabold uppercase tracking-[0.28em] text-white/60">Celebration moment</p>
        <h2 className="mt-3 font-display text-5xl font-black tracking-tight">{celebration.title}</h2>
        <p className="mt-4 text-lg font-semibold text-white/78">{celebration.subtitle}</p>
        <p className="mt-6 font-display text-4xl font-black text-[#EAB308]">{celebration.reward}</p>
        <button onClick={onClose} className="mt-8 w-full rounded-2xl bg-white px-5 py-4 text-sm font-black text-[#164f33]" type="button">
          Continue
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [quests, setQuests] = useState<Quest[]>(initialQuests);
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [sentimos, setSentimos] = useState(420);
  const [level, setLevel] = useState(4);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseNote, setExpenseNote] = useState("");
  const [sheet, setSheet] = useState<ResourceSheet>(null);
  const [celebration, setCelebration] = useState<Celebration>(null);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      sender: "tigom",
      text: "Kumusta, Maria? You've spent ₱1,302 of your ₱2,000 budget, so we can still steer this week calmly.",
      time: "8:10 PM",
    },
  ]);

  const budget = 2000;
  const spent = useMemo(() => expenses.reduce((total, expense) => total + expense.amount, 0), [expenses]);
  const remaining = Math.max(0, budget - spent);
  const budgetPercent = Math.min(100, (spent / budget) * 100);
  const mood = getBudgetMood(budgetPercent);
  const streakAtRisk = true;

  const navigate = (nextPage: Page) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openCategory = (category: Category) => {
    setSelectedCategory(category);
    setExpenseAmount("");
    setExpenseNote("");
  };

  const handleExpenseSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCategory) return;
    const parsedAmount = Number(expenseAmount.replace(/[^0-9.]/g, ""));
    if (!parsedAmount || parsedAmount <= 0) return;
    const newExpense: Expense = {
      id: Date.now(),
      category: selectedCategory.label,
      icon: selectedCategory.icon,
      amount: parsedAmount,
      note: expenseNote || "Quick log",
      time: "Just now",
      dateGroup: "Today",
    };
    setExpenses((current) => [newExpense, ...current]);
    setSelectedCategory(null);
    setCelebration({
      title: "+5 XP logged",
      subtitle: "Tiny log, real habit. Your daily XP cap is tracking.",
      reward: "+5 XP",
    });
  };

  const handleClaimQuest = (quest: Quest) => {
    setQuests((current) => current.map((item) => (item.id === quest.id ? { ...item, claimed: true } : item)));
    setSentimos((current) => current + quest.reward);
    setCelebration({
      title: "Quest complete!",
      subtitle: `${quest.title} is claimed. Tigom added the reward to your shop balance.`,
      reward: `+${quest.xp} XP + ₵${quest.reward}`,
    });
    if (quest.xp >= 100) setLevel(4);
  };

  const handleDeposit = (goalId: number) => {
    setGoals((current) =>
      current.map((goal) =>
        goal.id === goalId ? { ...goal, saved: Math.min(goal.target, goal.saved + 500) } : goal,
      ),
    );
    setCelebration({
      title: "Savings added",
      subtitle: "Future-you says salamat. Your goal bar just moved.",
      reward: "+₱500 saved",
    });
  };

  const handleGoalSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedTarget = Number(goalTarget.replace(/[^0-9.]/g, ""));
    if (!goalName || !parsedTarget) return;
    setGoals((current) => [
      ...current,
      {
        id: Date.now(),
        name: goalName,
        saved: 0,
        target: parsedTarget,
        deadline: goalDeadline || "No deadline yet",
      },
    ]);
    setGoalName("");
    setGoalTarget("");
    setGoalDeadline("");
    setGoalModalOpen(false);
  };

  const sendMessage = (value?: string) => {
    const text = (value ?? chatInput).trim();
    if (!text || typing) return;
    const userMessage: ChatMessage = { id: Date.now(), sender: "user", text, time: "Now" };
    setMessages((current) => [...current, userMessage]);
    setChatInput("");
    setTyping(true);
    window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          sender: "tigom",
          text: `You have ${formatPeso(remaining)} left and an 8-day streak at risk tonight. Focus on one small log, then aim for the Category Explorer claim if you want quick Sentimos.`,
          time: "Now",
        },
      ]);
      setTyping(false);
    }, 900);
  };

  return (
    <div className="min-h-screen bg-[#f7f3e8] text-[#102b1d]">
      <div className="lg:flex">
        <DesktopSidebar currentPage={page} onNavigate={navigate} />
        <main className="min-w-0 flex-1 pb-28 lg:pb-0">
          <ResourceBar streak={8} sentimos={sentimos} level={level} atRisk={streakAtRisk} onOpenSheet={setSheet} />
          <div className="lg:hidden px-4 pt-4">
            <p className="font-display text-2xl font-black text-[#164f33]">SugboCents</p>
            <p className="text-xs font-bold text-[#617063]">{pageTitle(page)}</p>
          </div>
          {page === "dashboard" ? (
            <DashboardPage
              spent={spent}
              budget={budget}
              remaining={remaining}
              budgetPercent={budgetPercent}
              mood={mood}
              expenses={expenses}
              quests={quests}
              onOpenCategory={openCategory}
              onNavigate={navigate}
            />
          ) : null}
          {page === "quests" ? <QuestsPage quests={quests} onClaim={handleClaimQuest} /> : null}
          {page === "leaderboard" ? <LeaderboardPage /> : null}
          {page === "profile" ? <ProfilePage sentimos={sentimos} /> : null}
          {page === "activity" ? <ActivityPage expenses={expenses} budget={budget} spent={spent} /> : null}
          {page === "goals" ? <GoalsPage goals={goals} onDeposit={handleDeposit} onOpenAddGoal={() => setGoalModalOpen(true)} /> : null}
          {page === "chat" ? (
            <ChatPage
              mood={mood}
              messages={messages}
              input={chatInput}
              typing={typing}
              onInputChange={setChatInput}
              onSend={sendMessage}
            />
          ) : null}
          {page === "more" ? <MorePage onNavigate={navigate} /> : null}
        </main>
      </div>

      {page !== "chat" ? (
        <button
          onClick={() => navigate("chat")}
          className="fixed bottom-24 right-4 z-30 grid h-16 w-16 place-items-center rounded-full bg-white shadow-2xl shadow-[#102b1d]/20 ring-2 ring-[#164f33]/15 lg:bottom-6"
          type="button"
          aria-label="Open Tigom AI chat"
        >
          <TigomFace mood={mood} size="sm" />
        </button>
      ) : null}

      <BottomNav currentPage={page} onNavigate={navigate} />
      <ResourceSheetModal sheet={sheet} onClose={() => setSheet(null)} />
      <ExpenseModal
        category={selectedCategory}
        amount={expenseAmount}
        note={expenseNote}
        onAmountChange={setExpenseAmount}
        onNoteChange={setExpenseNote}
        onClose={() => setSelectedCategory(null)}
        onSubmit={handleExpenseSubmit}
      />
      <AddGoalModal
        open={goalModalOpen}
        name={goalName}
        target={goalTarget}
        deadline={goalDeadline}
        onNameChange={setGoalName}
        onTargetChange={setGoalTarget}
        onDeadlineChange={setGoalDeadline}
        onClose={() => setGoalModalOpen(false)}
        onSubmit={handleGoalSubmit}
      />
      <CelebrationModal celebration={celebration} onClose={() => setCelebration(null)} />
    </div>
  );
}