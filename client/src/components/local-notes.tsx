import { useState } from "react";
import { useLocalNotes, type LocalNote } from "@/hooks/use-local-notes";
import { type IncidentListResponse } from "@shared/routes";
import { Plus, Pin, PinOff, Trash2, Edit3, Save, X, Tag, Radio, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface LocalNotesProps {
  incidents: IncidentListResponse;
}

const COLOR_MAP: Record<string, { bg: string; border: string; bar: string; text: string }> = {
  blue:   { bg: "bg-blue-500/8",   border: "border-blue-500/20",   bar: "bg-blue-500",   text: "text-blue-400" },
  purple: { bg: "bg-purple-500/8", border: "border-purple-500/20", bar: "bg-purple-500", text: "text-purple-400" },
  green:  { bg: "bg-emerald-500/8",border: "border-emerald-500/20",bar: "bg-emerald-500",text: "text-emerald-400" },
  amber:  { bg: "bg-amber-500/8",  border: "border-amber-500/20",  bar: "bg-amber-500",  text: "text-amber-400" },
  red:    { bg: "bg-red-500/8",    border: "border-red-500/20",    bar: "bg-red-500",    text: "text-red-400" },
  pink:   { bg: "bg-pink-500/8",   border: "border-pink-500/20",   bar: "bg-pink-500",   text: "text-pink-400" },
  cyan:   { bg: "bg-cyan-500/8",   border: "border-cyan-500/20",   bar: "bg-cyan-500",   text: "text-cyan-400" },
  indigo: { bg: "bg-indigo-500/8", border: "border-indigo-500/20", bar: "bg-indigo-500", text: "text-indigo-400" },
};

const ALL_COLORS = Object.keys(COLOR_MAP);

export function LocalNotes({ incidents }: LocalNotesProps) {
  const { notes, createNote, updateNote, deleteNote, togglePin } = useLocalNotes();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showLinkPicker, setShowLinkPicker] = useState<string | null>(null);
  const [callSearch, setCallSearch] = useState("");

  const filtered = notes.filter(n =>
    !search ||
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase()) ||
    n.linkedIncidentNo?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCalls = incidents.filter(i =>
    i.active && (
      !callSearch ||
      i.incidentNo.toLowerCase().includes(callSearch.toLowerCase()) ||
      i.callType.toLowerCase().includes(callSearch.toLowerCase()) ||
      i.location.toLowerCase().includes(callSearch.toLowerCase())
    )
  );

  const handleNew = () => {
    const note = createNote("New Note", "");
    setEditingId(note.id);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-4 pt-4 pb-3 space-y-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-accent/20 border-white/10"
            />
          </div>
          <Button size="sm" variant="outline" className="h-8 px-2 border-white/10 gap-1 text-xs whitespace-nowrap" onClick={handleNew}>
            <Plus className="w-3.5 h-3.5" /> New Note
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground font-mono">
          {notes.length} personal note{notes.length !== 1 ? "s" : ""} · visible only to you
        </p>
      </div>

      {/* Notes grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-accent/30 flex items-center justify-center">
              <Edit3 className="w-7 h-7 opacity-40" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">No notes yet</p>
              <p className="text-xs mt-1">Create a note, or link one to an active call.</p>
            </div>
            <Button size="sm" onClick={handleNew} className="gap-1">
              <Plus className="w-3.5 h-3.5" /> Create first note
            </Button>
          </div>
        )}

        {filtered.map(note => (
          <NoteCard
            key={note.id}
            note={note}
            isEditing={editingId === note.id}
            incidents={incidents}
            onEdit={() => setEditingId(note.id)}
            onSave={(updates) => { updateNote(note.id, updates); setEditingId(null); }}
            onDelete={() => { deleteNote(note.id); if (editingId === note.id) setEditingId(null); }}
            onTogglePin={() => togglePin(note.id)}
            showLinkPicker={showLinkPicker === note.id}
            onToggleLinkPicker={() => setShowLinkPicker(showLinkPicker === note.id ? null : note.id)}
            filteredCalls={filteredCalls}
            callSearch={callSearch}
            onCallSearch={setCallSearch}
          />
        ))}
      </div>
    </div>
  );
}

function NoteCard({
  note, isEditing, incidents, onEdit, onSave, onDelete, onTogglePin,
  showLinkPicker, onToggleLinkPicker, filteredCalls, callSearch, onCallSearch
}: {
  note: LocalNote;
  isEditing: boolean;
  incidents: IncidentListResponse;
  onEdit: () => void;
  onSave: (u: Partial<LocalNote>) => void;
  onDelete: () => void;
  onTogglePin: () => void;
  showLinkPicker: boolean;
  onToggleLinkPicker: () => void;
  filteredCalls: IncidentListResponse;
  callSearch: string;
  onCallSearch: (s: string) => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [color, setColor] = useState(note.color);
  const [linkedNo, setLinkedNo] = useState(note.linkedIncidentNo || "");

  const colors = COLOR_MAP[note.color] || COLOR_MAP.blue;
  const editColors = COLOR_MAP[color] || COLOR_MAP.blue;

  const linkedIncident = incidents.find(i => i.incidentNo === note.linkedIncidentNo);

  if (isEditing) {
    return (
      <div className={cn("rounded-xl border p-3 relative overflow-hidden", editColors.border, editColors.bg)}>
        <div className={cn("absolute left-0 top-0 bottom-0 w-1", editColors.bar)} />
        <div className="pl-2 space-y-2">
          {/* Color picker */}
          <div className="flex gap-1.5 mb-2">
            {ALL_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  "w-4 h-4 rounded-full border-2 transition-all",
                  `bg-${c}-500/70`,
                  color === c ? "border-white scale-125" : "border-transparent"
                )}
              />
            ))}
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-8 text-sm font-bold bg-black/20 border-white/10"
            placeholder="Note title..."
          />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="text-sm bg-black/20 border-white/10 min-h-[80px] resize-none"
            placeholder="Write your note..."
          />

          {/* Link to call */}
          <button
            onClick={onToggleLinkPicker}
            className={cn(
              "flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg border transition-all w-full",
              showLinkPicker ? "bg-primary/10 border-primary/30 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20"
            )}
          >
            <Radio className="w-3.5 h-3.5" />
            {linkedNo ? `Linked: ${linkedNo}` : "Link to active call..."}
            {linkedNo && <X className="w-3 h-3 ml-auto" onClick={(e) => { e.stopPropagation(); setLinkedNo(""); }} />}
          </button>

          {showLinkPicker && (
            <div className="border border-white/10 rounded-lg overflow-hidden bg-black/30 max-h-[180px] overflow-y-auto">
              <div className="p-2 border-b border-white/5">
                <Input
                  placeholder="Search calls..."
                  value={callSearch}
                  onChange={(e) => onCallSearch(e.target.value)}
                  className="h-7 text-xs bg-transparent border-white/10"
                  autoFocus
                />
              </div>
              {filteredCalls.slice(0, 8).map(inc => (
                <button
                  key={inc.id}
                  onClick={() => { setLinkedNo(inc.incidentNo); onToggleLinkPicker(); }}
                  className="w-full text-left p-2 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                >
                  <div className="text-[10px] font-mono text-muted-foreground">{inc.incidentNo}</div>
                  <div className="text-xs font-semibold text-foreground truncate">{inc.callType}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{inc.location}</div>
                </button>
              ))}
              {filteredCalls.length === 0 && (
                <div className="p-3 text-xs text-center text-muted-foreground">No active calls found</div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button size="sm" className="flex-1 h-7 text-xs gap-1" onClick={() => onSave({ title, content, color, linkedIncidentNo: linkedNo || undefined })}>
              <Save className="w-3 h-3" /> Save
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => onSave({})}>Cancel</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("rounded-xl border p-3 relative overflow-hidden group cursor-pointer transition-all hover:shadow-lg", colors.border, colors.bg)}
      onClick={onEdit}
      data-testid={`note-card-${note.id}`}
    >
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", colors.bar)} />
      <div className="pl-2">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-1.5">
            {note.pinned && <Pin className={cn("w-3 h-3", colors.text)} />}
            <h4 className="text-sm font-bold text-foreground">{note.title}</h4>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); onTogglePin(); }} className="p-0.5 text-muted-foreground hover:text-primary transition-colors">
              {note.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-0.5 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {note.content && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mb-2">{note.content}</p>
        )}

        {note.linkedIncidentNo && (
          <div className={cn("flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded-md border mb-1.5", colors.border, colors.text, "bg-black/10")}>
            <Radio className="w-3 h-3" />
            {linkedIncident ? (
              <span>{note.linkedIncidentNo} · {linkedIncident.callType}</span>
            ) : (
              <span className="opacity-60">{note.linkedIncidentNo} (closed)</span>
            )}
          </div>
        )}

        <div className="text-[9px] text-muted-foreground/50 font-mono mt-1">
          {format(new Date(note.updatedAt), "MMM d, HH:mm")}
        </div>
      </div>
    </div>
  );
}
