import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Avatar from '@/components/shared/Avatar';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { updateProfile, updateStatus, changePassword } from '@/services/profile.service';
import { signOut } from '@/services/auth.service';
import { statusConfig } from '@/lib/status';
import type { UserStatus } from '@/types/domain';

const AVATAR_PALETTE = ['#3B5BDB', '#EF4444', '#8B5CF6', '#F97316', '#10B981', '#14B8A6', '#EC4899', '#F59E0B', '#6366F1'];

export default function SettingsPage() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const setProfileInStore = useAuthStore((s) => s.setProfile);
  const resetAuth = useAuthStore((s) => s.reset);
  const showToast = useUIStore((s) => s.showToast);

  // Profile form
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [major, setMajor] = useState('');
  const [gradYear, setGradYear] = useState('');
  const [avatarColor, setAvatarColor] = useState(AVATAR_PALETTE[0]);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  // Status form
  const [status, setStatus] = useState<UserStatus>('available');
  const [statusText, setStatusText] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // Password form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);

  // Seed from profile
  useEffect(() => {
    if (!profile) return;
    setName(profile.name);
    setUsername(profile.username);
    setMajor(profile.major ?? '');
    setGradYear(profile.grad_year ? String(profile.grad_year) : '');
    setAvatarColor(profile.avatar_color);
    setStatus(profile.status);
    setStatusText(profile.status_text ?? '');
  }, [profile]);

  if (!profile) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <Header />
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Loading…</div>
      </div>
    );
  }

  async function handleProfileSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileErr(null);
    if (!name.trim()) { setProfileErr('Name is required.'); return; }
    if (!username.trim()) { setProfileErr('Username is required.'); return; }
    if (gradYear && !/^\d{4}$/.test(gradYear)) { setProfileErr('Grad year must be 4 digits.'); return; }
    setProfileSubmitting(true);
    try {
      const updated = await updateProfile(profile!.id, {
        name,
        username,
        major: major.trim() || null,
        grad_year: gradYear ? Number(gradYear) : null,
        avatar_color: avatarColor,
      });
      setProfileInStore(updated);
      showToast({ level: 'success', message: 'Profile updated' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update profile.';
      setProfileErr(msg);
      showToast({ level: 'error', message: msg });
    } finally {
      setProfileSubmitting(false);
    }
  }

  async function handleStatusSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatusSubmitting(true);
    try {
      const updated = await updateStatus(profile!.id, status, statusText.trim() || null);
      setProfileInStore(updated);
      showToast({ level: 'success', message: 'Status updated' });
    } catch (e) {
      showToast({ level: 'error', message: e instanceof Error ? e.message : 'Failed to update status.' });
    } finally {
      setStatusSubmitting(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordErr(null);
    if (newPassword.length < 8) { setPasswordErr('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setPasswordErr('Passwords do not match.'); return; }
    setPasswordSubmitting(true);
    try {
      await changePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      showToast({ level: 'success', message: 'Password updated' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to change password.';
      setPasswordErr(msg);
      showToast({ level: 'error', message: msg });
    } finally {
      setPasswordSubmitting(false);
    }
  }

  async function handleLogout() {
    await signOut();
    resetAuth();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <Header />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-5 py-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => navigate('/dashboard')} className="text-xs text-[#3B5BDB] font-semibold hover:underline">
              ← Back to dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
          </div>

          {/* Profile */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Profile</h2>
            <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4" noValidate>
              <div className="flex items-center gap-4">
                <Avatar user={{ avatarColor, initials: profile.initials, status }} size="lg" showStatus />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{profile.school_email}</p>
                  <p className="text-xs text-gray-500">(email is read-only)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-gray-700">Name <span className="text-red-500">*</span></span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-gray-700">Username <span className="text-red-500">*</span></span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-gray-700">Major (optional)</span>
                  <input
                    type="text"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-gray-700">Grad year (optional)</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={gradYear}
                    onChange={(e) => setGradYear(e.target.value)}
                    className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
                  />
                </label>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-700">Avatar color</span>
                <div className="flex gap-1.5 flex-wrap">
                  {AVATAR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAvatarColor(c)}
                      aria-label={`Color ${c}`}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        avatarColor === c ? 'ring-2 ring-offset-2 ring-gray-700 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {profileErr && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" role="alert">
                  {profileErr}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={profileSubmitting}
                  className="text-sm font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-4 py-2 rounded-md transition-colors disabled:bg-gray-300"
                >
                  {profileSubmitting ? 'Saving…' : 'Save profile'}
                </button>
              </div>
            </form>
          </section>

          {/* Availability */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Availability</h2>
            <form onSubmit={handleStatusSubmit} className="flex flex-col gap-4" noValidate>
              <fieldset className="flex flex-col gap-2">
                <legend className="text-xs font-semibold text-gray-700">Status</legend>
                {(Object.keys(statusConfig) as UserStatus[]).map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <input type="radio" name="status" checked={status === s} onChange={() => setStatus(s)} />
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusConfig[s].color }} />
                    <span>{statusConfig[s].label}</span>
                  </label>
                ))}
              </fieldset>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-700">Status note (optional)</span>
                <input
                  type="text"
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="e.g. In the library till 4pm"
                  maxLength={80}
                  className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
                />
              </label>

              <div>
                <button
                  type="submit"
                  disabled={statusSubmitting}
                  className="text-sm font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-4 py-2 rounded-md transition-colors disabled:bg-gray-300"
                >
                  {statusSubmitting ? 'Saving…' : 'Update status'}
                </button>
              </div>
            </form>
          </section>

          {/* Account */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Account</h2>

            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3 mb-6" noValidate>
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Change password</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  autoComplete="new-password"
                  className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm"
                  autoComplete="new-password"
                  className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
                />
              </div>
              {passwordErr && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" role="alert">
                  {passwordErr}
                </div>
              )}
              <div>
                <button
                  type="submit"
                  disabled={passwordSubmitting || !newPassword}
                  className="text-sm font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-4 py-2 rounded-md transition-colors disabled:bg-gray-300"
                >
                  {passwordSubmitting ? 'Updating…' : 'Change password'}
                </button>
              </div>
            </form>

            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Session</h3>
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 px-4 py-2 rounded-md transition-colors"
              >
                Log out
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
