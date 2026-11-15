import { Link } from 'react-router';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { statusLabel } from './bookingUtils.js';

export function BookingPageFrame({ children, subtitle, title }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f3eee6] text-[#211c18]">
      <Navbar />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-extrabold tracking-tight text-[#211c18] sm:text-4xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#63564b] sm:text-base">
              {subtitle}
            </p>
          )}
        </div>
        {children}
      </main>

      <Footer />
    </div>
  );
}

export function Panel({ children, className = '' }) {
  return (
    <section
      className={`rounded-2xl border border-[#d4c7b9] bg-white p-6 shadow-xs sm:p-7 ${className}`}
    >
      {children}
    </section>
  );
}

export function Alert({ children, tone = 'error' }) {
  const toneClass =
    tone === 'success'
      ? 'border-[#a3d9b8] bg-[#e8f5ec] text-[#1b6e49]'
      : tone === 'info'
        ? 'border-[#d4c7b9] bg-[#faf7f2] text-[#63564b]'
        : 'border-[#f4bebe] bg-[#fbebe8] text-[#9f3b27]';

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${toneClass}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  );
}

export function LoadingState({ label = 'Loading booking information…' }) {
  return (
    <p
      aria-live="polite"
      className="py-10 text-center text-sm font-medium text-[#63564b]"
    >
      {label}
    </p>
  );
}

export function ErrorMessage({ error }) {
  if (error?.status === 401 || error?.code === 'UNAUTHENTICATED') {
    return (
      <Alert>
        Your session has expired or you are not signed in.{' '}
        <Link className="font-bold underline underline-offset-4" to="/login">
          Sign in
        </Link>{' '}
        to view your bookings.
      </Alert>
    );
  }

  if (error?.status === 404) {
    return <Alert>This booking could not be found.</Alert>;
  }

  return (
    <Alert>{error?.message ?? 'Something went wrong. Please try again.'}</Alert>
  );
}

export function StatusBadge({ status }) {
  const className =
    {
      PENDING_PAYMENT: 'border-[#f4d19b] bg-[#fef3e2] text-[#a36209]',
      CONFIRMED: 'border-[#a3d9b8] bg-[#e8f5ec] text-[#1b6e49]',
      CANCELLED: 'border-[#d4c7b9] bg-[#faf7f2] text-[#63564b]',
      EXPIRED: 'border-[#d4c7b9] bg-[#faf7f2] text-[#8c7d70]',
      REFUND_REQUIRED: 'border-[#f4bebe] bg-[#fbebe8] text-[#9f3b27]',
      REFUNDED: 'border-[#b8d4f4] bg-[#edf4fe] text-[#1d4ed8]',
    }[status] ?? 'border-[#d4c7b9] bg-[#faf7f2] text-[#63564b]';

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${className}`}
    >
      {statusLabel(status)}
    </span>
  );
}
