import { useEffect, useState } from 'react';
import Avatar from '@/components/shared/Avatar';
import { listGroupMembers, type GroupMemberWithProfile } from '@/services/groups.service';

interface GroupMembersListProps {
  groupId: string;
}

export default function GroupMembersList({ groupId }: GroupMembersListProps) {
  const [members, setMembers] = useState<GroupMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listGroupMembers(groupId)
      .then((rows) => { if (!cancelled) setMembers(rows); })
      .catch(() => { if (!cancelled) setMembers([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [groupId]);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Members ({members.length})</h3>
      {loading && <p className="text-xs text-gray-400">Loading…</p>}
      <ul className="flex flex-col gap-1">
        {members.map((m) => (
          <li key={m.member.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors">
            <Avatar user={{ avatarColor: m.profile.avatar_color, initials: m.profile.initials, status: m.profile.status }} size="sm" showStatus />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-800 truncate">{m.profile.name}</p>
              <p className="text-[10px] text-gray-500 capitalize">{m.member.role}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
