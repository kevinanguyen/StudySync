import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import AvatarImageEditor from '@/components/settings/AvatarImageEditor';
import { updateProfile, updateStatus, changePassword, uploadProfileAvatar } from '@/services/profile.service';
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
  const theme = useUIStore((s) => s.theme);
  // UI scale
  const textScale = useUIStore((s) => s.textScale);
  const setTextScale = useUIStore((s) => s.setTextScale);

  // Profile form
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [major, setMajor] = useState('');
  const [gradYear, setGradYear] = useState('');
  const [avatarColor, setAvatarColor] = useState(AVATAR_PALETTE[0]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
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
    setAvatarUrl(profile.avatar_url);
    setAvatarBlob(null);
    setStatus(profile.status);
    setStatusText(profile.status_text ?? '');
  }, [profile]);

  if (!profile) {
    return (
      <div className={`flex flex-col h-screen ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <Header />
        <div className={`${theme === 'dark' ? 'flex-1 flex items-center justify-center text-gray-300 text-sm' : 'flex-1 flex items-center justify-center text-gray-500 text-sm'}`}>Loading…</div>
      </div>
    );
  }

  async function handleProfileSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileErr(null);
    if (!profile) { setProfileErr('Profile not loaded.'); return; }
    if (!name.trim()) { setProfileErr('Name is required.'); return; }
    if (!username.trim()) { setProfileErr('Username is required.'); return; }
    if (gradYear && !/^\d{4}$/.test(gradYear)) { setProfileErr('Grad year must be 4 digits.'); return; }
    setProfileSubmitting(true);
    try {
      const nextAvatarUrl = avatarBlob ? await uploadProfileAvatar(profile.id, avatarBlob) : profile.avatar_url;
      const updated = await updateProfile(profile.id, {
        name,
        username,
        major: major.trim() || null,
        grad_year: gradYear ? Number(gradYear) : null,
        avatar_color: avatarColor,
        avatar_url: nextAvatarUrl,
      });
      setProfileInStore(updated);
      setAvatarUrl(updated.avatar_url);
      setAvatarBlob(null);
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
      showToast({
        level: 'success',
        message: 'Password updated',
        duration: 5000,
      });
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
    <div className={`flex flex-col h-screen overflow-hidden ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <Header />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-5 py-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => navigate('/dashboard')} className="text-xs text-[#3B5BDB] font-semibold hover:underline">
              ← Back to dashboard
            </button>
            <h1 className={`${theme === 'dark' ? 'text-2xl font-bold text-gray-100' : 'text-2xl font-bold text-gray-800'}`}>Settings</h1>
          </div>

          {/* Profile */}
          <section className={`${theme === 'dark' ? 'bg-slate-800 rounded-xl border border-slate-700 p-6' : 'bg-white rounded-xl border border-gray-200 p-6'}`}>
            <h2 className={`${theme === 'dark' ? 'text-lg font-bold text-gray-100 mb-4' : 'text-lg font-bold text-gray-800 mb-4'}`}>Profile</h2>
            <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4" noValidate>
              <div className="flex items-center gap-4">
                <div>
                  <p className={`${theme === 'dark' ? 'text-sm font-semibold text-gray-100' : 'text-sm font-semibold text-gray-800'}`}>{profile.school_email}</p>
                  <p className={`${theme === 'dark' ? 'text-xs text-gray-300' : 'text-xs text-gray-500'}`}>(email is read-only)</p>
                </div>
              </div>

              <AvatarImageEditor
                avatarColor={avatarColor}
                avatarUrl={avatarUrl}
                initials={profile.initials}
                onAvatarReady={({ blob, previewUrl }) => {
                  setAvatarBlob(blob);
                  if (previewUrl) setAvatarUrl(previewUrl);
                }}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className={`${theme === 'dark' ? 'text-xs font-semibold uppercase text-gray-300' : 'text-xs font-semibold uppercase text-gray-700'}`}>Name <span className="text-red-500">*</span></span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`${theme === 'dark' ? 'border border-slate-700 bg-slate-800 text-gray-100' : 'border border-gray-200'} rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]`}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={`${theme === 'dark' ? 'text-xs font-semibold uppercase text-gray-300' : 'text-xs font-semibold uppercase text-gray-700'}`}>Username <span className="text-red-500">*</span></span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`${theme === 'dark' ? 'border border-slate-700 bg-slate-800 text-gray-100' : 'border border-gray-200'} rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]`}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={`${theme === 'dark' ? 'text-xs font-semibold uppercase text-gray-300' : 'text-xs font-semibold uppercase text-gray-700'}`}>Major (optional)</span>
                  <input
                    type="text"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    className={`${theme === 'dark' ? 'border border-slate-700 bg-slate-800 text-gray-100' : 'border border-gray-200'} rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]`}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={`${theme === 'dark' ? 'text-xs font-semibold uppercase text-gray-300' : 'text-xs font-semibold uppercase text-gray-700'}`}>Grad year (optional)</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={gradYear}
                    onChange={(e) => setGradYear(e.target.value)}
                    className={`${theme === 'dark' ? 'border border-slate-700 bg-slate-800 text-gray-100' : 'border border-gray-200'} rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]`}
                  />
                </label>
              </div>

              <div className="flex flex-col gap-3">
                <span className={`${theme === 'dark' ? 'text-xs font-semibold uppercase text-gray-300' : 'text-xs font-semibold uppercase text-gray-700'}`}>Avatar color</span>
                <div className="flex gap-1.5 flex-wrap">
                  {AVATAR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAvatarColor(c)}
                      aria-label={`Color ${c}`}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        avatarColor === c ? (theme === 'dark' ? 'ring-2 ring-offset-2 ring-slate-700 scale-110' : 'ring-2 ring-offset-2 ring-gray-700 scale-110') : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {profileErr && (
                <div className={`${theme === 'dark' ? 'text-sm text-red-400 bg-red-900/30 border border-red-700 rounded-md px-3 py-2' : 'text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2'}`} role="alert">
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
          <section className={`${theme === 'dark' ? 'bg-slate-800 rounded-xl border border-slate-700 p-6' : 'bg-white rounded-xl border border-gray-200 p-6'}`}>
            <h2 className={`${theme === 'dark' ? 'text-lg font-bold text-gray-100 mb-4' : 'text-lg font-bold text-gray-800 mb-4'}`}>Availability</h2>
            <form onSubmit={handleStatusSubmit} className="flex flex-col gap-3 mb-6" noValidate>
                <div className="flex flex-col gap-1">
                  <h3 className={`${theme === 'dark' ? 'text-xs font-semibold text-gray-300 uppercase tracking-wide' : 'text-xs font-semibold text-gray-700 uppercase tracking-wide'}`}>Status</h3>
                {(Object.keys(statusConfig) as UserStatus[]).map((s) => (
                  <label key={s} className={`flex items-center gap-2 text-sm ${ theme === 'dark' ? 'text-gray-100' : 'text-gray-800' }`}
                  >
                    <input type="radio" name="status" checked={status === s} onChange={() => setStatus(s)} />
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusConfig[s].color }} />
                    <span>{statusConfig[s].label}</span>
                  </label>
                ))}
              </div>

              <label className="flex flex-col gap-3">
                <span className={`${theme === 'dark' ? 'text-xs font-semibold uppercase text-gray-300' : 'text-xs font-semibold uppercase text-gray-700'}`}>Status Note (optional)</span>
                <input
                  type="text"
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="e.g. In the library till 4pm"
                  maxLength={80}
                  className={`${theme === 'dark' ? 'border border-slate-700 bg-slate-800 text-gray-100 placeholder:text-gray-300' : 'border border-gray-200'} rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]`}
                />
              </label>

              <div>
                <button
                  type="submit"
                  disabled={statusSubmitting}
                  className={`text-sm font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-4 py-2 rounded-md transition-colors ${ theme === 'dark' ? 'disabled:bg-slate-600 disabled:text-gray-300' : 'disabled:bg-gray-300 disabled:text-gray-500'}`}
                >
                  {statusSubmitting ? 'Saving…' : 'Update status'}
                </button>
              </div>
            </form>
          </section>

          {/* UI Scale */}
          <section className={`${theme === 'dark' ? 'bg-slate-800 rounded-xl border border-slate-700 p-6' : 'bg-white rounded-xl border border-gray-200 p-6'}`}>
            <h2 className={`${theme === 'dark' ? 'text-lg font-bold text-gray-100 mb-4' : 'text-lg font-bold text-gray-800 mb-4'}`}>Accessibility</h2>

            <div className="flex flex-col gap-3 mb-6">
              <h3 className={`${theme === 'dark' ? 'text-xs font-semibold text-gray-300 uppercase tracking-wide' : 'text-xs font-semibold text-gray-700 uppercase tracking-wide'}`}>Text and display</h3>
              <div className="flex gap-2">
                {[1, 1.1, 1.25, 1.5].map((scale) => (
                  <button
                    key={scale}
                    type="button"
                    onClick={() => setTextScale(scale)}
                    className={`px-3 py-1.5 rounded text-sm font-semibold ${
                      textScale === scale
                        ? 'bg-[#3B5BDB] text-white'
                        : theme === 'dark'
                          ? 'bg-slate-700 text-gray-200 hover:bg-slate-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {scale === 1 ? 'Default' : scale === 1.1 ? 'Large' : scale === 1.25 ? 'XL' : 'XXL'}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Account */}
          <section className={`${theme === 'dark' ? 'bg-slate-800 rounded-xl border border-slate-700 p-6' : 'bg-white rounded-xl border border-gray-200 p-6'}`}>
            <h2 className={`${theme === 'dark' ? 'text-lg font-bold text-gray-100 mb-4' : 'text-lg font-bold text-gray-800 mb-4'}`}>Account</h2>

            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3 mb-6" noValidate>
              <h3 className={`${theme === 'dark' ? 'text-xs font-semibold text-gray-300 uppercase tracking-wide' : 'text-xs font-semibold text-gray-700 tracking-wide'}`}>Change password</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  autoComplete="new-password"
                  className={`${theme === 'dark' ? 'border border-slate-700 bg-slate-800 text-gray-100 placeholder:text-gray-300' : 'border border-gray-200'} rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]`}
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm"
                  autoComplete="new-password"
                  className={`${theme === 'dark' ? 'border border-slate-700 bg-slate-800 text-gray-100 placeholder:text-gray-300' : 'border border-gray-200'} rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]`}
                />
              </div>
              {passwordErr && (
                <div className={`${theme === 'dark' ? 'text-sm text-red-400 bg-red-900/30 border border-red-700 rounded-md px-3 py-2' : 'text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2'}`} role="alert">
                  {passwordErr}
                </div>
              )}
              <div>
                <button
                  type="submit"
                  disabled={passwordSubmitting || !newPassword}
                  className={`text-sm font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-4 py-2 rounded-md transition-colors ${
                    theme === 'dark'
                      ? 'disabled:bg-slate-600 disabled:text-gray-300'
                      : 'disabled:bg-gray-300 disabled:text-gray-500'
                  }`}
                >
                  {passwordSubmitting ? 'Updating…' : 'Change password'}
                </button>
              </div>
            </form>

            <div className={`${theme === 'dark' ? 'pt-4 border-t border-slate-700' : 'pt-4 border-t border-gray-200'}`}>
              <h3 className={`${theme === 'dark' ? 'text-xs font-semibold text-gray-300 uppercase tracking-wide mb-2' : 'text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2'}`}>Session</h3>
              <button
                type="button"
                onClick={handleLogout}
                className={`${theme === 'dark' ? 'text-sm font-semibold text-red-400 border border-red-700 hover:bg-red-900/20 px-4 py-2 rounded-md transition-colors' : 'text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 px-4 py-2 rounded-md transition-colors'}`}
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
