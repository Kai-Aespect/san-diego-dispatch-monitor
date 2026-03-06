import { useState } from "react";
import { useLocalNotes, type LocalNote } from "@/hooks/use-local-notes";
import { useAuthKey, AuthPrompt } from "@/hooks/use-auth-key";
import { type IncidentListResponse } from "@shared/routes";
import { Plus, Pin, PinOff, Trash2, Edit3, Save, X, Radio, Search, GripVertical, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface LocalNotesProps {
  incidents: IncidentListResponse;
}

const COLOR_MAP: Record<string, { bg: string; border: string; bar: string; text: string; hex: string }> = {
  blue:   { bg: "bg-blue-500/8",    border: "border-blue-500/20",   bar: "bg-blue-500",   text: "text-blue-400",   hex: "#3b82f6" },
  purple: { bg: "bg-purple-500/8",  border: "border-purple-500/20", bar: "bg-purple-500", text: "text-purple-400", hex: "#a855f7" },
  green:  { bg: "bg-emerald-500/8", border: "border-emerald-500/20",bar: "bg-emerald-500",text: "text-emerald-400",hex: "#10b981" },
  amber:  { bg: "bg-amber-500/8",   border: "border-amber-500/20",  bar: "bg-amber-500",  text: "text-amber-400",  hex: "#f59e0b" },
  red:    { bg: "bg-red-500/8",     border: "border-red-500/20",    bar: "bg-red-500",    text: "text-red-400",    hex: "#ef4444" },
  pink:   { bg: "bg-pink-500/8",    border: "border-pink-500/20",   bar: "bg-pink-500",   text: "text-pink-400",   hex: "#ec4899" },
  cyan:   { bg: "bg-cyan-500/8",    border: "border-cyan-500/20",   bar: "bg-cyan-500",   text: "text-cyan-400",   hex: "#06b6d4" },
  indigo: { bg: "bg-indigo-500/8",  border: "border-indigo-500/20", bar: "bg-indigo-500", text: "text-indigo-400", hex: "#6366f1" },
};

const ALL_COLORS = Object.keys(COLOR_MAP);

export function LocalNotes({ incidents }: LocalNotesProps) {
  const { notes, createNote, updateNote, deleteNote, togglePin, reorderNotes } = useLocalNotes();
  const { isAuthorized } = useAuthKey();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showLinkPicker, setShowLinkPicker] = useState<string | null>(null);
  const [callSearch, setCallSearch] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = filtered.findIndex(n => n.id === active.id);
    const newIndex = filtered.findIndex(n => n.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(filtered, oldIndex, newIndex);
    reorderNotes(reordered.map(n => n.id));
  };

  return (
    <div className="flex flex-col h-full">
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
          {notes.length} personal note{notes.length !== 1 ? "s" : ""} · visible only to you · drag to reorder
        </p>
      </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          {!isAuthorized ? (
            <AuthPrompt 
              title="Notes Locked" 
              description="Personal notes and incident tags are protected. Enter your authorization key to view them."
              className="my-4"
            />
          ) : filtered.length === 0 ? (
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
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filtered.map(n => n.id)} strategy={verticalListSortingStrategy}>
                {filtered.map(note => (
                  <SortableNoteCard
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
              </SortableContext>
            </DndContext>
          )}
        </div>    </div>
  );
}
