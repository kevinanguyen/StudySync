import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/auth/AuthLayout';
import { signUp } from '@/services/auth.service';

function isValidEmail(email: string): boolean {
  const trimmed = email.trim().toLowerCase();
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed)) return false;
  const [local, domain] = trimmed.split('@');
  if (local.length < 3) return false;
  const parts = domain.split('.');
  const tld = parts[parts.length - 1];
  const domainName = parts.slice(0, -1).join('.');
  if (tld.length < 2) return false;
  if (domainName.length < 2) return false;
  if (/^[0-9]+$/.test(domainName)) return false;
  return true;
}

export default function SignupPage() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [major, setMajor] = useState('');
  const [gradYear, setGradYear] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const passwordChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
    match: password.length > 0 && password === confirmPassword,
  };
  const allPasswordOk = Object.values(passwordChecks).every(Boolean);
  const showPasswordChecklist = password.length > 0 || confirmPassword.length > 0;

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required.';
    if (!email.trim()) errs.email = 'Email is required.';
    else if (!isValidEmail(email)) errs.email = 'Please enter a valid school email.';
    if (!password) errs.password = 'Password is required.';
    else if (!allPasswordOk) errs.password = 'Password does not meet all requirements.';
    if (gradYear && !/^\d{4}$/.test(gradYear)) errs.gradYear = 'Grad year must be 4 digits.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      await signUp({
        email: email.trim(),
        password,
        name: name.trim(),
        username: username.trim() || undefined,
        major: major.trim() || undefined,
        gradYear: gradYear ? Number(gradYear) : undefined,
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('studysync.showWelcome', 'true');
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Signup failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join StudySync to coordinate study sessions with classmates."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-[#3B5BDB] font-semibold hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5" noValidate>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Name <span className="text-red-500">*</span></span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            aria-invalid={!!fieldErrors.name}
            aria-label="Name"
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
          />
          {fieldErrors.name && <span className="text-xs text-red-600">{fieldErrors.name}</span>}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">School email <span className="text-red-500">*</span></span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={!!fieldErrors.email}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
          />
          {fieldErrors.email && <span className="text-xs text-red-600">{fieldErrors.email}</span>}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Password <span className="text-red-500">*</span></span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            aria-invalid={!!fieldErrors.password}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Confirm password <span className="text-red-500">*</span></span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
          />
          {fieldErrors.password && <span className="text-xs text-red-600">{fieldErrors.password}</span>}
        </label>

        {showPasswordChecklist && (
          <ul className="flex flex-col gap-1 text-xs bg-gray-50 border border-gray-200 rounded-md px-3 py-2" aria-label="Password requirements">
            <PasswordCheckRow ok={passwordChecks.length} label="At least 8 characters" />
            <PasswordCheckRow ok={passwordChecks.upper} label="At least one uppercase letter" />
            <PasswordCheckRow ok={passwordChecks.lower} label="At least one lowercase letter" />
            <PasswordCheckRow ok={passwordChecks.number} label="At least one number" />
            <PasswordCheckRow ok={passwordChecks.symbol} label="At least one symbol" />
            <PasswordCheckRow ok={passwordChecks.match} label="Passwords match" />
          </ul>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">Username (optional)</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
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
              value={gradYear}
              onChange={(e) => setGradYear(e.target.value)}
              inputMode="numeric"
              maxLength={4}
              aria-invalid={!!fieldErrors.gradYear}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]/30 focus:border-[#3B5BDB]"
            />
            {fieldErrors.gradYear && <span className="text-xs text-red-600">{fieldErrors.gradYear}</span>}
          </label>
        </div>

        {formError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" role="alert">
            {formError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !allPasswordOk}
          className="bg-[#3B5BDB] text-white text-sm font-semibold py-2.5 rounded-md hover:bg-[#3451c7] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed mt-2"
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  );
}

function PasswordCheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-2 ${ok ? 'text-emerald-700' : 'text-gray-500'}`}>
      <span className={`inline-flex items-center justify-center w-4 h-4 text-[11px] font-bold ${ok ? 'text-emerald-600' : 'text-gray-400'}`} aria-hidden="true">
        {ok ? '✓' : '•'}
      </span>
      <span>{label}</span>
    </li>
  );
}
