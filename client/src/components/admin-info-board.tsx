import { useState, useEffect } from "react";
import { Lock, Unlock, Edit3, Save, Plus, Trash2, Link, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ADMIN_PIN = "3232";
const STORAGE_KEY = "sd_dispatch_admin_board";

interface AdminCard {
  id: string;
  type: "text" | "link" | "announcement";
  title: string;
  content: string;
  url?: string;
  color: string;
  pinned: boolean;
}

function loadCards(): AdminCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [
    {
      id: "welcome",
      type: "announcement",
      title: "Welcome",
      content: "This is the SD Dispatch Monitor. Live fire and police dispatch data for San Diego. Use the filters and bookmarks to track calls that matter to you.",
      color: "blue",
      pinned: true,
    },
  ];
}

function saveCards(cards: AdminCard[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cards)); } catch {}
}

const COLOR_OPTIONS = [
  { value: "blue", label: "Blue", cls: "bg-blue-500/20 border-blue-500/30 text-blue-400" },
  { value: "green", label: "Green", cls: "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" },
  { value: "amber", label: "Amber", cls: "bg-amber-500/20 border-amber-500/30 text-amber-400" },
  { value: "red", label: "Red", cls: "bg-red-500/20 border-red-500/30 text-red-400" },
  { value: "purple", label: "Purple", cls: "bg-purple-500/20 border-purple-500/30 text-purple-400" },
  { value: "slate", label: "Slate", cls: "bg-slate-500/20 border-slate-500/30 text-slate-400" },
];

function getColorClass(color: string) {
  return COLOR_OPTIONS.find(c => c.value === color)?.cls || COLOR_OPTIONS[0].cls;
}

export function AdminInfoBoard() {
  const [cards, setCards] = useState<AdminCard[]>(loadCards);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCard, setNewCard] = useState<Partial<AdminCard>>({ type: "text", color: "blue", title: "", content: "" });

  const persistCards = (updated: AdminCard[]) => {
    setCards(updated);
    saveCards(updated);
  };

  const handlePinSubmit = () => {
    if (pinInput === ADMIN_PIN) {
      setIsUnlocked(true);
      setPinInput("");
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput("");
      setTimeout(() => setPinError(false), 2000);
    }
  };

  const handleSaveEdit = (id: string, updates: Partial<AdminCard>) => {
    persistCards(cards.map(c => c.id === id ? { ...c, ...updates } : c));
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    persistCards(cards.filter(c => c.id !== id));
  };

  const handleAddCard = () => {
    if (!newCard.title?.trim()) return;
    const card: AdminCard = {
      id: `card-${Date.now()}`,
      type: newCard.type as AdminCard["type"] || "text",
      title: newCard.title || "Untitled",
      content: newCard.content || "",
      url: newCard.url,
      color: newCard.color || "blue",
      pinned: false,
    };
    persistCards([card, ...cards]);
    setNewCard({ type: "text", color: "blue", title: "", content: "" });
    setShowAddForm(false);
  };

  const sorted = [...cards].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground">Info Board</span>
          {isUnlocked && <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-emerald-500/30 text-emerald-400">ADMIN</Badge>}
        </div>
        {isUnlocked ? (
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-primary" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={() => setIsUnlocked(false)}>
              <Lock className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-muted-foreground" onClick={() => setIsUnlocked(!isUnlocked)}>
            <Unlock className="w-3.5 h-3.5" /> Edit
          </Button>
        )}
      </div>

      {/* PIN entry */}
      {!isUnlocked && (
        <div className="px-4 pt-3 pb-2">
          <div className="flex gap-2">
            <Input
              type="password"
              maxLength={4}
              placeholder="Admin PIN..."
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
              className={cn("h-8 text-sm bg-accent/20 border-white/10 font-mono", pinError && "border-destructive animate-pulse")}
            />
            <Button size="sm" variant="outline" className="h-8 border-white/10" onClick={handlePinSubmit}>
              <Unlock className="w-3.5 h-3.5" />
            </Button>
          </div>
          {pinError && <p className="text-xs text-destructive mt-1 font-mono">Incorrect PIN</p>}
        </div>
      )}

      {/* Add card form */}
      {isUnlocked && showAddForm && (
        <div className="mx-4 mt-3 p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
          <div className="flex gap-2">
            <select
              value={newCard.type}
              onChange={(e) => setNewCard({ ...newCard, type: e.target.value as any })}
              className="text-xs bg-accent/30 border border-white/10 rounded-md px-2 py-1 text-foreground"
            >
              <option value="text">Text</option>
              <option value="link">Link</option>
              <option value="announcement">Announcement</option>
            </select>
            <div className="flex gap-1">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setNewCard({ ...newCard, color: c.value })}
                  className={cn("w-5 h-5 rounded-full border-2 transition-all", `bg-${c.value}-500/60`, newCard.color === c.value ? "border-white scale-110" : "border-transparent")}
                />
              ))}
            </div>
          </div>
          <Input
            placeholder="Title..."
            value={newCard.title}
            onChange={(e) => setNewCard({ ...newCard, title: e.target.value })}
            className="h-8 text-sm bg-accent/20 border-white/10"
          />
          <Textarea
            placeholder="Content..."
            value={newCard.content}
            onChange={(e) => setNewCard({ ...newCard, content: e.target.value })}
            className="text-sm bg-accent/20 border-white/10 min-h-[60px] resize-none"
          />
          {newCard.type === "link" && (
            <Input
              placeholder="https://..."
              value={newCard.url || ""}
              onChange={(e) => setNewCard({ ...newCard, url: e.target.value })}
              className="h-8 text-sm bg-accent/20 border-white/10 font-mono"
            />
          )}
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleAddCard}>
              <Save className="w-3 h-3 mr-1" /> Save Card
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Cards */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pt-3 space-y-3">
        {sorted.map(card => (
          <AdminCardView
            key={card.id}
            card={card}
            isUnlocked={isUnlocked}
            isEditing={editingId === card.id}
            onEdit={() => setEditingId(card.id)}
            onSave={(updates) => handleSaveEdit(card.id, updates)}
            onDelete={() => handleDelete(card.id)}
            onCancelEdit={() => setEditingId(null)}
          />
        ))}
      </div>
    </div>
  );
}

function AdminCardView({
  card, isUnlocked, isEditing, onEdit, onSave, onDelete, onCancelEdit
}: {
  card: AdminCard;
  isUnlocked: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (updates: Partial<AdminCard>) => void;
  onDelete: () => void;
  onCancelEdit: () => void;
}) {
  const [editTitle, setEditTitle] = useState(card.title);
  const [editContent, setEditContent] = useState(card.content);
  const [editUrl, setEditUrl] = useState(card.url || "");
  const [editColor, setEditColor] = useState(card.color);

  useEffect(() => {
    setEditTitle(card.title);
    setEditContent(card.content);
    setEditUrl(card.url || "");
    setEditColor(card.color);
  }, [card]);

  const colorClass = getColorClass(card.color);
  const typeIcon = card.type === "link" ? <Link className="w-3 h-3" /> : card.type === "announcement" ? <Shield className="w-3 h-3" /> : <FileText className="w-3 h-3" />;

  if (isEditing) {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
        <div className="flex gap-1 mb-1">
          {COLOR_OPTIONS.map(c => (
            <button
              key={c.value}
              onClick={() => setEditColor(c.value)}
              className={cn("w-5 h-5 rounded-full border-2 transition-all", `bg-${c.value}-500/60`, editColor === c.value ? "border-white scale-110" : "border-transparent")}
            />
          ))}
        </div>
        <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-8 text-sm bg-accent/20 border-white/10 font-bold" />
        <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="text-sm bg-accent/20 border-white/10 min-h-[60px] resize-none" />
        {card.type === "link" && (
          <Input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} className="h-8 text-sm bg-accent/20 border-white/10 font-mono" placeholder="https://..." />
        )}
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => onSave({ title: editTitle, content: editContent, url: editUrl || undefined, color: editColor })}>
            <Save className="w-3 h-3 mr-1" /> Save
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={onCancelEdit}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border p-3 relative group transition-all", colorClass)}>
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          {typeIcon}
          <span>{card.title}</span>
          {card.pinned && <span className="text-[9px] opacity-50">PINNED</span>}
        </div>
        {isUnlocked && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-0.5 hover:text-primary text-muted-foreground transition-colors">
              <Edit3 className="w-3 h-3" />
            </button>
            <button onClick={onDelete} className="p-0.5 hover:text-destructive text-muted-foreground transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
      <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">{card.content}</p>
      {card.type === "link" && card.url && (
        <a
          href={card.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center gap-1 text-xs font-mono hover:underline opacity-70 hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <Link className="w-3 h-3" />
          {card.url.replace(/^https?:\/\//, "")}
        </a>
      )}
    </div>
  );
}
