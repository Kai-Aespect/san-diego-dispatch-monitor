import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Lock, Unlock, Plus, Trash2, Edit3, Save, X, GripVertical,
  Link, FileText, Shield, BarChart2, CheckSquare, Square, Archive, Pin, PinOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAdminAuth, lockAdmin, checkPin } from "@/hooks/use-admin-auth";
import { apiRequest, queryClient as qc } from "@/lib/queryClient";
import { type IncidentListResponse, type AdminCardListResponse } from "@shared/routes";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const COLOR_OPTIONS = [
  { value: "blue",   hex: "#3b82f6" },
  { value: "green",  hex: "#10b981" },
  { value: "amber",  hex: "#f59e0b" },
  { value: "red",    hex: "#ef4444" },
  { value: "purple", hex: "#a855f7" },
  { value: "slate",  hex: "#64748b" },
];

function ColorSwatch({ hex, selected, onClick }: { hex: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ backgroundColor: hex }}
      className={cn("w-5 h-5 rounded-full border-2 transition-all",
        selected ? "border-white scale-125 shadow-lg" : "border-transparent opacity-70 hover:opacity-100")} />
  );
}

type CardType = "text" | "link" | "announcement" | "poll";

interface NewCardState {
  type: CardType;
  title: string;
  content: string;
  url: string;
  color: string;
  pollQuestion: string;
  pollOptions: string[];
}

const DEFAULT_NEW: NewCardState = {
  type: "text", title: "", content: "", url: "", color: "blue",
  pollQuestion: "", pollOptions: ["", ""],
};

function SortableCard({
  card, onEdit, onDelete, onTogglePin,
}: {
  card: AdminCardListResponse[0];
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/15 border-blue-500/25 text-blue-400",
    green: "bg-emerald-500/15 border-emerald-500/25 text-emerald-400",
    amber: "bg-amber-500/15 border-amber-500/25 text-amber-400",
    red: "bg-red-500/15 border-red-500/25 text-red-400",
    purple: "bg-purple-500/15 border-purple-500/25 text-purple-400",
    slate: "bg-slate-500/15 border-slate-500/25 text-slate-400",
  };
  const colorCls = colorMap[card.color] || colorMap.blue;

  return (
    <div ref={setNodeRef} style={style} className={cn("rounded-xl border p-2.5 flex items-start gap-2 group", colorCls, isDragging && "opacity-50 shadow-2xl")}>
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mt-0.5 text-muted-foreground/40 hover:text-muted-foreground shrink-0">
        <GripVertical className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold mb-0.5">
          {card.type === "poll" ? <BarChart2 className="w-3 h-3 shrink-0" /> :
           card.type === "link" ? <Link className="w-3 h-3 shrink-0" /> :
           card.type === "announcement" ? <Shield className="w-3 h-3 shrink-0" /> :
           <FileText className="w-3 h-3 shrink-0" />}
          <span className="truncate">{card.title}</span>
          {card.pinned && <span className="text-[9px] opacity-50 ml-auto shrink-0">PINNED</span>}
        </div>
        {card.content && <p className="text-[11px] text-foreground/60 truncate">{card.content}</p>}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={onTogglePin} title={card.pinned ? "Unpin" : "Pin"} className="p-0.5 text-muted-foreground hover:text-amber-400 transition-colors">
          {card.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
        </button>
        <button onClick={onEdit} className="p-0.5 text-muted-foreground hover:text-primary transition-colors">
          <Edit3 className="w-3 h-3" />
        </button>
        <button onClick={onDelete} className="p-0.5 text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

interface AdminPanelProps {
  incidents: IncidentListResponse;
}

export function AdminPanel({ incidents }: AdminPanelProps) {
  const { isAdmin } = useAdminAuth();
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [section, setSection] = useState<"board" | "calls" | "keys">("board");

  const handlePinSubmit = () => {
    if (checkPin(pinInput)) {
      setPinInput("");
    } else {
      setPinError(true);
      setPinInput("");
      setTimeout(() => setPinError(false), 2000);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 pt-4 pb-3 border-b border-white/5 flex items-center gap-2">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground">Admin Panel</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-xs space-y-3">
            <p className="text-xs text-muted-foreground text-center">Enter admin PIN to manage the info board, clear calls, and more.</p>
            <div className="flex gap-2">
              <Input
                type="password"
                maxLength={4}
                placeholder="PIN..."
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
                className={cn("h-9 text-center text-xl font-mono tracking-widest bg-accent/20 border-white/10", pinError && "border-destructive animate-pulse")}
                data-testid="input-admin-pin"
                autoFocus
              />
              <Button size="sm" variant="outline" className="h-9 border-white/10" onClick={handlePinSubmit}>
                <Unlock className="w-4 h-4" />
              </Button>
            </div>
            {pinError && <p className="text-xs text-destructive text-center font-mono">Incorrect PIN</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-muted-foreground">Admin Panel</span>
          <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-emerald-500/30 text-emerald-400">ADMIN</Badge>
        </div>
        <button onClick={lockAdmin} className="text-muted-foreground hover:text-foreground transition-colors" title="Lock">
          <Lock className="w-4 h-4" />
        </button>
      </div>

      {/* Section tabs */}
      <div className="flex border-b border-white/5 shrink-0">
        <button
          onClick={() => setSection("board")}
          className={cn("flex-1 py-2 text-xs font-semibold transition-colors", section === "board" ? "text-primary border-b border-primary" : "text-muted-foreground hover:text-foreground")}
        >
          Info Board
        </button>
        <button
          onClick={() => setSection("calls")}
          className={cn("flex-1 py-2 text-xs font-semibold transition-colors", section === "calls" ? "text-primary border-b border-primary" : "text-muted-foreground hover:text-foreground")}
        >
          Clear Calls
        </button>
        <button
          onClick={() => setSection("keys")}
          className={cn("flex-1 py-2 text-xs font-semibold transition-colors", section === "keys" ? "text-primary border-b border-primary" : "text-muted-foreground hover:text-foreground")}
        >
          Manage Keys
        </button>
      </div>

      {section === "board" ? (
        <AdminBoardSection />
      ) : section === "calls" ? (
        <ClearCallsSection incidents={incidents} />
      ) : (
        <AdminKeysSection />
      )}
    </div>
  );
}

function AdminBoardSection() {
  const queryClient = useQueryClient();
  const { data: cards = [] } = useQuery<AdminCardListResponse>({ queryKey: ['/api/admin/cards'] });

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newCard, setNewCard] = useState<NewCardState>(DEFAULT_NEW);
  const [localOrder, setLocalOrder] = useState<number[]>([]);

  useEffect(() => {
    if (cards.length > 0 && localOrder.length === 0) {
      setLocalOrder(cards.map(c => c.id));
    }
  }, [cards]);

  const orderedCards = localOrder.length > 0
    ? localOrder.map(id => cards.find(c => c.id === id)).filter(Boolean) as AdminCardListResponse
    : cards;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localOrder.indexOf(Number(active.id));
    const newIndex = localOrder.indexOf(Number(over.id));
    const newOrder = arrayMove(localOrder, oldIndex, newIndex);
    setLocalOrder(newOrder);
    await fetch('/api/admin/cards/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: newOrder }),
    });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/cards'] });
  };

  const addCard = async () => {
    if (!newCard.title.trim()) return;
    const body: Record<string, unknown> = {
      type: newCard.type,
      title: newCard.title,
      content: newCard.content,
      color: newCard.color,
      pinned: false,
      sortOrder: 0,
    };
    if (newCard.type === "link") body.url = newCard.url;

    if (newCard.type === "poll") {
      const options = newCard.pollOptions.filter(o => o.trim());
      if (options.length < 2 || !newCard.pollQuestion.trim()) return;
      const pollRes = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: newCard.pollQuestion, options }),
      });
      const poll = await pollRes.json();
      body.pollId = poll.id;
      body.content = newCard.pollQuestion;
    }

    await fetch('/api/admin/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/cards'] });
    setLocalOrder([]);
    setNewCard(DEFAULT_NEW);
    setShowAdd(false);
  };

  const deleteCard = async (id: number) => {
    await fetch(`/api/admin/cards/${id}`, { method: 'DELETE' });
    setLocalOrder(prev => prev.filter(x => x !== id));
    queryClient.invalidateQueries({ queryKey: ['/api/admin/cards'] });
  };

  const togglePin = async (card: AdminCardListResponse[0]) => {
    await fetch(`/api/admin/cards/${card.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !card.pinned }),
    });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/cards'] });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground font-mono">{cards.length} card{cards.length !== 1 ? 's' : ''} · drag to reorder</span>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-primary" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>

      {showAdd && (
        <div className="mx-3 mt-3 p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-2 shrink-0">
          <div className="flex gap-2 items-center flex-wrap">
            <select
              value={newCard.type}
              onChange={(e) => setNewCard({ ...DEFAULT_NEW, type: e.target.value as CardType })}
              className="text-xs bg-accent/30 border border-white/10 rounded-md px-2 py-1 text-foreground"
            >
              <option value="text">Text</option>
              <option value="link">Link</option>
              <option value="announcement">Announcement</option>
              <option value="poll">Poll</option>
            </select>
            <div className="flex gap-1.5 items-center">
              <span className="text-[10px] text-muted-foreground">Color:</span>
              {COLOR_OPTIONS.map(c => (
                <ColorSwatch key={c.value} hex={c.hex} selected={newCard.color === c.value} onClick={() => setNewCard({ ...newCard, color: c.value })} />
              ))}
            </div>
          </div>
          <Input placeholder="Title..." value={newCard.title} onChange={(e) => setNewCard({ ...newCard, title: e.target.value })}
            className="h-8 text-sm bg-accent/20 border-white/10" />
          {newCard.type !== "poll" && (
            <Textarea placeholder="Content..." value={newCard.content} onChange={(e) => setNewCard({ ...newCard, content: e.target.value })}
              className="text-sm bg-accent/20 border-white/10 min-h-[50px] resize-none" />
          )}
          {newCard.type === "link" && (
            <Input placeholder="https://..." value={newCard.url} onChange={(e) => setNewCard({ ...newCard, url: e.target.value })}
              className="h-8 text-sm bg-accent/20 border-white/10 font-mono" />
          )}
          {newCard.type === "poll" && (
            <div className="space-y-1.5">
              <Input placeholder="Poll question..." value={newCard.pollQuestion}
                onChange={(e) => setNewCard({ ...newCard, pollQuestion: e.target.value })}
                className="h-8 text-sm bg-accent/20 border-white/10" />
              {newCard.pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-1.5">
                  <Input placeholder={`Option ${i + 1}...`} value={opt}
                    onChange={(e) => {
                      const opts = [...newCard.pollOptions];
                      opts[i] = e.target.value;
                      setNewCard({ ...newCard, pollOptions: opts });
                    }}
                    className="h-7 text-xs bg-accent/20 border-white/10 flex-1" />
                  {newCard.pollOptions.length > 2 && (
                    <button onClick={() => setNewCard({ ...newCard, pollOptions: newCard.pollOptions.filter((_, j) => j !== i) })}
                      className="text-muted-foreground hover:text-destructive">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {newCard.pollOptions.length < 8 && (
                <button onClick={() => setNewCard({ ...newCard, pollOptions: [...newCard.pollOptions, ""] })}
                  className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add option
                </button>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 h-7 text-xs" onClick={addCard}>
              <Save className="w-3 h-3 mr-1" /> Save Card
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
        {editingId != null ? (
          <EditCardForm
            card={cards.find(c => c.id === editingId)!}
            onSave={() => { queryClient.invalidateQueries({ queryKey: ['/api/admin/cards'] }); setEditingId(null); }}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={orderedCards.map(c => c.id)} strategy={verticalListSortingStrategy}>
              {orderedCards.map(card => (
                <SortableCard
                  key={card.id}
                  card={card}
                  onEdit={() => setEditingId(card.id)}
                  onDelete={() => deleteCard(card.id)}
                  onTogglePin={() => togglePin(card)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
        {cards.length === 0 && !showAdd && (
          <div className="text-center py-8 text-muted-foreground/40 text-xs">No cards yet. Click Add to create one.</div>
        )}
      </div>
    </div>
  );
}

function EditCardForm({ card, onSave, onCancel }: { card: AdminCardListResponse[0]; onSave: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState(card.title);
  const [content, setContent] = useState(card.content);
  const [url, setUrl] = useState(card.url || "");
  const [color, setColor] = useState(card.color);

  // Poll-specific state — loaded from the live poll if this card has one
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollLoaded, setPollLoaded] = useState(false);

  useEffect(() => {
    if (card.type === "poll" && card.pollId && !pollLoaded) {
      fetch(`/api/polls/${card.pollId}/results`)
        .then(r => r.json())
        .then(data => {
          setPollQuestion(data.poll?.question ?? "");
          setPollOptions(data.poll?.options ?? ["", ""]);
          setPollLoaded(true);
        })
        .catch(() => setPollLoaded(true));
    }
  }, [card.type, card.pollId, pollLoaded]);

  const save = async () => {
    const cardBody: Record<string, unknown> = { title, color };
    if (card.type !== "poll") cardBody.content = content;
    if (card.type === "link") cardBody.url = url || undefined;

    await fetch(`/api/admin/cards/${card.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cardBody),
    });

    if (card.type === "poll" && card.pollId) {
      const opts = pollOptions.filter(o => o.trim());
      if (opts.length >= 2 && pollQuestion.trim()) {
        await fetch(`/api/polls/${card.pollId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: pollQuestion, options: opts }),
        });
      }
    }
    onSave();
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
      <div className="flex gap-1.5 items-center">
        <span className="text-[10px] text-muted-foreground">Color:</span>
        {COLOR_OPTIONS.map(c => (
          <ColorSwatch key={c.value} hex={c.hex} selected={color === c.value} onClick={() => setColor(c.value)} />
        ))}
      </div>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 text-sm bg-accent/20 border-white/10 font-bold" placeholder="Title..." />
      {card.type !== "poll" && (
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="text-sm bg-accent/20 border-white/10 min-h-[50px] resize-none" placeholder="Content..." />
      )}
      {card.type === "link" && (
        <Input value={url} onChange={(e) => setUrl(e.target.value)} className="h-8 text-sm bg-accent/20 border-white/10 font-mono" placeholder="https://..." />
      )}
      {card.type === "poll" && (
        <div className="space-y-1.5">
          {!pollLoaded ? (
            <p className="text-xs text-muted-foreground">Loading poll…</p>
          ) : (
            <>
              <Input placeholder="Poll question..." value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                className="h-8 text-sm bg-accent/20 border-white/10" />
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-1.5">
                  <Input placeholder={`Option ${i + 1}...`} value={opt}
                    onChange={(e) => {
                      const opts = [...pollOptions];
                      opts[i] = e.target.value;
                      setPollOptions(opts);
                    }}
                    className="h-7 text-xs bg-accent/20 border-white/10 flex-1" />
                  {pollOptions.length > 2 && (
                    <button onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-destructive">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 8 && (
                <button onClick={() => setPollOptions([...pollOptions, ""])}
                  className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add option
                </button>
              )}
            </>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 h-7 text-xs" onClick={save}><Save className="w-3 h-3 mr-1" /> Save</Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function AdminKeysSection() {
  const queryClient = useQueryClient();
  const { data: keys = [] } = useQuery<AuthKey[]>({ queryKey: ['/api/admin/keys'] });
  const [newPin, setNewPin] = useState("");
  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const addKey = async () => {
    if (!newPin || newPin.length < 4 || !newName) return;
    setIsAdding(true);
    try {
      await fetch('/api/admin/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: newPin, name: newName }),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/keys'] });
      setNewPin("");
      setNewName("");
    } finally {
      setIsAdding(false);
    }
  };

  const deleteKey = async (id: number) => {
    await fetch(`/api/admin/keys/${id}`, { method: 'DELETE' });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/keys'] });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="p-4 space-y-4">
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-3">
          <h4 className="text-xs font-bold text-primary uppercase">Add New Key</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase font-bold">Owner Name</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. John Doe" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase font-bold">PIN (4-6 digits)</label>
              <Input value={newPin} onChange={e => setNewPin(e.target.value)} maxLength={6} placeholder="1234" className="h-8 text-xs font-mono" />
            </div>
          </div>
          <Button onClick={addKey} disabled={isAdding || newPin.length < 4 || !newName} className="w-full h-8 text-xs">
            <Plus className="w-3 h-3 mr-1" /> Add Authorized Key
          </Button>
        </div>

        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Active Keys</h4>
          <div className="space-y-1.5">
            {keys.map(k => (
              <div key={k.id} className="bg-white/5 border border-white/10 rounded-lg p-2.5 flex items-center justify-between group">
                <div>
                  <p className="text-xs font-bold text-foreground">{k.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">PIN: •••• {k.pin.slice(-2)}</p>
                </div>
                <button onClick={() => deleteKey(k.id)} className="p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {keys.length === 0 && (
              <div className="text-center py-8 text-muted-foreground/30 text-xs italic border border-dashed border-white/10 rounded-lg">
                No custom keys configured yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClearCallsSection({ incidents }: { incidents: IncidentListResponse }) {
  const activeIncidents = incidents.filter(i => i.active);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [clearing, setClearing] = useState(false);
  const queryClient = useQueryClient();

  const toggle = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(activeIncidents.map(i => i.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const doClear = async () => {
    if (selectedIds.size === 0) return;
    setClearing(true);
    try {
      await fetch('/api/incidents/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/incidents'] });
      setSelectedIds(new Set());
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between gap-2 shrink-0">
        <span className="text-[10px] text-muted-foreground font-mono">{selectedIds.size} selected of {activeIncidents.length} active</span>
        <div className="flex gap-1.5">
          <button onClick={selectAll} className="text-[10px] text-primary hover:underline">All</button>
          <span className="text-muted-foreground/30">·</span>
          <button onClick={clearSelection} className="text-[10px] text-muted-foreground hover:underline">None</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5">
        {activeIncidents.length === 0 && (
          <div className="text-center py-8 text-muted-foreground/40 text-xs">No active calls to clear.</div>
        )}
        {activeIncidents.map(inc => {
          const sel = selectedIds.has(inc.id);
          return (
            <button
              key={inc.id}
              onClick={() => toggle(inc.id)}
              className={cn(
                "w-full text-left rounded-lg px-3 py-2 flex items-center gap-2.5 border transition-all text-xs",
                sel ? "bg-primary/10 border-primary/30" : "bg-white/3 border-white/8 hover:bg-white/8"
              )}
            >
              {sel ? <CheckSquare className="w-3.5 h-3.5 text-primary shrink-0" /> : <Square className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground truncate">{inc.callType}</div>
                <div className="text-muted-foreground/60 truncate text-[10px]">{inc.location} · {inc.incidentNo}</div>
              </div>
              {inc.agency === 'fire' ? (
                <span className="text-[9px] text-red-400 font-mono shrink-0">FIRE</span>
              ) : (
                <span className="text-[9px] text-blue-400 font-mono shrink-0">PD</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-3 border-t border-white/5 shrink-0">
        <Button
          className="w-full h-8 text-xs gap-1.5 bg-destructive/80 hover:bg-destructive text-destructive-foreground"
          disabled={selectedIds.size === 0 || clearing}
          onClick={doClear}
        >
          <Archive className="w-3.5 h-3.5" />
          {clearing ? "Clearing..." : `Clear ${selectedIds.size} Call${selectedIds.size !== 1 ? 's' : ''} → History`}
        </Button>
      </div>
    </div>
  );
}
