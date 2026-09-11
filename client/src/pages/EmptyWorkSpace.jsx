import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import channelImage from "../assets/channel.png";
import { clearToken } from "../utils/storage";
import { fetchChannels, createChannel, deleteChannel } from "../api/channels";
import { createInvite } from "../api/invites";
import { fetchMessages } from "../api/messages";
import { getSocket } from "../lib/socket";
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
  faUserPlus,
  faRightFromBracket,
  faHashtag,
  faXmark,
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
  searchQuery,
}) {
  const visibleChannels = searchQuery
    ? channels.filter((channel) =>
        channel.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : channels;

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
          {visibleChannels.length > 0 ? (
            <ul className="space-y-0.5">
              {visibleChannels.map((channel) => (
                <ChannelListItem
                  key={channel.id}
                  channel={channel}
                  selected={channel.id === selectedChannelId}
                  onSelect={onSelectChannel}
                />
              ))}
            </ul>
          ) : searchQuery ? (
            <p className="text-sm text-gray-400">
              No channels match "{searchQuery}".
            </p>
          ) : null}
        </SidebarSection>
        <SidebarSection title="Direct Messages" />
      </nav>
    </aside>
  );
}

function TopBar({
  onLogout,
  channelName,
  onOpenSettings,
  searchQuery,
  onSearchChange,
  notificationCount,
  onToggleNotifications,
}) {
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
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={channelName ? `Search ${channelName}...` : "Search..."}
          className="h-12 w-full rounded-full border border-gray-200 bg-gray-50 pl-13 pr-5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#4F46E5] focus:bg-white focus:ring-4 focus:ring-[#4F46E5]/10"
        />
      </label>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Notifications"
          onClick={onToggleNotifications}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
        >
          <FontAwesomeIcon icon={faBell} />
          {notificationCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {notificationCount}
            </span>
          )}
        </button>
        <IconButton label="Settings" onClick={onOpenSettings}>
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

const REACTION_EMOJIS = ["👍", "❤️", "😂", "🎉", "😮", "😢"];

function ReactionChip({ reaction, me, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`reaction-pop inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition ${
        me
          ? "border-[#4F46E5] bg-[#4F46E5]/10 text-[#4F46E5]"
          : "border-gray-200 bg-white text-gray-600 hover:border-[#4F46E5]/40"
      }`}
    >
      <span>{reaction.emoji}</span>
      <span className="font-medium">{reaction.count}</span>
    </button>
  );
}

function MessageRow({ message, own, currentUserId, onToggleReaction }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const reactions = message.reactions ?? [];

  const addReactionButton = (
    <div className="relative self-end opacity-0 transition group-hover:opacity-100">
      {pickerOpen ? (
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-1 rounded-full border border-gray-200 bg-white p-1 shadow-lg">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onToggleReaction(message.id, emoji);
                setPickerOpen(false);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full text-base transition hover:bg-gray-100"
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          aria-label="Add reaction"
          onClick={() => setPickerOpen(true)}
          className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
        >
          <FontAwesomeIcon icon={faFaceSmile} className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  return (
    <div
      className={`group flex items-end gap-1 ${
        own ? "justify-end" : "justify-start"
      }`}
    >
      {own && addReactionButton}
      <div
        className={`flex max-w-[70%] flex-col gap-1 ${
          own ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`message-in rounded-lg px-4 py-2 text-sm ${
            own ? "bg-[#4F46E5] text-white" : "bg-gray-100 text-gray-900"
          }`}
        >
          <p className="break-words">{message.content}</p>
          <span
            className={`mt-1 block text-[11px] ${
              own ? "text-white/70" : "text-gray-400"
            }`}
          >
            {message.created_at
              ? new Date(message.created_at).toLocaleTimeString()
              : ""}
          </span>
        </div>

        {reactions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {reactions.map((reaction) => (
              <ReactionChip
                key={reaction.emoji}
                reaction={reaction}
                me={(reaction.users ?? []).includes(currentUserId)}
                onClick={() => onToggleReaction(message.id, reaction.emoji)}
              />
            ))}
          </div>
        )}
      </div>
      {!own && addReactionButton}
    </div>
  );
}

function TypingIndicator({ users }) {
  if (!users || users.length === 0) return null;

  let label;
  if (users.length === 1) {
    label = `${users[0].name || "Someone"} is typing`;
  } else if (users.length === 2) {
    label = `${users[0].name || "Someone"} and ${
      users[1].name || "someone"
    } are typing`;
  } else {
    label = "Several people are typing";
  }

  return (
    <div className="flex h-6 shrink-0 items-center gap-2 px-8 text-xs text-gray-500">
      <span>{label}</span>
      <span
        className="flex items-center gap-0.5 text-gray-400"
        aria-hidden="true"
      >
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </span>
    </div>
  );
}

function MessageList({ messages, currentUserId, onToggleReaction }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-gray-400">
        No messages yet. Start the conversation.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-0 flex-1 space-y-2 overflow-y-auto px-8 py-4"
    >
      {messages.map((message) => (
        <MessageRow
          key={message.id}
          message={message}
          own={message.user_id === currentUserId}
          currentUserId={currentUserId}
          onToggleReaction={onToggleReaction}
        />
      ))}
    </div>
  );
}

function InviteForm({ channelId, onClose }) {
  const [link, setLink] = useState("");
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setPending(true);
    setError("");
    try {
      const data = await createInvite(channelId);
      setLink(`${window.location.origin}/join/${data.code}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {link ? (
        <>
          <input
            readOnly
            value={link}
            onFocus={(e) => e.target.select()}
            className="w-64 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-600 outline-none"
          />
          <button
            type="button"
            onClick={copy}
            className="rounded-md bg-[#4F46E5] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#4338CA]"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="rounded-md bg-[#4F46E5] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#4338CA] disabled:opacity-60"
        >
          {pending ? "Generating…" : "Generate link"}
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        disabled={pending}
        className="rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
      >
        Cancel
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

function ChannelView({
  channel,
  messages,
  currentUserId,
  typingUsers,
  onToggleReaction,
}) {
  const [isInviting, setIsInviting] = useState(false);

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-[60px] shrink-0 items-center gap-2 border-b border-gray-200 px-8">
        <FontAwesomeIcon icon={faHashtag} className="h-5 w-5 text-gray-400" />
        <h1 className="text-lg font-bold text-gray-900">{channel.name}</h1>
        <div className="ml-auto">
          {isInviting ? (
            <InviteForm
              channelId={channel.id}
              onClose={() => setIsInviting(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsInviting(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              <FontAwesomeIcon icon={faUserPlus} className="h-4 w-4" />
              Invite
            </button>
          )}
        </div>
      </header>
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        onToggleReaction={onToggleReaction}
      />
      <TypingIndicator users={typingUsers} />
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

function Composer({ channelName, value, onChange, onSend, disabled }) {
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

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

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
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
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
            onClick={onSend}
            disabled={disabled || !value.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4338CA] focus:outline-none focus:ring-4 focus:ring-[#4F46E5]/20 disabled:cursor-not-allowed disabled:opacity-60"
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

function SettingsChannelRow({ channel, canDelete, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setDeleting(true);
    setError("");
    try {
      await onDelete(channel.id);
      // On success the parent removes this channel, unmounting the row.
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  };

  if (confirming) {
    return (
      <li className="rounded-md bg-gray-50 p-2.5">
        <p className="text-sm text-gray-900">
          Delete <span className="font-semibold">#{channel.name}</span>?
        </p>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={deleting}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5">
      <span className="flex min-w-0 items-center gap-2 text-sm text-gray-700">
        <FontAwesomeIcon
          icon={faHashtag}
          className="h-3.5 w-3.5 shrink-0 text-gray-400"
        />
        <span className="truncate">{channel.name}</span>
      </span>
      {canDelete && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
        >
          Delete
        </button>
      )}
    </li>
  );
}

function NotificationsPanel({ notifications, onClose, onClear }) {
  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed right-6 top-[72px] z-50 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        role="dialog"
        aria-label="Notifications"
      >
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </button>
        </header>

        <div className="max-h-72 overflow-y-auto px-2 py-2">
          {notifications.length === 0 ? (
            <p className="px-2 py-4 text-sm text-gray-500">No notifications.</p>
          ) : (
            <ul className="space-y-1">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className="rounded-md px-3 py-2 text-sm text-gray-700"
                >
                  {notification.text}
                </li>
              ))}
            </ul>
          )}
        </div>

        {notifications.length > 0 && (
          <footer className="border-t border-gray-200 px-4 py-2">
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-medium text-[#4F46E5] transition hover:underline"
            >
              Clear all
            </button>
          </footer>
        )}
      </div>
    </>
  );
}

function SettingsPanel({ channels, currentUserId, onClose, onDeleteChannel }) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-[320px] flex-col border-l border-gray-200 bg-white shadow-xl"
        role="dialog"
        aria-label="Settings"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Channels
          </h3>
          {channels.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">No channels to manage.</p>
          ) : (
            <ul className="mt-2 space-y-0.5">
              {channels.map((channel) => (
                <SettingsChannelRow
                  key={channel.id}
                  channel={channel}
                  canDelete={channel.createdBy === currentUserId}
                  onDelete={onDeleteChannel}
                />
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [sendError, setSendError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const currentChannelRef = useRef(null);
  const currentUserIdRef = useRef(null);
  const typingAtRef = useRef(0);
  const typingTimerRef = useRef(null);
  const typingTimeoutsRef = useRef({});

  const handleSelectChannel = useCallback((channelId) => {
    if (!channelId || channelId === currentChannelRef.current) return;

    const socket = getSocket();
    const previous = currentChannelRef.current;
    if (previous) {
      socket.emit("leave_channel", { channelId: previous });
    }

    currentChannelRef.current = channelId;
    setSelectedChannelId(channelId);
    setMessages([]);
    setTypingUsers([]);

    fetchMessages(channelId)
      .then((list) =>
        setMessages(
          (list ?? []).map((message) => ({
            ...message,
            reactions: message.reactions ?? [],
          }))
        )
      )
      .catch(() => setMessages([]));

    socket.emit("join_channel", { channelId }, (ack) => {
      if (ack?.event === "error") {
        setSendError(ack.message || "Couldn't join channel.");
      }
    });
  }, []);

  const emitTyping = (typing) => {
    const channelId = currentChannelRef.current;
    if (!channelId) return;
    getSocket().emit(typing ? "typing" : "stop_typing", { channelId });
  };

  const stopTyping = () => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    emitTyping(false);
  };

  const handleMessageChange = (value) => {
    setMessageDraft(value);
    if (sendError) setSendError("");

    if (value.trim()) {
      const now = Date.now();
      if (now - typingAtRef.current > 2000) {
        typingAtRef.current = now;
        emitTyping(true);
      }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => emitTyping(false), 3000);
    } else {
      stopTyping();
    }
  };

  const handleToggleReaction = (messageId, emoji) => {
    const channelId = currentChannelRef.current;
    if (!channelId || !messageId || !emoji) return;
    getSocket().emit(
      "toggle_reaction",
      { channelId, messageId, emoji },
      (ack) => {
        if (ack?.event === "error") {
          setSendError(ack.message || "Couldn't react.");
        }
      }
    );
  };

  const handleSendMessage = () => {
    const content = messageDraft.trim();
    const channelId = currentChannelRef.current;
    if (!content || !channelId) return;

    setSendError("");
    setMessageDraft("");
    stopTyping();

    getSocket().emit("send_message", { channelId, content }, (ack) => {
      if (ack?.event === "error") {
        setMessageDraft(content);
        setSendError(ack.message || "Failed to send message.");
      }
    });
  };

  useEffect(() => {
    const socket = getSocket();

    const handleAuthenticated = ({ userId }) => {
      currentUserIdRef.current = userId;
      setCurrentUserId(userId);
    };
    const handleNewMessage = (message) => {
      if (message?.channel_id !== currentChannelRef.current) return;
      const normalized = { ...message, reactions: message.reactions ?? [] };
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, normalized]
      );
    };
    const handleAddedToChannel = (payload) => {
      const name = payload?.channel?.name ?? "a channel";
      setNotifications((prev) => [
        { id: `${Date.now()}-${name}`, text: `You were added to #${name}` },
        ...prev,
      ]);
      fetchChannels()
        .then((data) => setChannels(data))
        .catch(() => {});
    };
    const handleUserTyping = ({ userId, name }) => {
      if (!userId || userId === currentUserIdRef.current) return;
      if (typingTimeoutsRef.current[userId]) {
        clearTimeout(typingTimeoutsRef.current[userId]);
      }
      setTypingUsers((prev) =>
        prev.some((u) => u.userId === userId)
          ? prev.map((u) => (u.userId === userId ? { userId, name } : u))
          : [...prev, { userId, name }]
      );
      typingTimeoutsRef.current[userId] = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
      }, 3500);
    };
    const handleUserStoppedTyping = ({ userId }) => {
      if (typingTimeoutsRef.current[userId]) {
        clearTimeout(typingTimeoutsRef.current[userId]);
        delete typingTimeoutsRef.current[userId];
      }
      setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
    };
    const handleReactionUpdated = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, reactions: reactions ?? [] } : m
        )
      );
    };

    socket.on("authenticated", handleAuthenticated);
    socket.on("new_message", handleNewMessage);
    socket.on("added_to_channel", handleAddedToChannel);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stopped_typing", handleUserStoppedTyping);
    socket.on("reaction_updated", handleReactionUpdated);

    return () => {
      socket.off("authenticated", handleAuthenticated);
      socket.off("new_message", handleNewMessage);
      socket.off("added_to_channel", handleAddedToChannel);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stopped_typing", handleUserStoppedTyping);
      socket.off("reaction_updated", handleReactionUpdated);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchChannels()
      .then((data) => {
        if (cancelled) return;
        setChannels(data);
        setStatus("ready");
        handleSelectChannel(data[0]?.id ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMessage(err.message);
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, handleSelectChannel]);

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
    setIsCreatingChannel(false);
    handleSelectChannel(channel.id);
  };

  const handleDeleteChannel = async (channelId) => {
    await deleteChannel(channelId);
    const nextChannels = channels.filter((channel) => channel.id !== channelId);
    setChannels(nextChannels);
    if (selectedChannelId === channelId) {
      handleSelectChannel(nextChannels[0]?.id ?? null);
    }
  };

  let content;
  if (status === "loading") {
    content = <LoadingState />;
  } else if (status === "error") {
    content = <ErrorState message={errorMessage} onRetry={handleRetry} />;
  } else if (!selectedChannel) {
    content = <EmptyState onCreateChannel={() => setIsCreatingChannel(true)} />;
  } else {
    content = (
      <ChannelView
        channel={selectedChannel}
        messages={messages}
        currentUserId={currentUserId}
        typingUsers={typingUsers}
        onToggleReaction={handleToggleReaction}
      />
    );
  }

  return (
    <main className="flex h-screen min-w-[1024px] overflow-hidden bg-white font-[Inter,system-ui,sans-serif] text-gray-900">
      <IconRail />
      <Sidebar
        channels={channels}
        selectedChannelId={selectedChannelId}
        onSelectChannel={handleSelectChannel}
        isCreatingChannel={isCreatingChannel}
        onToggleCreate={handleToggleCreate}
        onCreateChannel={handleCreateChannel}
        searchQuery={searchQuery}
      />
      <section className="flex h-full min-w-0 min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <TopBar
          onLogout={handleLogout}
          channelName={selectedChannel?.name}
          onOpenSettings={() => setIsSettingsOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          notificationCount={notifications.length}
          onToggleNotifications={() => setIsNotificationsOpen((value) => !value)}
        />
        {content}
        {selectedChannel && (
          <>
            {sendError && (
              <p className="px-8 pb-1 text-xs text-red-500">{sendError}</p>
            )}
            <Composer
              channelName={selectedChannel.name}
              value={messageDraft}
              onChange={handleMessageChange}
              onSend={handleSendMessage}
            />
          </>
        )}
      </section>

      {isSettingsOpen && (
        <SettingsPanel
          channels={channels}
          currentUserId={currentUserId}
          onClose={() => setIsSettingsOpen(false)}
          onDeleteChannel={handleDeleteChannel}
        />
      )}

      {isNotificationsOpen && (
        <NotificationsPanel
          notifications={notifications}
          onClose={() => setIsNotificationsOpen(false)}
          onClear={() => setNotifications([])}
        />
      )}
    </main>
  );
}
