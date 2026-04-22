import { useState, useEffect, type FormEvent } from 'react';
import Drawer from '@/components/shared/Drawer';
import Avatar from '@/components/shared/Avatar';
import { useCourses } from '@/hooks/useCourses';
import { useFriends } from '@/hooks/useFriends';
import { useUIStore } from '@/store/uiStore';
import type { Group, GroupInput } from '@/services/groups.service';
import { filterFriends } from '@/lib/search';


interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
  /** Provided by parent that owns the useGroups instance so sidebar reflects changes. */
  onCreate: (input: Omit<GroupInput, 'owner_id'>, initialMemberIds: string[]) => Promise<Group>;
  onCreated?: (group: Group) => void;
}

export default function CreateGroupModal({ open, onClose, onCreate, onCreated }: CreateGroupModalProps) {
  const { courses } = useCourses();
  const { accepted } = useFriends();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState<string | ''>('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const showToast = useUIStore((s) => s.showToast);
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    if (open) {
      setName(''); setDescription(''); setCourseId(''); setSelectedMembers(new Set()); setQuery(''); setErr(null);
    }
  }, [open]);

  function toggleMember(id: string) {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      const group = await onCreate({ name: name.trim(), description: description.trim() || null, course_id: courseId || null }, Array.from(selectedMembers));
      showToast({ level: 'success', message: `Group "${group.name}" created` });
      onCreated?.(group);
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create group.';
      setErr(msg);
      showToast({ level: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  }

const filteredFriends = filterFriends(accepted, query);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Create a group"
      footer={
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className={`${theme === 'dark' ? 'text-sm font-semibold text-gray-100 px-3 py-1.5 rounded-md border border-slate-700 hover:bg-slate-700/50 transition-colors' : 'text-sm font-semibold text-gray-700 px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors'}`}>Cancel</button>
          <button type="submit" form="create-group-form" disabled={submitting} className="text-sm font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-3 py-1.5 rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed">{submitting ? 'Creating…' : 'Create group'}</button>
        </div>
      }
    >
      <form id="create-group-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <label className="flex flex-col gap-1.5">
          <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-700'}`}>Name <span className="text-red-500">*</span></span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HCI Study Group" autoFocus className={`${theme === 'dark' ? 'border border-slate-700 bg-slate-800 text-gray-100 placeholder:text-gray-300' : 'border border-gray-200'} rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]`} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-700'}`}>Course (optional)</span>
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={`${theme === 'dark' ? 'border border-slate-700 bg-slate-800 text-gray-100' : 'border border-gray-200'} rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]`}>
            <option value="">— No course —</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.code} · {c.name}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-700'}`}>Description (optional)</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={`${theme === 'dark' ? 'border border-slate-700 bg-slate-800 text-gray-100' : 'border border-gray-200'} rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB] resize-y`} />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-700'}`}>Invite friends (optional)</span>
          {accepted.length === 0 ? (
            <p className={`${theme === 'dark' ? 'text-xs text-gray-100' : 'text-xs text-gray-500'}`}>You have no friends yet. You'll be the only member.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedMembers.size > 0 && (
                <div className="flex flex-wrap gap-1">
                  {accepted.filter((f) => selectedMembers.has(f.other.id)).map((f) => (
                    <button key={f.other.id} type="button" onClick={() => toggleMember(f.other.id)} className={`${theme === 'dark' ? 'bg-slate-800 text-gray-200' : 'bg-gray-100 text-gray-700'} text-xs px-2 py-1 rounded-full`}>
                      {f.other.name} ×
                    </button>
                  ))}
                </div>
              )}

              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search friends to invite…" className={`${theme === 'dark' ? 'border border-slate-700 bg-slate-800 text-gray-100 placeholder:text-gray-300' : 'border border-gray-200 bg-white text-gray-800 placeholder:text-gray-400'} rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]`} />

              <ul className={`flex flex-col gap-1 max-h-64 overflow-y-auto rounded-md p-1 ${theme === 'dark' ? 'border border-slate-700 bg-slate-900' : 'border border-gray-100 bg-white'}`}>
                {filteredFriends.map((f) => {
                  const checked = selectedMembers.has(f.other.id);
                  return (
                    <li key={f.other.id}>
                      <button type="button" onClick={() => toggleMember(f.other.id)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors ${theme === 'dark' ? checked ? 'bg-blue-500/15 hover:bg-blue-500/20' : 'hover:bg-slate-800' : checked ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                        <Avatar user={{ avatarColor: f.other.avatar_color, initials: f.other.initials }} size="sm" />
                        <div className="flex-1 text-left min-w-0">
                          <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>{f.other.name}</p>
                          <p className={`text-[10px] truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>@{f.other.username}</p>
                        </div>
                        <input type="checkbox" checked={checked} onChange={() => {}} className="pointer-events-none" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" role="alert">{err}</div>}
      </form>
    </Drawer>
  );
}