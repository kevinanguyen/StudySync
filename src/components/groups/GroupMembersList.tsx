import { useEffect, useState } from 'react';
import Avatar from '@/components/shared/Avatar';
import { listGroupMembers, type GroupMemberWithProfile } from '@/services/groups.service';
import { useUIStore } from '@/store/uiStore';

interface GroupMembersListProps {
  groupId: string;
}

export default function GroupMembersList({ groupId }: GroupMembersListProps) {
  const [members, setMembers] = useState<GroupMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = useUIStore((s) => s.theme);

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
    <div className={`flex flex-col gap-2 rounded-xl border p-4 
      ${ theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200' }`} 
    >
      <h3 className={`text-[10px] font-bold uppercase tracking-widest ${ theme === 'dark' ? 'text-gray-400' : 'text-gray-500' }`}>Members ({members.length})</h3>
      {loading && <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>Loading…</p>}
      <ul className="flex flex-col gap-1">
        {members.map((m) => (
          <li key={m.member.user_id} className={`flex items-center gap-2 px-2 py-1.5 rounded transition-colors 
            ${ theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-gray-50' }`} 
          >
            <Avatar user={{ avatarColor: m.profile.avatar_color, initials: m.profile.initials, status: m.profile.status }} size="sm" showStatus />
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-semibold truncate ${ theme === 'dark' ? 'text-gray-100' : 'text-gray-800' }`}>{m.profile.name}</p>
              <p className={`text-[10px] capitalize ${ theme === 'dark' ? 'text-gray-400' : 'text-gray-500' }`}>{m.member.role}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
