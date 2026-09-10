import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import channelImage from "../assets/channel.png";
import { clearToken } from "../utils/storage";
import { fetchChannels, createChannel } from "../api/channels";
import Spinner from "../components/Spinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faComment,
  faPlus,
  faChevronDown,
  faMagnifyingGlass,
  faBell,
  faGear,
  faBold,
  faItalic,
  faStrikethrough,
  faLink,
  faListUl,
  faCode,
  faFaceSmile,
  faAt,
  faMicrophone,
  faPaperPlane,
  faUser,
  faRightFromBracket,
  faHashtag,
} from "@fortawesome/free-solid-svg-icons";

function IconButton({ label, children, className = "", onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
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
          <FontAwesomeIcon icon={faComment} className="h-6 w-6" />
        </button>

        <button
          type="button"
          aria-label="Create workspace"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 text-white/85 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
        >
          <FontAwesomeIcon icon={faPlus} className="h-5 w-5" />
        </button>
      </div>

      <button
        type="button"
        aria-label="User profile"
        className="mt-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white ring-2 ring-white/10 transition hover:bg-white/15"
      >
        <FontAwesomeIcon icon={faUser} className="h-5 w-5" />
      </button>
    </aside>
  );
}

function SidebarSection({ title, onAdd, children }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {title}
        </h2>
        {onAdd && (
          <button
            type="button"
            aria-label={`Add ${title.toLowerCase()}`}
            onClick={onAdd}
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function CreateChannelForm({ onSubmit, onCancel }) {
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) return;

    setPending(true);
    setError("");
    try {
      await onSubmit(trimmed);
      // On success the parent closes the form, which unmounts it.
    } catch (err) {
      setError(err.message);
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={pending}
        placeholder="Channel name"
        className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[#4F46E5] px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-[#4338CA] disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ChannelListItem({ channel, selected, onSelect }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(channel.id)}
        aria-current={selected ? "true" : undefined}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition ${
          selected
            ? "bg-[#4F46E5]/10 font-semibold text-[#4F46E5]"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        <FontAwesomeIcon
          icon={faHashtag}
          className="h-3.5 w-3.5 shrink-0 text-gray-400"
        />
        <span className="truncate">{channel.name}</span>
      </button>
    </li>
  );
}

function Sidebar({
  channels,
  selectedChannelId,
  onSelectChannel,
  isCreatingChannel,
  onToggleCreate,
  onCreateChannel,
}) {
  return (
    <aside className="h-screen w-[220px] shrink-0 border-r border-gray-200 bg-gray-50 px-5 py-6">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-lg px-1 py-2 text-left text-sm font-semibold text-gray-900 transition hover:bg-gray-100"
      >
        <span>Huddle Workspace</span>
        <FontAwesomeIcon icon={faChevronDown} className="h-4 w-4 text-gray-500" />
      </button>

      <nav className="mt-8 space-y-8" aria-label="Workspace navigation">
        <SidebarSection title="Channels" onAdd={onToggleCreate}>
          {isCreatingChannel && (
            <CreateChannelForm
              onSubmit={onCreateChannel}
              onCancel={onToggleCreate}
            />
          )}
          {channels.length > 0 && (
            <ul className="space-y-0.5">
              {channels.map((channel) => (
                <ChannelListItem
                  key={channel.id}
                  channel={channel}
                  selected={channel.id === selectedChannelId}
                  onSelect={onSelectChannel}
                />
              ))}
            </ul>
          )}
        </SidebarSection>
        <SidebarSection title="Direct Messages" />
      </nav>
    </aside>
  );
}

function TopBar({ onLogout, channelName }) {
  return (
    <header className="flex h-[76px] shrink-0 items-center gap-5 border-b border-gray-200 bg-white px-8">
      <label className="relative flex-1">
        <span className="sr-only">Search</span>
        <FontAwesomeIcon
          icon={faMagnifyingGlass}
          className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
        />
        <input
          type="search"
          placeholder={channelName ? `Search ${channelName}...` : "Search..."}
          className="h-12 w-full rounded-full border border-gray-200 bg-gray-50 pl-13 pr-5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#4F46E5] focus:bg-white focus:ring-4 focus:ring-[#4F46E5]/10"
        />
      </label>

      <div className="flex items-center gap-2">
        <IconButton label="Notifications">
          <FontAwesomeIcon icon={faBell} />
        </IconButton>
        <IconButton label="Settings">
          <FontAwesomeIcon icon={faGear} />
        </IconButton>
        <IconButton label="Log out" onClick={onLogout}>
          <FontAwesomeIcon icon={faRightFromBracket} />
        </IconButton>
      </div>
    </header>
  );
}

function EmptyState({ onCreateChannel }) {
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
            onClick={onCreateChannel}
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

function LoadingState() {
  return (
    <section className="flex flex-1 min-h-0 items-center justify-center">
      <Spinner className="h-8 w-8 text-[#4F46E5]" />
    </section>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <section className="flex flex-1 min-h-0 items-center justify-center px-8 text-center">
      <div className="max-w-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Couldn't load channels
        </h2>
        <p className="mt-2 text-sm text-gray-500">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-full bg-[#4F46E5] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4338CA]"
        >
          Retry
        </button>
      </div>
    </section>
  );
}

function ChannelView({ channel }) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-[60px] shrink-0 items-center gap-2 border-b border-gray-200 px-8">
        <FontAwesomeIcon icon={faHashtag} className="h-5 w-5 text-gray-400" />
        <h1 className="text-lg font-bold text-gray-900">{channel.name}</h1>
      </header>
      <div className="min-h-0 flex-1" />
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
      <FontAwesomeIcon icon={icon} className="h-5 w-5" />
    </button>
  );
}

function Composer({ channelName }) {
  const formattingTools = [
    ["Bold", faBold],
    ["Italic", faItalic],
    ["Strikethrough", faStrikethrough],
    ["Insert link", faLink],
    ["List", faListUl],
    ["Code", faCode],
  ];

  const actionTools = [
    ["Add attachment", faPlus],
    ["Add emoji", faFaceSmile],
    ["Mention someone", faAt],
    ["Record audio", faMicrophone],
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
          <span className="sr-only">
            Message {channelName ? `#${channelName}` : "channel"}
          </span>
          <textarea
            rows={2}
            placeholder={channelName ? `Message #${channelName}` : "Message"}
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
            <FontAwesomeIcon icon={faPaperPlane} className="h-4 w-4" />
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
  const navigate = useNavigate();
  const [channels, setChannels] = useState([]);
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchChannels()
      .then((data) => {
        if (cancelled) return;
        setChannels(data);
        setSelectedChannelId(data[0]?.id ?? null);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMessage(err.message);
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const handleRetry = () => {
    setStatus("loading");
    setErrorMessage("");
    setAttempt((n) => n + 1);
  };

  const selectedChannel =
    channels.find((channel) => channel.id === selectedChannelId) ??
    channels[0] ??
    null;

  const handleLogout = () => {
    clearToken();
    navigate("/");
  };

  const handleToggleCreate = () => setIsCreatingChannel((value) => !value);

  const handleCreateChannel = async (name) => {
    const channel = await createChannel(name);
    setChannels((prev) => [...prev, channel]);
    setSelectedChannelId(channel.id);
    setIsCreatingChannel(false);
  };

  let content;
  if (status === "loading") {
    content = <LoadingState />;
  } else if (status === "error") {
    content = <ErrorState message={errorMessage} onRetry={handleRetry} />;
  } else if (!selectedChannel) {
    content = <EmptyState onCreateChannel={() => setIsCreatingChannel(true)} />;
  } else {
    content = <ChannelView channel={selectedChannel} />;
  }

  return (
    <main className="flex h-screen min-w-[1024px] overflow-hidden bg-white font-[Inter,system-ui,sans-serif] text-gray-900">
      <IconRail />
      <Sidebar
        channels={channels}
        selectedChannelId={selectedChannelId}
        onSelectChannel={setSelectedChannelId}
        isCreatingChannel={isCreatingChannel}
        onToggleCreate={handleToggleCreate}
        onCreateChannel={handleCreateChannel}
      />
      <section className="flex h-full min-w-0 min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <TopBar onLogout={handleLogout} channelName={selectedChannel?.name} />
        {content}
        <Composer channelName={selectedChannel?.name} />
      </section>
    </main>
  );
}
