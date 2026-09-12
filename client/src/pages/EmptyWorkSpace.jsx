import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearToken } from "../utils/storage";
import {
  fetchChannels,
  createChannel,
  deleteChannel,
  getChannelMembers,
  uploadChannelFile,
  getChannelFileUrl,
} from "../api/channels";
import { createInvite, acceptInvite } from "../api/invites";
import { fetchMessages, fetchReplies } from "../api/messages";
import {
  fetchConversations,
  createConversation,
  fetchDirectMessages,
} from "../api/dms";
import { fetchUsers } from "../api/users";
import { searchMessages } from "../api/search";
import { getCurrentSession } from "../api/auth";
import { getSocket } from "../lib/socket";
import Spinner from "../components/Spinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCommentDots,
  faPlus,
  faHashtag,
  faUserPlus,
  faPaperPlane,
  faPaperclip,
  faFaceSmile,
  faPen,
  faTrash,
  faCheck,
  faXmark,
  faRightFromBracket,
  faGear,
  faUsers,
  faLink,
  faMagnifyingGlass,
  faReply,
} from "@fortawesome/free-solid-svg-icons";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "🎉", "😮", "😢"];
const AVATAR_COLORS = ["#3d0e38", "#e08a1e", "#5b4fd6", "#0e7c66", "#b33a3a", "#2563eb"];

function colorForId(id) {
  const s = String(id ?? "");
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initialsFor(name) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatBytes(bytes) {
  const n = Number(bytes);
  if (!n || Number.isNaN(n)) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// The people in a DM other than the current user — what the conversation is
// labeled by in the sidebar and header.
function dmOthers(conversation, currentUserId) {
  return (conversation?.members ?? []).filter((member) => member.id !== currentUserId);
}

function dmTitle(conversation, currentUserId) {
  const others = dmOthers(conversation, currentUserId);
  if (others.length === 0) return "Direct message";
  if (others.length === 1) return others[0].name || others[0].email || "Direct message";
  return others.map((member) => member.name || member.email || "User").join(", ");
}

// Pull the invite code out of whatever the user pasted — a full link
// ("http://localhost:5173/join/abc123"), a path ("/join/abc123"), or a bare code.
function extractInviteCode(raw) {
  const value = String(raw ?? "").trim();
  if (!value) return "";

  try {
    const url = new URL(value);
    const segments = url.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (last) return last;
  } catch {
    // Not an absolute URL — fall through to the path-segment split.
  }

  const segments = value.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "";
}

function Avatar({ name, id, size = "md" }) {
  const dims = size === "sm" ? "h-6 w-6 text-[9px]" : "h-8 w-8 text-xs";
  return (
    <span
      className={`${dims} flex shrink-0 items-center justify-center rounded-full font-semibold text-white`}
      style={{ backgroundColor: colorForId(id) }}
    >
      {initialsFor(name)}
    </span>
  );
}

function ReactionChip({ reaction, me, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`reaction-pop inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition ${
        me ? "bg-lime/40 text-plum" : "bg-black/5 text-plum hover:bg-black/10"
      }`}
    >
      <span>{reaction.emoji}</span>
      <span>{reaction.count}</span>
    </button>
  );
}

function FileAttachment({ channelId, message }) {
  const [imageUrl, setImageUrl] = useState(null);
  const isImage = (message.file_type ?? "").startsWith("image/");

  useEffect(() => {
    if (!isImage) return;
    let cancelled = false;
    getChannelFileUrl(channelId, message.file_path)
      .then((url) => {
        if (!cancelled) setImageUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [channelId, message.file_path, isImage]);

  const open = async () => {
    try {
      const url = await getChannelFileUrl(channelId, message.file_path);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      // Ignore; a stale/failed signed URL shouldn't crash the view.
    }
  };

  if (isImage && imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={message.file_name ?? "attachment"}
        className="mt-2 max-h-64 rounded-lg"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      className="mt-2 flex items-center gap-2 rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-left text-xs transition hover:bg-white"
    >
      <FontAwesomeIcon icon={faPaperclip} className="h-3.5 w-3.5 text-plum/60" />
      <span className="font-medium text-plum">{message.file_name ?? "Attachment"}</span>
      {message.file_size ? (
        <span className="text-plum/50">{formatBytes(message.file_size)}</span>
      ) : null}
    </button>
  );
}

const MessageRow = memo(function MessageRow({
  message,
  channelId,
  own,
  currentUserId,
  onToggleReaction,
  onEditMessage,
  onDeleteMessage,
  onOpenThread,
  onStartDm,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerUp, setPickerUp] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content ?? "");
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileUp, setProfileUp] = useState(false);
  const profileEnterRef = useRef(null);
  const profileLeaveRef = useRef(null);
  const reactions = message.reactions ?? [];
  const sender = message.sender_name ?? "";

  useEffect(
    () => () => {
      clearTimeout(profileEnterRef.current);
      clearTimeout(profileLeaveRef.current);
    },
    [],
  );

  // Hovering the avatar shows a profile popover after a short delay (so
  // scrolling past messages doesn't flicker popovers); clicking opens it
  // immediately for touch/keyboard. Your own messages don't show a "Message"
  // action, so we skip the popover for them.
  const openProfile = (e) => {
    if (own) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setProfileUp(rect.bottom + 150 > window.innerHeight);
    clearTimeout(profileLeaveRef.current);
    clearTimeout(profileEnterRef.current);
    setProfileOpen(true);
  };
  const scheduleProfileOpen = (e) => {
    if (own) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setProfileUp(rect.bottom + 150 > window.innerHeight);
    clearTimeout(profileLeaveRef.current);
    profileEnterRef.current = setTimeout(() => setProfileOpen(true), 250);
  };
  const scheduleProfileClose = () => {
    clearTimeout(profileEnterRef.current);
    profileLeaveRef.current = setTimeout(() => setProfileOpen(false), 150);
  };

  const submitEdit = () => {
    const content = editValue.trim();
    if (!content || content === (message.content ?? "").trim()) {
      setEditing(false);
      setEditValue(message.content ?? "");
      return;
    }
    onEditMessage(message.id, content);
    setEditing(false);
  };

  const openPicker = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // The picker needs ~48px above the button, but the top nav bar is 60px
    // tall. Near the top there's no room to open upward, so drop it below.
    setPickerUp(rect.top > 108);
    setPickerOpen((v) => !v);
  };

  return (
    <div className="group relative flex items-start gap-3 px-6 py-2 transition hover:bg-white/60">
      <span
        className="relative inline-flex shrink-0"
        onMouseEnter={scheduleProfileOpen}
        onMouseLeave={scheduleProfileClose}
        onClick={openProfile}
      >
        <Avatar name={sender} id={message.user_id} />
        {profileOpen && (
          <div
            className={`absolute left-0 z-30 ${
              profileUp ? "bottom-full pb-1" : "top-full pt-1"
            }`}
          >
            <div className="w-60 rounded-xl border border-black/10 bg-white p-3 shadow-2xl">
              <div className="flex items-center gap-3">
                <Avatar name={sender} id={message.user_id} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-plum">
                    {sender || "Unknown"}
                  </p>
                  <p className="text-xs text-plum/40">Direct message</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  onStartDm(message.user_id);
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-plum px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                <FontAwesomeIcon icon={faCommentDots} className="h-4 w-4" />
                Message
              </button>
            </div>
          </div>
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          {sender ? (
            <span className="font-semibold text-sm text-plum">{sender}</span>
          ) : null}
          <span className="text-xs text-plum/40">{formatTime(message.created_at)}</span>
        </div>

        {editing ? (
          <div className="mt-1 flex flex-col gap-1.5">
            <textarea
              rows={2}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitEdit();
                }
                if (e.key === "Escape") {
                  setEditing(false);
                  setEditValue(message.content ?? "");
                }
              }}
              autoFocus
              className="block w-full resize-none rounded-lg border border-plum/30 bg-white px-3 py-2 text-sm text-plum outline-none focus:border-plum focus:ring-2 focus:ring-plum/20"
            />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={submitEdit}
                disabled={!editValue.trim()}
                className="flex h-7 items-center gap-1 rounded-md bg-plum px-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setEditValue(message.content ?? "");
                }}
                className="rounded-md px-2 py-1 text-xs font-medium text-plum/60 transition hover:bg-black/5 hover:text-plum"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {message.content ? (
              <p className="mt-0.5 break-words text-sm text-plum">{message.content}</p>
            ) : null}
            {message.file_path ? (
              <FileAttachment channelId={channelId} message={message} />
            ) : null}
          </>
        )}

        {reactions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
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

      <div className="flex shrink-0 items-center gap-0.5 self-start opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          aria-label="Reply in thread"
          title="Reply in thread"
          onClick={() => onOpenThread(message)}
          className="flex h-7 w-7 items-center justify-center rounded-full text-plum/40 transition hover:bg-black/5 hover:text-plum"
        >
          <FontAwesomeIcon icon={faReply} className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Add reaction"
          onClick={openPicker}
          className="flex h-7 w-7 items-center justify-center rounded-full text-plum/40 transition hover:bg-black/5 hover:text-plum"
        >
          <FontAwesomeIcon icon={faFaceSmile} className="h-4 w-4" />
        </button>
        {own && (
          <>
            <button
              type="button"
              aria-label="Edit message"
              onClick={() => {
                setEditValue(message.content ?? "");
                setEditing(true);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full text-plum/40 transition hover:bg-black/5 hover:text-plum"
            >
              <FontAwesomeIcon icon={faPen} className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Delete message"
              onClick={() => onDeleteMessage(message.id)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-plum/40 transition hover:bg-red-50 hover:text-red-600"
            >
              <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {pickerOpen && (
        <div className={`absolute right-8 z-20 flex gap-1 rounded-full border border-black/10 bg-white p-1 shadow-lg ${pickerUp ? "top-0 -translate-y-12" : "top-7"}`}>
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onToggleReaction(message.id, emoji);
                setPickerOpen(false);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full text-base transition hover:bg-black/5"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

function MessageList({
  messages,
  channelId,
  currentUserId,
  onToggleReaction,
  onEditMessage,
  onDeleteMessage,
  onOpenThread,
  onStartDm,
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-plum/40">
        No messages yet. Start the conversation.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-0 flex-1 overflow-y-auto py-4">
      {messages.map((message) => (
        <MessageRow
          key={message.id}
          message={message}
          channelId={channelId}
          own={message.user_id === currentUserId}
          currentUserId={currentUserId}
          onToggleReaction={onToggleReaction}
          onEditMessage={onEditMessage}
          onDeleteMessage={onDeleteMessage}
          onOpenThread={onOpenThread}
          onStartDm={onStartDm}
        />
      ))}
    </div>
  );
}

function TypingIndicator({ users }) {
  if (!users || users.length === 0) return null;
  const label =
    users.length === 1
      ? `${users[0].name || "Someone"} is typing`
      : "Several people are typing";

  return (
    <div className="flex h-6 shrink-0 items-center gap-2 px-6 text-xs text-plum/50">
      <span>{label}</span>
      <span className="flex items-center gap-0.5 text-plum/40" aria-hidden="true">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </span>
    </div>
  );
}

function MessageComposer({ channelName, onChange, onSend, onAttachFile }) {
  const fileInputRef = useRef(null);
  const [draft, setDraft] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);

  const handleChange = (value) => {
    setDraft(value);
    if (onChange) onChange(value);
  };

  const handleSend = () => {
    const content = draft.trim();
    if (!content) return;

    setDraft("");
    const result = onSend(content);
    if (result && typeof result.then === "function") {
      result.then((ok) => {
        if (ok === false) setDraft(content);
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onAttachFile) onAttachFile(file);
    e.target.value = "";
  };

  return (
    <section className="relative shrink-0 px-6 pb-5" aria-label="Message composer">
      <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2">
        <button
          type="button"
          aria-label="Add attachment"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-plum/50 transition hover:bg-black/5 hover:text-plum"
        >
          <FontAwesomeIcon icon={faPaperclip} className="h-4 w-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          type="text"
          value={draft}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={channelName ? `Message #${channelName}` : "Message"}
          className="flex-1 bg-transparent text-sm text-plum outline-none placeholder:text-plum/40"
        />
        <button
          type="button"
          aria-label="Add emoji"
          onClick={() => setEmojiOpen((v) => !v)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-plum/50 transition hover:bg-black/5 hover:text-plum"
        >
          <FontAwesomeIcon icon={faFaceSmile} className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleSend}
          disabled={!draft.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-plum text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FontAwesomeIcon icon={faPaperPlane} className="h-4 w-4" />
        </button>
      </div>

      {emojiOpen && (
        <div className="absolute bottom-16 right-6 z-20 flex gap-1 rounded-full border border-black/10 bg-white p-1.5 shadow-lg">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                handleChange(draft + emoji);
                setEmojiOpen(false);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-base transition hover:bg-black/5"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function InviteModal({ channel, onClose }) {
  const [link, setLink] = useState("");
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setPending(true);
    createInvite(channel.id)
      .then((data) => {
        if (cancelled) return;
        const code = data?.code;
        if (code) setLink(`${window.location.origin}/join/${code}`);
        else setError("Couldn't create an invite link.");
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [channel.id]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Couldn't copy to clipboard.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-plum/40" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl form-rise">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-plum">Invite to #{channel.name}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-plum/50 transition hover:bg-black/5 hover:text-plum"
          >
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-sm text-plum/60">
          Share this link — anyone who opens it can join the channel.
        </p>

        {pending ? (
          <div className="mt-5 flex items-center justify-center gap-2 py-4 text-sm text-plum/60">
            <Spinner /> Generating link…
          </div>
        ) : error ? (
          <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        ) : (
          <div className="mt-5 flex items-center gap-2 rounded-lg border border-black/10 bg-cream px-3 py-2">
            <FontAwesomeIcon icon={faLink} className="h-4 w-4 shrink-0 text-plum/50" />
            <span className="min-w-0 flex-1 truncate text-sm text-plum">{link}</span>
            <button
              type="button"
              onClick={copy}
              className="shrink-0 rounded-md bg-plum px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsPanel({ channels, currentUserId, onClose, onDeleteChannel, onLogout }) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-plum/40" onClick={onClose} aria-hidden="true" />
      <aside className="absolute inset-y-0 right-0 flex w-[320px] flex-col border-l border-black/10 bg-white shadow-xl">
        <header className="flex shrink-0 items-center justify-between border-b border-black/10 px-5 py-4">
          <h2 className="text-base font-semibold text-plum">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="flex h-8 w-8 items-center justify-center rounded-md text-plum/50 transition hover:bg-black/5 hover:text-plum"
          >
            <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-plum/50">Channels</h3>
          {channels.length === 0 ? (
            <p className="mt-2 text-sm text-plum/50">No channels to manage.</p>
          ) : (
            <ul className="mt-2 space-y-0.5">
              {channels.map((channel) => (
                <li
                  key={channel.id}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm text-plum">
                    <FontAwesomeIcon icon={faHashtag} className="h-3.5 w-3.5 shrink-0 text-plum/40" />
                    <span className="truncate">{channel.name}</span>
                  </span>
                  {channel.createdBy === currentUserId ? (
                    <button
                      type="button"
                      onClick={() => onDeleteChannel(channel.id)}
                      className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    >
                      Delete
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="shrink-0 border-t border-black/10 px-5 py-4">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-black/10 px-4 py-2.5 text-sm font-medium text-plum transition hover:bg-cream"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="h-4 w-4" />
            Log out
          </button>
        </footer>
      </aside>
    </div>
  );
}

function DmMessageList({ messages, members }) {
  const containerRef = useRef(null);

  const nameMap = useMemo(() => {
    const map = new Map();
    for (const member of members ?? []) {
      map.set(member.id, member.name || member.email || "User");
    }
    return map;
  }, [members]);

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-plum/40">
        No messages yet. Say hello!
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-0 flex-1 overflow-y-auto py-4">
      {messages.map((message) => {
        const senderName =
          message.sender_name ?? nameMap.get(message.user_id) ?? "Someone";
        return (
          <div
            key={message.id}
            className="flex items-start gap-3 px-6 py-2 transition hover:bg-white/60"
          >
            <Avatar name={senderName} id={message.user_id} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-plum">{senderName}</span>
                <span className="text-xs text-plum/40">{formatTime(message.created_at)}</span>
              </div>
              <p className="mt-0.5 break-words text-sm text-plum">{message.content}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DmComposer({ placeholder, onSend }) {
  const [draft, setDraft] = useState("");

  const handleSend = () => {
    const content = draft.trim();
    if (!content) return;

    setDraft("");
    const result = onSend(content);
    if (result && typeof result.then === "function") {
      result.then((ok) => {
        if (ok === false) setDraft(content);
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <section className="shrink-0 px-6 pb-5" aria-label="Direct message composer">
      <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Message"}
          className="flex-1 bg-transparent text-sm text-plum outline-none placeholder:text-plum/40"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!draft.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-plum text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FontAwesomeIcon icon={faPaperPlane} className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

function ThreadPanel({ message, replies, channelName, onClose, onSendReply }) {
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [replies]);

  const handleSend = () => {
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    onSendReply(content);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-plum/20" onClick={onClose} aria-hidden="true" />
      <aside className="absolute inset-y-0 right-0 flex w-[380px] flex-col border-l border-black/10 bg-white shadow-xl">
        <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-black/10 px-5">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-plum">Thread</h2>
            {channelName ? (
              <p className="truncate text-xs text-plum/50">#{channelName}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close thread"
            className="flex h-8 w-8 items-center justify-center rounded-md text-plum/50 transition hover:bg-black/5 hover:text-plum"
          >
            <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
          </button>
        </header>

        <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex items-start gap-3">
            <Avatar name={message.sender_name ?? ""} id={message.user_id} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-plum">{message.sender_name}</span>
                <span className="text-xs text-plum/40">{formatTime(message.created_at)}</span>
              </div>
              {message.content ? (
                <p className="mt-0.5 break-words text-sm text-plum">{message.content}</p>
              ) : null}
              {(message.reactions ?? []).length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {(message.reactions ?? []).map((reaction) => (
                    <span
                      key={reaction.emoji}
                      className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium text-plum"
                    >
                      <span>{reaction.emoji}</span>
                      <span>{reaction.count}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="my-4 flex items-center gap-2">
            <span className="text-xs font-medium text-plum/50">
              {replies.length === 1 ? "1 reply" : `${replies.length} replies`}
            </span>
            <span className="h-px flex-1 bg-black/10" />
          </div>

          {replies.length === 0 ? (
            <p className="py-4 text-center text-sm text-plum/40">No replies yet.</p>
          ) : (
            <div className="space-y-4">
              {replies.map((reply) => (
                <div key={reply.id} className="flex items-start gap-3">
                  <Avatar name={reply.sender_name ?? ""} id={reply.user_id} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-plum">{reply.sender_name}</span>
                      <span className="text-xs text-plum/40">{formatTime(reply.created_at)}</span>
                    </div>
                    <p className="mt-0.5 break-words text-sm text-plum">{reply.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-black/10 px-4 py-3">
          <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Reply to thread…"
              className="flex-1 bg-transparent text-sm text-plum outline-none placeholder:text-plum/40"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!draft.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-plum text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FontAwesomeIcon icon={faPaperPlane} className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function NewDmModal({ onClose, onStartDm }) {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchUsers()
      .then((list) => {
        if (!cancelled) setUsers(list ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Couldn't load people.");
      })
      .finally(() => {
        if (!cancelled) setPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = (users ?? []).filter((user) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (user.name ?? "").toLowerCase().includes(q) ||
      (user.email ?? "").toLowerCase().includes(q)
    );
  });

  const start = async (userId) => {
    if (busyId) return;
    setBusyId(userId);
    const result = await onStartDm(userId);
    setBusyId(null);
    if (result?.ok !== true) {
      setError(result?.message || "Couldn't start a conversation.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-plum/40" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl form-rise">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-plum">New direct message</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-plum/50 transition hover:bg-black/5 hover:text-plum"
          >
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </button>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people"
          autoFocus
          className="mt-4 w-full rounded-lg border border-black/10 bg-cream px-3 py-2 text-sm text-plum outline-none focus:border-plum focus:ring-2 focus:ring-plum/20"
        />

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <div className="mt-3 max-h-80 overflow-y-auto">
          {pending ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-plum/60">
              <Spinner /> Loading people…
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-plum/50">No one found.</p>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => start(user.id)}
                    disabled={busyId === user.id}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-cream disabled:opacity-60"
                  >
                    <Avatar name={user.name || user.email} id={user.id} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-plum">
                        {user.name || user.email || "User"}
                      </span>
                      {user.name && user.email ? (
                        <span className="block truncate text-xs text-plum/50">{user.email}</span>
                      ) : null}
                    </span>
                    {busyId === user.id ? <Spinner /> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchModal({ onClose, onOpenChannel }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const runSearch = async (raw) => {
    const q = (raw ?? query).trim();
    if (!q) {
      setResults(null);
      setError("");
      return;
    }
    setPending(true);
    setError("");
    try {
      const list = await searchMessages(q);
      setResults(list ?? []);
    } catch (err) {
      setError(err.message || "Search failed.");
      setResults([]);
    } finally {
      setPending(false);
    }
  };

  const open = (channelId) => {
    onClose();
    if (channelId) onOpenChannel(channelId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6 pt-24">
      <div className="absolute inset-0 bg-plum/40" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl form-rise">
        <div className="flex items-center gap-2 border-b border-black/10 px-4 py-3">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4 shrink-0 text-plum/40" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runSearch();
              }
              if (e.key === "Escape") onClose();
            }}
            placeholder="Search messages…"
            autoFocus
            className="flex-1 bg-transparent text-sm text-plum outline-none placeholder:text-plum/40"
          />
          <button
            type="button"
            onClick={() => runSearch()}
            className="shrink-0 rounded-md bg-plum px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
          >
            Search
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-plum/50 transition hover:bg-black/5 hover:text-plum"
          >
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {pending ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-plum/60">
              <Spinner /> Searching…
            </div>
          ) : error ? (
            <p className="py-6 text-center text-sm text-red-600">{error}</p>
          ) : results === null ? (
            <p className="py-6 text-center text-sm text-plum/50">
              Type to search messages across your channels.
            </p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-plum/50">No messages found.</p>
          ) : (
            <ul className="space-y-0.5">
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    onClick={() => open(result.channel_id)}
                    className="flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition hover:bg-cream"
                  >
                    <span className="flex items-center gap-1.5 text-xs font-medium text-plum/60">
                      <FontAwesomeIcon icon={faHashtag} className="h-3 w-3" />
                      {result.channel?.name ?? "Channel"}
                      <span className="text-plum/40">· {formatTime(result.created_at)}</span>
                    </span>
                    <span className="break-words text-sm text-plum">
                      {result.snippet || result.content}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Sidebar({
  channels,
  selectedChannelId,
  onSelectChannel,
  isCreatingChannel,
  onToggleCreate,
  onCreateChannel,
  onJoinChannel,
  conversations,
  selectedConversationId,
  onSelectConversation,
  onNewDm,
  currentUserId,
  currentUserName,
  currentUserEmail,
  onLogout,
}) {
  const [name, setName] = useState("");
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinValue, setJoinValue] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreateChannel(trimmed);
    setName("");
  };

  const submitJoin = async () => {
    const code = extractInviteCode(joinValue);
    if (!code) {
      setJoinError("Enter an invite link.");
      return;
    }
    setJoinBusy(true);
    setJoinError("");
    const result = await onJoinChannel(code);
    setJoinBusy(false);
    if (result?.ok) {
      setJoinValue("");
      setJoinOpen(false);
    } else {
      setJoinError(result?.message || "Couldn't join channel.");
    }
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-plum">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-lime">
          <FontAwesomeIcon icon={faCommentDots} className="h-3.5 w-3.5 text-plum" />
        </div>
        <span className="text-sm font-semibold text-white">Huddle</span>
      </div>

      <div className="mt-2 flex-1 overflow-y-auto px-2">
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] font-semibold tracking-wide text-white/50">
            CHANNELS
          </span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label="Join channel by link"
              title="Join channel by link"
              onClick={() => {
                setJoinOpen((v) => !v);
                setJoinError("");
              }}
              className="flex h-5 w-5 items-center justify-center rounded text-white/50 transition hover:bg-white/10 hover:text-white"
            >
              <FontAwesomeIcon icon={faLink} className="h-3 w-3" />
            </button>
            <button
              type="button"
              aria-label="Create channel"
              onClick={onToggleCreate}
              className="flex h-5 w-5 items-center justify-center rounded text-white/50 transition hover:bg-white/10 hover:text-white"
            >
              <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
            </button>
          </div>
        </div>

        {isCreatingChannel && (
          <div className="mt-1 flex items-center gap-1 px-1">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                if (e.key === "Escape") {
                  setName("");
                  onToggleCreate();
                }
              }}
              autoFocus
              placeholder="channel name"
              className="w-full rounded bg-white/10 px-2 py-1 text-xs text-white outline-none placeholder:text-white/40"
            />
            <button
              type="button"
              onClick={submit}
              disabled={!name.trim()}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-lime text-plum transition hover:opacity-90 disabled:opacity-40"
            >
              <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5" />
            </button>
          </div>
        )}

        {joinOpen && (
          <div className="mt-1 flex items-center gap-1 px-1">
            <input
              type="text"
              value={joinValue}
              onChange={(e) => setJoinValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitJoin();
                if (e.key === "Escape") {
                  setJoinValue("");
                  setJoinOpen(false);
                  setJoinError("");
                }
              }}
              autoFocus
              placeholder="Paste invite link"
              className="w-full rounded bg-white/10 px-2 py-1 text-xs text-white outline-none placeholder:text-white/40"
            />
            <button
              type="button"
              onClick={submitJoin}
              disabled={!joinValue.trim() || joinBusy}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-lime text-plum transition hover:opacity-90 disabled:opacity-40"
            >
              <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5" />
            </button>
          </div>
        )}
        {joinError && (
          <p className="mt-1 px-2 text-xs text-red-300">{joinError}</p>
        )}

        <ul className="mt-1 space-y-0.5">
          {channels.map((channel) => (
            <li key={channel.id}>
              <button
                type="button"
                onClick={() => onSelectChannel(channel.id)}
                className={`flex w-full items-center rounded px-2 py-1.5 text-sm transition ${
                  channel.id === selectedChannelId
                    ? "bg-white/10 font-semibold text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="truncate"># {channel.name}</span>
              </button>
            </li>
          ))}
          {channels.length === 0 && !isCreatingChannel && (
            <li className="px-2 py-1.5 text-sm text-white/40">
              No channels yet — create one.
            </li>
          )}
        </ul>

        <div className="mt-4 flex items-center justify-between px-2">
          <span className="text-[10px] font-semibold tracking-wide text-white/50">
            DIRECT MESSAGES
          </span>
          <button
            type="button"
            aria-label="New direct message"
            title="New direct message"
            onClick={onNewDm}
            className="flex h-5 w-5 items-center justify-center rounded text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
          </button>
        </div>

        <ul className="mt-1 space-y-0.5">
          {conversations.map((conversation) => {
            const others = dmOthers(conversation, currentUserId);
            const name = dmTitle(conversation, currentUserId);
            const avatar = others[0];
            return (
              <li key={conversation.id}>
                <button
                  type="button"
                  onClick={() => onSelectConversation(conversation.id)}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition ${
                    conversation.id === selectedConversationId
                      ? "bg-white/10 font-semibold text-white"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-[9px] font-semibold text-white">
                    {initialsFor(avatar?.name || name)}
                  </span>
                  <span className="truncate">{name}</span>
                </button>
              </li>
            );
          })}
          {conversations.length === 0 && (
            <li className="px-2 py-1.5 text-sm text-white/40">
              No direct messages yet.
            </li>
          )}
        </ul>
      </div>

      <div className="shrink-0 border-t border-white/10 px-2 py-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-white/5">
          <Avatar name={currentUserName || "You"} id={currentUserId} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {currentUserName || "You"}
            </p>
            {currentUserEmail ? (
              <p className="truncate text-xs text-white/50">{currentUserEmail}</p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Log out"
            title="Log out"
            onClick={onLogout}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [memberCount, setMemberCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserName, setCurrentUserName] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [sendError, setSendError] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [directMessages, setDirectMessages] = useState([]);
  const [newDmOpen, setNewDmOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [threadMessage, setThreadMessage] = useState(null);
  const [threadReplies, setThreadReplies] = useState([]);
  const currentChannelRef = useRef(null);
  const currentConversationRef = useRef(null);
  const currentUserIdRef = useRef(null);
  const threadParentIdRef = useRef(null);
  const typingAtRef = useRef(0);
  const typingTimerRef = useRef(null);
  const typingTimeoutsRef = useRef({});

  const handleSelectChannel = useCallback((channelId) => {
    if (!channelId || channelId === currentChannelRef.current) return;

    const socket = getSocket();

    // Leave any open DM conversation before switching to a channel.
    const previousDm = currentConversationRef.current;
    if (previousDm) {
      socket.emit("leave_dm", { conversationId: previousDm });
    }
    currentConversationRef.current = null;
    setSelectedConversationId(null);
    setDirectMessages([]);

    const previous = currentChannelRef.current;
    if (previous) {
      socket.emit("leave_channel", { channelId: previous });
    }

    currentChannelRef.current = channelId;
    setSelectedChannelId(channelId);
    setMessages([]);
    setMembers([]);
    setMemberCount(0);
    setTypingUsers([]);
    setThreadMessage(null);
    threadParentIdRef.current = null;
    setThreadReplies([]);
    setSendError("");

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

    getChannelMembers(channelId)
      .then(({ members, memberCount }) => {
        setMembers(members ?? []);
        setMemberCount(memberCount ?? 0);
      })
      .catch(() => {
        setMembers([]);
        setMemberCount(0);
      });

    socket.emit("join_channel", { channelId }, (ack) => {
      if (ack?.event === "error") {
        setSendError(ack.message || "Couldn't join channel.");
      }
    });
  }, []);

  const handleSelectConversation = useCallback((conversationId) => {
    if (!conversationId || conversationId === currentConversationRef.current) return;

    const socket = getSocket();

    // Leave any open channel before switching to a DM.
    const previousChannel = currentChannelRef.current;
    if (previousChannel) {
      socket.emit("leave_channel", { channelId: previousChannel });
    }
    currentChannelRef.current = null;
    setSelectedChannelId(null);
    setMessages([]);
    setMembers([]);
    setMemberCount(0);
    setTypingUsers([]);

    const previousDm = currentConversationRef.current;
    if (previousDm) {
      socket.emit("leave_dm", { conversationId: previousDm });
    }

    currentConversationRef.current = conversationId;
    setSelectedConversationId(conversationId);
    setDirectMessages([]);
    setThreadMessage(null);
    threadParentIdRef.current = null;
    setThreadReplies([]);
    setSendError("");

    fetchDirectMessages(conversationId)
      .then((list) => setDirectMessages(list ?? []))
      .catch(() => setDirectMessages([]));

    socket.emit("join_dm", { conversationId }, (ack) => {
      if (ack?.event === "error") {
        setSendError(ack.message || "Couldn't open conversation.");
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

  const handleToggleReaction = useCallback((messageId, emoji) => {
    const channelId = currentChannelRef.current;
    if (!channelId || !messageId || !emoji) return;
    getSocket().emit("toggle_reaction", { channelId, messageId, emoji }, (ack) => {
      if (ack?.event === "error") {
        setSendError(ack.message || "Couldn't react.");
      }
    });
  }, []);

  const handleSendMessage = (content) => {
    const channelId = currentChannelRef.current;
    if (!content || !channelId) return Promise.resolve(true);

    setSendError("");
    stopTyping();

    return new Promise((resolve) => {
      getSocket().emit("send_message", { channelId, content }, (ack) => {
        if (ack?.event === "error") {
          setSendError(ack.message || "Failed to send message.");
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  };

  const handleEditMessage = useCallback((messageId, content) => {
    const channelId = currentChannelRef.current;
    if (!channelId || !messageId || !content.trim()) return;
    getSocket().emit("edit_message", { channelId, messageId, content }, (ack) => {
      if (ack?.event === "error") {
        setSendError(ack.message || "Couldn't edit message.");
      }
    });
  }, []);

  const handleDeleteMessage = useCallback((messageId) => {
    const channelId = currentChannelRef.current;
    if (!channelId || !messageId) return;
    getSocket().emit("delete_message", { channelId, messageId }, (ack) => {
      if (ack?.event === "error") {
        setSendError(ack.message || "Couldn't delete message.");
      }
    });
  }, []);

  const handleSendFile = async (file) => {
    const channelId = currentChannelRef.current;
    if (!channelId || !file) return;

    setSendError("");
    try {
      const uploaded = await uploadChannelFile(channelId, file);
      getSocket().emit(
        "send_message",
        {
          channelId,
          content: "",
          filePath: uploaded.file_path,
          fileName: uploaded.file_name,
          fileType: uploaded.file_type,
          fileSize: uploaded.file_size,
        },
        (ack) => {
          if (ack?.event === "error") {
            setSendError(ack.message || "Failed to send file.");
          }
        }
      );
    } catch (err) {
      setSendError(err.message || "Failed to send file.");
    }
  };

  const handleSendDm = (content) => {
    const conversationId = currentConversationRef.current;
    if (!content || !conversationId) return Promise.resolve(true);

    setSendError("");

    return new Promise((resolve) => {
      getSocket().emit("send_dm", { conversationId, content }, (ack) => {
        if (ack?.event === "error") {
          setSendError(ack.message || "Failed to send message.");
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  };

  const handleStartDm = async (userId) => {
    if (!userId) return { ok: false, message: "Select someone to message." };
    try {
      const conversation = await createConversation([userId]);
      const list = await fetchConversations();
      setConversations(list);
      if (conversation?.id) {
        setNewDmOpen(false);
        handleSelectConversation(conversation.id);
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.message || "Couldn't start a conversation." };
    }
  };

  const handleOpenThread = useCallback((message) => {
    if (!message?.id) return;
    setThreadMessage(message);
    threadParentIdRef.current = message.id;
    setThreadReplies([]);
    fetchReplies(message.id)
      .then((list) => setThreadReplies(list ?? []))
      .catch(() => setThreadReplies([]));
  }, []);

  const handleCloseThread = useCallback(() => {
    setThreadMessage(null);
    threadParentIdRef.current = null;
    setThreadReplies([]);
  }, []);

  const handleSendReply = (content) => {
    const parentId = threadParentIdRef.current;
    if (!parentId || !content?.trim()) return;
    getSocket().emit("send_reply", { messageId: parentId, content }, (ack) => {
      if (ack?.event === "error") {
        setSendError(ack.message || "Failed to send reply.");
      }
    });
  };

  useEffect(() => {
    const socket = getSocket();

    const handleAuthenticated = ({ userId, name }) => {
      currentUserIdRef.current = userId;
      setCurrentUserId(userId);
      if (name) setCurrentUserName(name);
    };
    const handleNewMessage = (message) => {
      if (message?.channel_id !== currentChannelRef.current) return;
      const normalized = { ...message, reactions: message.reactions ?? [] };
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, normalized]
      );
    };
    const handleAddedToChannel = () => {
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
    const handleMessageEdited = (message) => {
      if (message?.channel_id !== currentChannelRef.current) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id ? { ...m, content: message.content } : m
        )
      );
    };
    const handleMessageDeleted = ({ messageId, channelId }) => {
      if (channelId !== currentChannelRef.current) return;
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    };
    const handleNewDm = (message) => {
      const conversationId = message?.conversation_id;
      if (!conversationId) return;

      // Keep the sidebar conversation list ordered by latest message.
      setConversations((prev) => {
        const target = prev.find((c) => c.id === conversationId);
        if (!target) return prev;
        const updated = { ...target, last_message: message };
        return [updated, ...prev.filter((c) => c.id !== conversationId)];
      });

      if (conversationId === currentConversationRef.current) {
        setDirectMessages((prev) =>
          prev.some((m) => m.id === message.id) ? prev : [...prev, message]
        );
      }
    };
    const handleReplyCreated = (reply) => {
      // Only append when the reply belongs to the thread that's currently open.
      if (!reply || reply.parent_id !== threadParentIdRef.current) return;
      setThreadReplies((prev) =>
        prev.some((r) => r.id === reply.id) ? prev : [...prev, reply]
      );
    };
    // The gateway emits an `error` event (not an ack) for failures — surface it.
    const handleError = (payload) => {
      const message =
        typeof payload === "string"
          ? payload
          : payload?.message || "Something went wrong.";
      setSendError(message);
    };

    socket.on("authenticated", handleAuthenticated);
    socket.on("new_message", handleNewMessage);
    socket.on("new_dm", handleNewDm);
    socket.on("reply_created", handleReplyCreated);
    socket.on("added_to_channel", handleAddedToChannel);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stopped_typing", handleUserStoppedTyping);
    socket.on("reaction_updated", handleReactionUpdated);
    socket.on("message_edited", handleMessageEdited);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("error", handleError);

    return () => {
      socket.off("authenticated", handleAuthenticated);
      socket.off("new_message", handleNewMessage);
      socket.off("new_dm", handleNewDm);
      socket.off("reply_created", handleReplyCreated);
      socket.off("added_to_channel", handleAddedToChannel);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stopped_typing", handleUserStoppedTyping);
      socket.off("reaction_updated", handleReactionUpdated);
      socket.off("message_edited", handleMessageEdited);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("error", handleError);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      // Run the session check and the channel fetch in parallel — they're
      // independent, so awaiting them sequentially just doubles the wait.
      const sessionPromise = getCurrentSession()
        .then(({ user }) => {
          if (!cancelled && user) {
            currentUserIdRef.current = user.id;
            setCurrentUserId(user.id);
            const name = user?.user_metadata?.name ?? user?.email ?? "";
            if (name) setCurrentUserName(name);
            if (user?.email) setCurrentUserEmail(user.email);
          }
        })
        .catch(() => {
          // Socket `authenticated` will set the id as a fallback.
        });

      const channelsPromise = fetchChannels()
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

      const conversationsPromise = fetchConversations()
        .then((data) => {
          if (!cancelled) setConversations(data ?? []);
        })
        .catch(() => {
          // DMs are non-critical; an empty list just hides the section.
        });

      await Promise.all([sessionPromise, channelsPromise, conversationsPromise]);
    }

    boot();

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

  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedConversationId) ??
    null;

  const handleLogout = () => {
    clearToken();
    navigate("/");
  };

  const handleToggleCreate = () => setIsCreatingChannel((v) => !v);

  const handleCreateChannel = async (name) => {
    const channel = await createChannel(name);
    setChannels((prev) => [...prev, channel]);
    setIsCreatingChannel(false);
    handleSelectChannel(channel.id);
  };

  const handleJoinChannel = async (code) => {
    if (!code) return { ok: false, message: "Enter an invite link." };
    try {
      const { channel } = await acceptInvite(code);
      const list = await fetchChannels();
      setChannels(list);
      if (channel?.id) handleSelectChannel(channel.id);
      return { ok: true };
    } catch (err) {
      if (err?.status === 409) {
        // Already a member — refresh so the channel shows, and treat as success.
        const list = await fetchChannels();
        setChannels(list);
        return { ok: true };
      }
      return { ok: false, message: err.message || "Couldn't join channel." };
    }
  };

  const handleDeleteChannel = async (channelId) => {
    await deleteChannel(channelId);
    const nextChannels = channels.filter((channel) => channel.id !== channelId);
    setChannels(nextChannels);
    if (selectedChannelId === channelId) {
      handleSelectChannel(nextChannels[0]?.id ?? null);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-cream">
        <Spinner className="h-8 w-8 text-plum" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-cream px-6 text-center">
        <p className="text-plum/70">{errorMessage}</p>
        <button
          type="button"
          onClick={handleRetry}
          className="rounded-lg bg-plum px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-cream font-sans text-plum">
      <Sidebar
        channels={channels}
        selectedChannelId={selectedChannelId}
        onSelectChannel={handleSelectChannel}
        isCreatingChannel={isCreatingChannel}
        onToggleCreate={handleToggleCreate}
        onCreateChannel={handleCreateChannel}
        onJoinChannel={handleJoinChannel}
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        onSelectConversation={handleSelectConversation}
        onNewDm={() => setNewDmOpen(true)}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserEmail={currentUserEmail}
        onLogout={handleLogout}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-black/10 bg-white px-6">
          <div className="flex min-w-0 items-center gap-2">
            {selectedConversation ? (
              <>
                <Avatar
                  name={dmTitle(selectedConversation, currentUserId)}
                  id={dmOthers(selectedConversation, currentUserId)[0]?.id}
                  size="sm"
                />
                <span className="truncate font-semibold text-plum">
                  {dmTitle(selectedConversation, currentUserId)}
                </span>
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faHashtag} className="h-5 w-5 shrink-0 text-plum/40" />
                <span className="truncate font-semibold text-plum">
                  {selectedChannel?.name ?? ""}
                </span>
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {!selectedConversation && selectedChannel && (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {members.slice(0, 4).map((member) => (
                    <Avatar key={member.user_id} name={member.name} id={member.user_id} size="sm" />
                  ))}
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-plum/60">
                  <FontAwesomeIcon icon={faUsers} className="h-3.5 w-3.5" />
                  {memberCount}
                </span>
              </div>
            )}

            <button
              type="button"
              aria-label="Search messages"
              title="Search messages"
              onClick={() => setSearchOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-plum/60 transition hover:bg-cream hover:text-plum"
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4" />
            </button>

            {!selectedConversation && selectedChannel && (
              <button
                type="button"
                onClick={() => setInviting(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium text-plum transition hover:bg-cream"
              >
                <FontAwesomeIcon icon={faUserPlus} className="h-4 w-4" />
                Invite
              </button>
            )}

            <button
              type="button"
              aria-label="Settings"
              onClick={() => setSettingsOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-plum/60 transition hover:bg-cream hover:text-plum"
            >
              <FontAwesomeIcon icon={faGear} className="h-4 w-4" />
            </button>
          </div>
        </header>

        {sendError && (
          <div className="mx-6 mt-2 flex shrink-0 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            <span className="min-w-0 flex-1">{sendError}</span>
            <button
              type="button"
              onClick={() => setSendError("")}
              aria-label="Dismiss error"
              className="shrink-0 text-red-400 transition hover:text-red-600"
            >
              <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
            </button>
          </div>
        )}

        {selectedConversation ? (
          <>
            <DmMessageList
              messages={directMessages}
              members={selectedConversation.members ?? []}
            />
            <DmComposer
              placeholder={`Message ${dmTitle(selectedConversation, currentUserId)}`}
              onSend={handleSendDm}
            />
          </>
        ) : selectedChannel ? (
          <>
            <MessageList
              messages={messages}
              channelId={selectedChannel.id}
              currentUserId={currentUserId}
              onToggleReaction={handleToggleReaction}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onOpenThread={handleOpenThread}
              onStartDm={handleStartDm}
            />
            <TypingIndicator users={typingUsers} />
            <MessageComposer
              channelName={selectedChannel.name}
              onChange={handleMessageChange}
              onSend={handleSendMessage}
              onAttachFile={handleSendFile}
            />
          </>
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-plum/40">
            Create or select a channel to start chatting.
          </div>
        )}
      </main>

      {inviting && selectedChannel && (
        <InviteModal channel={selectedChannel} onClose={() => setInviting(false)} />
      )}

      {newDmOpen && (
        <NewDmModal onClose={() => setNewDmOpen(false)} onStartDm={handleStartDm} />
      )}

      {searchOpen && (
        <SearchModal onClose={() => setSearchOpen(false)} onOpenChannel={handleSelectChannel} />
      )}

      {threadMessage && (
        <ThreadPanel
          message={threadMessage}
          replies={threadReplies}
          channelName={selectedChannel?.name}
          onClose={handleCloseThread}
          onSendReply={handleSendReply}
        />
      )}

      {settingsOpen && (
        <SettingsPanel
          channels={channels}
          currentUserId={currentUserId}
          onClose={() => setSettingsOpen(false)}
          onDeleteChannel={handleDeleteChannel}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
