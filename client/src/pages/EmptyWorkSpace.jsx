import channelImage from "../assets/channel.png";

function Icon({ name, className = "h-5 w-5", strokeWidth = 2 }) {
  const commonProps = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  const icons = {
    huddle: (
      <svg {...commonProps}>
        <path d="M5 6.75A3.75 3.75 0 0 1 8.75 3h6.5A3.75 3.75 0 0 1 19 6.75v4.5A3.75 3.75 0 0 1 15.25 15H11l-4.25 4v-4A3.75 3.75 0 0 1 3 11.25v-4.5Z" />
        <path d="M8 8.5h8M8 11.5h5" />
      </svg>
    ),
    plus: (
      <svg {...commonProps}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
    chevronDown: (
      <svg {...commonProps}>
        <path d="m6 9 6 6 6-6" />
      </svg>
    ),
    search: (
      <svg {...commonProps}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    ),
    bell: (
      <svg {...commonProps}>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M13.75 21a2 2 0 0 1-3.5 0" />
      </svg>
    ),
    settings: (
      <svg {...commonProps}>
        <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06A2 2 0 1 1 7.03 3.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.2.36.6.6 1 .6h.6a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1.4Z" />
      </svg>
    ),
    bold: (
      <svg {...commonProps}>
        <path d="M7 5h6a3 3 0 0 1 0 6H7z" />
        <path d="M7 11h7a4 4 0 0 1 0 8H7z" />
      </svg>
    ),
    italic: (
      <svg {...commonProps}>
        <path d="M11 5h6M7 19h6M14 5l-4 14" />
      </svg>
    ),
    strikethrough: (
      <svg {...commonProps}>
        <path d="M6 12h12M16 6.5A4.5 4.5 0 0 0 12.5 5H11a3 3 0 0 0 0 6h2a3 3 0 0 1 0 6h-1.5A4.5 4.5 0 0 1 8 15.5" />
      </svg>
    ),
    link: (
      <svg {...commonProps}>
        <path d="M10 13a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15" />
        <path d="M14 11a5 5 0 0 0-7.07 0l-2 2A5 5 0 0 0 12 20.07l1.15-1.15" />
      </svg>
    ),
    list: (
      <svg {...commonProps}>
        <path d="M8 6h13M8 12h13M8 18h13" />
        <path d="M3 6h.01M3 12h.01M3 18h.01" />
      </svg>
    ),
    code: (
      <svg {...commonProps}>
        <path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14" />
      </svg>
    ),
    emoji: (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 10h.01M15.5 10h.01M8 14a5 5 0 0 0 8 0" />
      </svg>
    ),
    at: (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="4" />
        <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
      </svg>
    ),
    microphone: (
      <svg {...commonProps}>
        <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" />
        <path d="M19 11a7 7 0 0 1-14 0M12 18v3M8 21h8" />
      </svg>
    ),
    send: (
      <svg {...commonProps}>
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
      </svg>
    ),
    user: (
      <svg {...commonProps}>
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="8" r="4" />
      </svg>
    ),
  };

  return icons[name] ?? null;
}

function IconButton({ label, children, className = "" }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 ${className}`}
    >
      {children}
    </button>
  );
}

function IconRail() {
  return (
    <aside className="flex h-screen w-[80px] shrink-0 flex-col items-center bg-[#111827] py-6">
      <div className="flex flex-col items-center gap-6">
        <button
          type="button"
          aria-label="Huddle home"
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#4F46E5] text-black shadow-sm"
        >
          <Icon name="huddle" className="h-6 w-6" />
        </button>

        <button
          type="button"
          aria-label="Create workspace"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 text-white/85 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
        >
          <Icon name="plus" className="h-5 w-5" />
        </button>
      </div>

      <button
        type="button"
        aria-label="User profile"
        className="mt-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white ring-2 ring-white/10 transition hover:bg-white/15"
      >
        <Icon name="user" className="h-5 w-5" />
      </button>
    </aside>
  );
}

function SidebarSection({ title }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {title}
        </h2>
        <button
          type="button"
          aria-label={`Add ${title.toLowerCase()}`}
          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
        >
          <Icon name="plus" className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

function Sidebar() {
  return (
    <aside className="h-screen w-[220px] shrink-0 border-r border-gray-200 bg-gray-50 px-5 py-6">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-lg px-1 py-2 text-left text-sm font-semibold text-gray-900 transition hover:bg-gray-100"
      >
        <span>Huddle Workspace</span>
        <Icon name="chevronDown" className="h-4 w-4 text-gray-500" />
      </button>

      <nav className="mt-8 space-y-8" aria-label="Workspace navigation">
        <SidebarSection title="Channels" />
        <SidebarSection title="Direct Messages" />
      </nav>
    </aside>
  );
}

function TopBar() {
  return (
    <header className="flex h-[76px] shrink-0 items-center gap-5 border-b border-gray-200 bg-white px-8">
      <label className="relative flex-1">
        <span className="sr-only">Search</span>
        <Icon
          name="search"
          className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
        />
        <input
          type="search"
          placeholder="Search general..."
          className="h-12 w-full rounded-full border border-gray-200 bg-gray-50 pl-13 pr-5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#4F46E5] focus:bg-white focus:ring-4 focus:ring-[#4F46E5]/10"
        />
      </label>

      <div className="flex items-center gap-2">
        <IconButton label="Notifications">
          <Icon name="bell" />
        </IconButton>
        <IconButton label="Settings">
          <Icon name="settings" />
        </IconButton>
      </div>
    </header>
  );
}

function EmptyState() {
  return (
    <section className="flex flex-1 min-h-0 items-center justify-center px-8 py-4 text-center">
      <div className="flex max-w-[620px] flex-col items-center">
        <img
          src={channelImage}
          alt=""
         className="mb-4 h-[150px] w-[150px] object-contain"
        />
        <h1 className="text-3xl font-bold text-gray-950">
          Welcome to your new workspace!
        </h1>
        <p className="mt-2 max-w-[560px] text-base leading-7 text-gray-500">
          You haven't joined any channels yet. Start by creating a new channel
          or joining an existing one to start collaborating with your team.
        </p>
        <div className="mt-4 flex items-center justify-center gap-6">
          <button
            type="button"
            className="rounded-full bg-[#4F46E5] px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4338CA] focus:outline-none focus:ring-4 focus:ring-[#4F46E5]/20"
          >
            Create a Channel
          </button>
          <button
            type="button"
            className="rounded-full border border-[#FFFFFF] px-7 py-3 text-sm font-semibold text-gray-900 transition hover:bg-[#4F46E5]/5"
          >
            Browse Channels
          </button>
        </div>
      </div>
    </section>
  );
}

function ComposerIconButton({ label, icon }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
    >
      <Icon name={icon} className="h-5 w-5" />
    </button>
  );
}

function Composer() {
  const formattingTools = [
    ["Bold", "bold"],
    ["Italic", "italic"],
    ["Strikethrough", "strikethrough"],
    ["Insert link", "link"],
    ["List", "list"],
    ["Code", "code"],
  ];

  const actionTools = [
    ["Add attachment", "plus"],
    ["Add emoji", "emoji"],
    ["Mention someone", "at"],
    ["Record audio", "microphone"],
  ];

  return (
    <section className="shrink-0 px-8 pb-7" aria-label="Message composer">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-1 border-b border-gray-100 px-4 py-2">
          {formattingTools.map(([label, icon]) => (
            <ComposerIconButton key={label} label={label} icon={icon} />
          ))}
        </div>

        <label className="block">
          <span className="sr-only">Message general</span>
          <textarea
            rows={2}
            placeholder="Message #general"
            className="block w-full resize-none px-5 py-4 text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
        </label>

        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
          <div className="flex items-center gap-1">
            {actionTools.map(([label, icon]) => (
              <ComposerIconButton key={label} label={label} icon={icon} />
            ))}
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4338CA] focus:outline-none focus:ring-4 focus:ring-[#4F46E5]/20"
          >
            Send
            <Icon name="send" className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-gray-400">
        Enter to send, Shift + Enter for new line
      </p>
    </section>
  );
}

export default function EmptyWorkspace() {
  return (
    <main className="flex h-screen min-w-[1024px] overflow-hidden bg-white font-[Inter,system-ui,sans-serif] text-gray-900">
      <IconRail />
      <Sidebar />
      <section className="flex h-full min-w-0 min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <TopBar />
        <EmptyState />
        <Composer />
      </section>
    </main>
  );
}
