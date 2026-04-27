import { useState, useEffect, useMemo, type FormEvent } from 'react';
import Drawer from '@/components/shared/Drawer';
import FriendMultiSelect from '@/components/shared/FriendMultiSelect';
import EmptyState from '@/components/shared/EmptyState';
import { useFriends } from '@/hooks/useFriends';
import { useUIStore } from '@/store/uiStore';
import { addGroupMember } from '@/services/groups.service';

interface InviteGroupMembersModalProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  existingMemberIds: string[];
  /** Called after a successful invite so the parent can refetch the members list. */
  onInvited: () => void;
}

export default function InviteGroupMembersModal({
  open,
  onClose,
  groupId,
  groupName,
  existingMemberIds,
  onInvited,
}: InviteGroupMembersModalProps) {
  const { accepted } = useFriends();
  const showToast = useUIStore((s) => s.showToast);
  const theme = useUIStore((s) => s.theme);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setSubmitting(false);
      setErr(null);
    }
  }, [open]);

  const invitable = useMemo(
    () => accepted.filter((f) => !existingMemberIds.includes(f.other.id)),
    [accepted, existingMemberIds],
  );

  function toggleMember(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    if (selected.size === 0) {
      setErr('Pick at least one friend to invite.');
      return;
    }
    setErr(null);
    setSubmitting(true);
    const ids = Array.from(selected);
    const failures: string[] = [];
    try {
      await Promise.all(
        ids.map(async (uid) => {
          try {
            await addGroupMember(groupId, uid);
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Unknown error';
            failures.push(msg);
          }
        }),
      );

      const addedCount = ids.length - failures.length;
      if (addedCount > 0) {
        showToast({
          level: failures.length > 0 ? 'info' : 'success',
          message: `Added ${addedCount} member${addedCount === 1 ? '' : 's'} to ${groupName}`,
        });
        onInvited();
      }

      if (failures.length > 0) {
        const msg = `Failed to add ${failures.length} member${failures.length === 1 ? '' : 's'}: ${failures[0]}`;
        setErr(msg);
        showToast({ level: 'error', message: msg });
        if (addedCount === 0) return;
      }

      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to invite members.';
      setErr(msg);
      showToast({ level: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  }

  const hasInvitable = invitable.length > 0;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Invite members to ${groupName}`}
      footer={
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`${
              theme === 'dark'
                ? 'text-sm font-semibold text-gray-100 px-3 py-1.5 rounded-md border border-slate-700 hover:bg-slate-700/50 transition-colors'
                : 'text-sm font-semibold text-gray-700 px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors'
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="invite-group-members-form"
            disabled={submitting || !hasInvitable || selected.size === 0}
            className="text-sm font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-3 py-1.5 rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {submitting ? 'Adding…' : 'Add members'}
          </button>
        </div>
      }
    >
      <form id="invite-group-members-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {!hasInvitable ? (
          <EmptyState
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            }
            title="No friends to invite"
            description="Everyone you know is already in this group. Add more friends first."
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-700'}`}>
              Select friends to invite
            </span>
            <FriendMultiSelect
              friends={invitable}
              selected={selected}
              onToggle={toggleMember}
              emptyMessage="No friends available to invite."
            />
          </div>
        )}

        {err && (
          <div
            className={`text-sm rounded-md px-3 py-2 border ${
              theme === 'dark'
                ? 'text-red-300 bg-red-500/10 border-red-500/30'
                : 'text-red-600 bg-red-50 border-red-200'
            }`}
            role="alert"
          >
            {err}
          </div>
        )}
      </form>
    </Drawer>
  );
}
