import { useState } from 'react';
import { Link } from 'react-router';
import concertImage from '../assets/eventhub-concert.jpg';

export function PasswordVisibilityIcon({ visible }) {
  return visible ? (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.2 0 8.7 4.6 9.5 6-.3.6-1.2 1.8-2.5 2.9M6.2 6.2C3.9 7.7 2.6 9.8 2.5 11c.8 1.4 4.3 6 9.5 6 1 0 2-.2 2.8-.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function AuthLayout({ children, footer, subtitle, title }) {
  const [failedTitle, setFailedTitle] = useState('');
  const imageFailed = failedTitle === title;

  return (
    <div className="min-h-screen w-full bg-[#f3eee6] text-[#211c18] lg:h-screen lg:overflow-hidden">
      <div className="flex min-h-screen w-full lg:h-full lg:min-h-0">
        <section className="flex min-h-screen w-full flex-col justify-between px-6 py-6 sm:px-10 sm:py-8 lg:h-full lg:min-h-0 lg:w-[48%] lg:px-12 lg:py-8 xl:px-16 overflow-y-auto">
          <header className="flex items-center justify-between">
            <Link
              to="/"
              className="font-serif text-2xl font-extrabold tracking-tight text-[#211c18]"
              aria-label="EventHub home"
            >
              EventHub<span className="text-[#9f3b27]">.</span>
            </Link>
            <Link
              to="/"
              className="text-xs font-semibold text-[#63564b] hover:text-[#9f3b27] transition-colors"
            >
              ← Back to home
            </Link>
          </header>

          <div className="my-auto py-8">
            <div className="mx-auto w-full max-w-md rounded-2xl border border-[#d4c7b9] bg-white p-7 shadow-xs sm:p-9">
              <div className="mb-6">
                <h1 className="font-serif text-3xl font-extrabold tracking-tight text-[#211c18] sm:text-4xl">
                  {title}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-[#63564b]">
                  {subtitle}
                </p>
              </div>

              {children}

              {footer && (
                <div className="mt-6 border-t border-[#eadecc] pt-5 text-center text-xs text-[#63564b]">
                  {footer}
                </div>
              )}
            </div>
          </div>

          <footer className="flex items-center justify-between gap-3 text-xs text-[#8c7d70]">
            <span>
              © {new Date().getFullYear()} EventHub. All rights reserved.
            </span>
            <a
              className="text-[#9f3b27] hover:underline focus-visible:outline-2"
              href="#privacy-policy"
            >
              Privacy Policy
            </a>
          </footer>
        </section>

        <aside className="relative hidden min-h-0 flex-1 bg-[#211c18] lg:block">
          <div className="relative size-full overflow-hidden">
            {!imageFailed && (
              <img
                alt="Concert crowd under warm live stage lighting"
                className="absolute inset-0 size-full object-cover object-center"
                onError={() => setFailedTitle(title)}
                src={concertImage}
              />
            )}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[#211c18] via-[#211c18]/60 to-[#211c18]/25"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[#9f3b27]/15 mix-blend-multiply"
            />

            <div className="absolute inset-x-0 bottom-0 z-10 p-10 pb-14 xl:p-16">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#fff4e8]/20 bg-[#211c18]/60 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#fff4e8] backdrop-blur-xs">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full bg-[#ff9979]"
                />
                Live experiences await
              </p>
              <h2 className="max-w-xl font-serif text-3xl font-extrabold leading-[1.1] text-[#fff4e8] sm:text-4xl xl:text-5xl">
                Every Event. One Destination.
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-[#d4c7b9] sm:text-base">
                Discover concerts, comedy, food pop-ups and creative workshops.
                Book tickets effortlessly with EventHub.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default AuthLayout;
