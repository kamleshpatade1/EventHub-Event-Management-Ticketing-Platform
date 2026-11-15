import { Link } from 'react-router';
import { useAuth } from '../auth/useAuth.js';

export default function Footer() {
  const { user } = useAuth();

  return (
    <footer className="mt-auto border-t border-[#d4c7b9] bg-[#eadecc]/40 py-12 text-[#63564b]">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <Link
            to="/"
            className="font-serif text-2xl font-extrabold tracking-tight text-[#211c18]"
            aria-label="EventHub home"
          >
            EventHub<span className="text-[#9f3b27]">.</span>
          </Link>
          <p className="text-xs text-[#8c7d70]">
            Concerts, comedy, workshops and live experiences.
          </p>
        </div>

        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap justify-center gap-6 text-sm font-medium"
        >
          <Link
            to="/events"
            className="text-[#211c18] hover:text-[#9f3b27] transition-colors"
          >
            Explore events
          </Link>
          <Link
            to={user ? '/my-bookings' : '/login'}
            className="text-[#211c18] hover:text-[#9f3b27] transition-colors"
          >
            {user ? 'My bookings' : 'Log in'}
          </Link>
          {user?.role === 'ORGANIZER' && (
            <Link
              to="/organizer"
              className="text-[#211c18] hover:text-[#9f3b27] transition-colors"
            >
              Organizer workspace
            </Link>
          )}
          {user?.role === 'ADMIN' && (
            <Link
              to="/admin"
              className="text-[#211c18] hover:text-[#9f3b27] transition-colors"
            >
              Admin
            </Link>
          )}
        </nav>

        <p className="text-xs text-[#8c7d70]">
          © {new Date().getFullYear()} EventHub. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
