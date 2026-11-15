import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, CheckCircle2, User } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../auth/useAuth.js';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }

    setSaving(true);

    try {
      const response = await api('/auth/me', {
        method: 'PATCH',
        body: { name: name.trim() },
      });

      setUser(response.data);
      setName(response.data.name);
      setSuccess('Your name has been updated.');
    } catch (err) {
      setError(err.message || 'Could not update your name.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f3eee6] text-[#211c18]">
      <Navbar />

      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#63564b] hover:text-[#9f3b27] transition-colors"
        >
          <ArrowLeft size={14} /> Back to home
        </Link>

        <div className="mt-6 rounded-2xl border border-[#d4c7b9] bg-white p-7 shadow-xs sm:p-9">
          <div className="flex items-center gap-3.5 border-b border-[#eadecc] pb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f5e9e2] text-[#9f3b27]">
              <User size={22} />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-[#211c18] sm:text-3xl">
                My Profile
              </h1>
              <p className="text-xs text-[#63564b]">
                Manage your account credentials and personal details.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="profile-name"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#63564b]"
              >
                Full Name
              </label>
              <input
                id="profile-name"
                name="name"
                type="text"
                autoComplete="name"
                maxLength={100}
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-11 w-full rounded-xl border border-[#d4c7b9] bg-white px-3.5 text-sm text-[#211c18] outline-none placeholder:text-[#8c7d70] focus:border-[#9f3b27] focus:ring-1 focus:ring-[#9f3b27] transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#63564b]"
              >
                Email Address
              </label>
              <input
                id="profile-email"
                type="email"
                value={user?.email ?? ''}
                readOnly
                className="h-11 w-full rounded-xl border border-[#eadecc] bg-[#faf7f2] px-3.5 text-sm text-[#63564b] cursor-not-allowed"
              />
              <p className="mt-1 text-[11px] text-[#8c7d70]">
                Email is tied to your login and cannot be altered directly.
              </p>
            </div>

            {user?.role && (
              <div>
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#63564b]">
                  Account Role
                </span>
                <span className="inline-flex rounded-full bg-[#f5e9e2] px-3 py-1 text-xs font-semibold text-[#9f3b27]">
                  {user.role}
                </span>
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-[#f4bebe] bg-[#fbebe8] p-3 text-xs text-[#9f3b27]"
              >
                {error}
              </p>
            )}

            {success && (
              <p
                role="status"
                className="flex items-center gap-1.5 rounded-lg border border-[#a3d9b8] bg-[#e8f5ec] p-3 text-xs font-medium text-[#1b6e49]"
              >
                <CheckCircle2 size={16} /> {success}
              </p>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="h-11 rounded-full bg-[#9f3b27] px-6 text-sm font-semibold text-[#fff4e8] transition hover:bg-[#852f1e] disabled:cursor-not-allowed disabled:opacity-60 shadow-xs"
              >
                {saving ? 'Saving changes...' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
