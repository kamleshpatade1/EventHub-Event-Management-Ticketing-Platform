import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Menu, User, X, LogOut } from 'lucide-react';
import { useAuth } from '../auth/useAuth.js';
import { api } from '../lib/api.js';

export default function Navbar() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await api('/auth/logout', { method: 'POST' });
      setUser(null);
      setMobileMenuOpen(false);
      navigate('/login');
    } catch {
      // Continue navigation on logout failure
      setUser(null);
      navigate('/login');
    } finally {
      setLoggingOut(false);
    }
  }

  const isActive = (path) =>
    location.pathname === path ||
    (path !== '/' && location.pathname.startsWith(path));

  return (
    <header className="sticky top-0 z-40 border-b border-[#d4c7b9]/70 bg-[#f3eee6]/95 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="font-serif text-2xl font-extrabold tracking-tight text-[#211c18] transition-opacity hover:opacity-90"
            aria-label="EventHub home"
          >
            EventHub<span className="text-[#9f3b27]">.</span>
          </Link>

          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Main navigation"
          >
            <Link
              to="/events"
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                isActive('/events')
                  ? 'bg-[#211c18] text-[#fff4e8]'
                  : 'text-[#63564b] hover:bg-[#eadecc]/60 hover:text-[#211c18]'
              }`}
            >
              Explore events
            </Link>

            {user && (
              <Link
                to="/my-bookings"
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  isActive('/my-bookings') || isActive('/bookings')
                    ? 'bg-[#211c18] text-[#fff4e8]'
                    : 'text-[#63564b] hover:bg-[#eadecc]/60 hover:text-[#211c18]'
                }`}
              >
                My bookings
              </Link>
            )}

            {user?.role === 'ORGANIZER' && (
              <Link
                to="/organizer"
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  isActive('/organizer')
                    ? 'bg-[#211c18] text-[#fff4e8]'
                    : 'text-[#63564b] hover:bg-[#eadecc]/60 hover:text-[#211c18]'
                }`}
              >
                Organizer workspace
              </Link>
            )}

            {user?.role === 'ADMIN' && (
              <Link
                to="/admin"
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  isActive('/admin')
                    ? 'bg-[#211c18] text-[#fff4e8]'
                    : 'text-[#63564b] hover:bg-[#eadecc]/60 hover:text-[#211c18]'
                }`}
              >
                Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/profile"
                className={`inline-flex items-center gap-2 rounded-full border border-[#d4c7b9] px-3.5 py-1.5 text-sm font-medium text-[#211c18] transition-colors hover:bg-[#eadecc]/50 ${
                  isActive('/profile')
                    ? 'border-[#9f3b27] bg-[#fbf8f4]'
                    : 'bg-[#ffffff]/80'
                }`}
              >
                <User size={15} className="text-[#9f3b27]" aria-hidden="true" />
                <span className="max-w-[140px] truncate">
                  {user.name || user.email}
                </span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                aria-label="Log out"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d4c7b9] bg-[#ffffff]/80 text-[#63564b] transition-colors hover:border-[#9f3b27] hover:text-[#9f3b27] disabled:opacity-50"
              >
                <LogOut size={15} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-full px-4 py-1.5 text-sm font-medium text-[#211c18] transition-colors hover:bg-[#eadecc]/60"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center rounded-full bg-[#9f3b27] px-4 py-1.5 text-sm font-medium text-[#fff4e8] transition-colors hover:bg-[#852f1e]"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d4c7b9] bg-[#ffffff]/80 text-[#211c18] md:hidden"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-b border-[#d4c7b9] bg-[#f3eee6] px-4 pb-6 pt-2 shadow-lg md:hidden">
          <nav className="flex flex-col gap-2">
            <Link
              to="/events"
              onClick={() => setMobileMenuOpen(false)}
              className={`rounded-xl px-4 py-2.5 text-base font-medium transition-colors ${
                isActive('/events')
                  ? 'bg-[#211c18] text-[#fff4e8]'
                  : 'text-[#211c18] hover:bg-[#eadecc]'
              }`}
            >
              Explore events
            </Link>

            {user && (
              <>
                <Link
                  to="/my-bookings"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-xl px-4 py-2.5 text-base font-medium transition-colors ${
                    isActive('/my-bookings')
                      ? 'bg-[#211c18] text-[#fff4e8]'
                      : 'text-[#211c18] hover:bg-[#eadecc]'
                  }`}
                >
                  My bookings
                </Link>

                {user.role === 'ORGANIZER' && (
                  <Link
                    to="/organizer"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`rounded-xl px-4 py-2.5 text-base font-medium transition-colors ${
                      isActive('/organizer')
                        ? 'bg-[#211c18] text-[#fff4e8]'
                        : 'text-[#211c18] hover:bg-[#eadecc]'
                    }`}
                  >
                    Organizer workspace
                  </Link>
                )}

                {user.role === 'ADMIN' && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`rounded-xl px-4 py-2.5 text-base font-medium transition-colors ${
                      isActive('/admin')
                        ? 'bg-[#211c18] text-[#fff4e8]'
                        : 'text-[#211c18] hover:bg-[#eadecc]'
                    }`}
                  >
                    Admin dashboard
                  </Link>
                )}

                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-xl px-4 py-2.5 text-base font-medium transition-colors ${
                    isActive('/profile')
                      ? 'bg-[#211c18] text-[#fff4e8]'
                      : 'text-[#211c18] hover:bg-[#eadecc]'
                  }`}
                >
                  Profile ({user.name || user.email})
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-2 flex w-full items-center gap-2 rounded-xl border border-[#d4c7b9] bg-white px-4 py-2.5 text-left text-base font-medium text-[#9f3b27]"
                >
                  <LogOut size={18} />
                  Log out
                </button>
              </>
            )}

            {!user && (
              <div className="mt-3 flex flex-col gap-2 pt-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl border border-[#d4c7b9] bg-white px-4 py-2.5 text-center text-base font-medium text-[#211c18]"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl bg-[#9f3b27] px-4 py-2.5 text-center text-base font-medium text-[#fff4e8]"
                >
                  Create an account
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
