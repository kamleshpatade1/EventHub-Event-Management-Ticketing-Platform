import { Link, useNavigate } from 'react-router';
import {
  ArrowRight,
  ArrowUpRight,
  MapPin,
  Menu,
  Search,
  X,
} from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../auth/useAuth.js';
import * as moments from '../vendor/taste-moments/lib.js';
import mountPinnedChapters from '../vendor/taste-moments/pinned-chapters/moment.js';
import '../vendor/taste-moments/pinned-chapters/moment.css';
import {
  fetchHomepageEvents,
  formatHomepageEvent,
  getCategoryPath,
  getEventSearchPath,
  getHomepageSectionState,
  homepageEventRequests,
} from './landingEvents.js';
import './landing.css';

const artwork = import.meta.env.BASE_URL + 'eventhub/';
const photoCategories = [
  { name: 'Comedy', image: 'comedy.webp' },
  { name: 'Workshops', image: 'workshops.webp' },
  { name: 'Art & Culture', image: 'arts.webp' },
];
const otherCategories = ['Music', 'Tech & Business', 'Sports', 'Food & Drinks'];

function useHomepageEvents(path) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      setLoading(true);
      setError('');

      try {
        const result = await fetchHomepageEvents(api, path);
        if (!cancelled) setEvents(result);
      } catch (requestError) {
        if (!cancelled) {
          setEvents([]);
          setError(
            requestError.message || 'Unable to load events. Please try again.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadEvents();
    return () => {
      cancelled = true;
    };
  }, [path, attempt]);

  return {
    events,
    loading,
    error,
    retry: () => setAttempt((previous) => previous + 1),
  };
}

function EventCard({ event }) {
  const details = formatHomepageEvent(event);

  return (
    <article className="eh-event">
      <div className="eh-event-cover">
        <img
          src={details.image}
          srcSet={`${details.image.replace('.webp', '-small.webp')} 384w, ${details.image} 768w`}
          sizes="(max-width: 530px) 90vw, (max-width: 800px) 45vw, (max-width: 1070px) 30vw, (max-width: 1340px) 23vw, 18vw"
          alt=""
          width="768"
          height="512"
          loading="lazy"
        />
      </div>
      <div className="eh-event-body">
        <div className="eh-event-meta">
          <span>{details.category}</span>
          <span>{details.price}</span>
        </div>
        <h3>
          <Link to={details.href}>{event.title}</Link>
        </h3>
        {event.description && (
          <p className="line-clamp-2">{event.description}</p>
        )}
        <p>{details.date}</p>
        <p className="eh-location">
          <MapPin size={15} aria-hidden="true" /> {details.location}
        </p>
      </div>
    </article>
  );
}

function EventSection({
  id,
  title,
  catalogPath,
  events,
  loading,
  error,
  retry,
}) {
  const state = getHomepageSectionState({ loading, error, events });

  return (
    <section id={id} className="eh-listings">
      <div className="eh-wrap">
        <div className="eh-section-head">
          <h2>{title}</h2>
          <Link className="eh-text-link" to={catalogPath}>
            View {title.toLowerCase()}{' '}
            <ArrowUpRight size={19} aria-hidden="true" />
          </Link>
        </div>
        {state === 'loading' && (
          <p className="eh-status" role="status">
            Loading {title.toLowerCase()}…
          </p>
        )}
        {state === 'empty' && (
          <p className="eh-status">
            There are no {title.toLowerCase()} listed yet.
          </p>
        )}
        {state === 'error' && (
          <div className="eh-status" role="status">
            <p>
              Unable to load {title.toLowerCase()}. {error}
            </p>
            <button className="eh-button" type="button" onClick={retry}>
              Retry
            </button>
          </div>
        )}
        {state === 'events' && (
          <div className="eh-event-grid">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

const journeyChapters = [
  {
    title: 'Pick a plan',
    text: 'Search by event name or browse a category. Check the date, venue and ticket price before you decide.',
    image: 'plans.webp',
  },
  {
    title: 'Book a ticket',
    text: 'Reserve a free spot or check out for a paid event. Your ticket appears in My bookings once your booking is confirmed.',
    image: 'doorway.webp',
  },
  {
    title: 'Head to the venue',
    text: 'Open your ticket code from My bookings and show it to the organizer at check-in.',
    image: 'show.webp',
  },
];

function EventJourney() {
  const section = useRef(null);

  useEffect(() => {
    if (typeof IntersectionObserver !== 'function') return;

    const moment = mountPinnedChapters(section.current, {}, moments);
    return () => moment.destroy?.();
  }, []);

  return (
    <section
      id="event-journey"
      className="eh-journey"
      data-moment="pinned-chapters"
      aria-labelledby="event-journey-heading"
      ref={section}
    >
      <div className="eh-wrap mo-pc__grid">
        <div className="mo-pc__text">
          <h2 id="event-journey-heading">From plans to the front door</h2>
          <ol className="mo-pc__steps">
            {journeyChapters.map(({ title, text, image }) => (
              <li key={title} className="mo-pc__step">
                <h3>{title}</h3>
                <p>
                  <span className="mo-pc__p-in">{text}</span>
                </p>
                <figure className="mo-pc__visual">
                  <img
                    src={artwork + 'stories/' + image}
                    alt=""
                    width="768"
                    height="512"
                    loading="lazy"
                  />
                </figure>
              </li>
            ))}
          </ol>
        </div>
        <div className="mo-pc__visuals" aria-hidden="true" />
      </div>
    </section>
  );
}

function CategoryGallery() {
  return (
    <section id="categories" className="eh-gallery">
      <div className="eh-wrap">
        <div className="eh-section-head">
          <h2>Browse by category</h2>
        </div>
        <div className="eh-gallery-grid">
          {photoCategories.map(({ name, image }) => (
            <Link key={name} className="eh-category" to={getCategoryPath(name)}>
              <div className="eh-category-image">
                <img
                  src={artwork + image}
                  alt=""
                  width="512"
                  height="1024"
                  loading="lazy"
                />
              </div>
              <span>
                {name}
                <ArrowUpRight size={22} aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
        <div className="eh-category-links">
          {otherCategories.map((name) => (
            <Link
              key={name}
              className="eh-text-link"
              to={getCategoryPath(name)}
            >
              {name} <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const menu = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [search, setSearch] = useState('');
  const upcoming = useHomepageEvents(homepageEventRequests.upcoming);
  const free = useHomepageEvents(homepageEventRequests.free);
  const paid = useHomepageEvents(homepageEventRequests.paid);
  const organizerPath =
    user?.role === 'ORGANIZER'
      ? '/organizer'
      : !user
        ? '/login?next=%2Forganizer'
        : null;

  async function handleLogout() {
    setLogoutError('');
    try {
      await api('/auth/logout', { method: 'POST' });
      setUser(null);
      menu.current?.close();
      navigate('/login');
    } catch (error) {
      setLogoutError(error.message || 'Logout failed. Please try again.');
    }
  }

  return (
    <div className="eh-home">
      <a href="#home-content" className="eh-skip">
        Skip to content
      </a>
      <header className="eh-header eh-wrap">
        <a href="#categories" className="eh-header-categories">
          Categories
        </a>
        <Link to="/" className="eh-wordmark" aria-label="EventHub home">
          EventHub<span>.</span>
        </Link>
        <button
          type="button"
          className="eh-menu-button"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          aria-controls="home-menu"
          onClick={() => {
            menu.current.showModal();
            setMenuOpen(true);
          }}
        >
          <Menu size={18} aria-hidden="true" /> Menu
        </button>
      </header>

      <dialog
        id="home-menu"
        className="eh-menu"
        ref={menu}
        aria-label="EventHub navigation"
        onClose={() => setMenuOpen(false)}
      >
        <button
          type="button"
          className="eh-menu-button"
          onClick={() => menu.current.close()}
        >
          <X size={18} aria-hidden="true" /> Close
        </button>
        <nav
          aria-label="Main navigation"
          onClick={(event) => {
            if (event.target.closest('a')) menu.current.close();
          }}
        >
          <Link to="/events">Explore events</Link>
          <a href="#categories">Browse categories</a>
          <a href="#event-journey">How tickets work</a>
          {user?.role === 'ORGANIZER' && (
            <Link to="/organizer">Organizer dashboard</Link>
          )}
          {user?.role === 'ADMIN' && <Link to="/admin">Admin dashboard</Link>}
          {user ? (
            <>
              <Link to="/my-bookings">My bookings</Link>
              <Link to="/profile">My profile</Link>
              <button
                type="button"
                className="eh-button"
                onClick={handleLogout}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/signup">Create an account</Link>
            </>
          )}
        </nav>
        {logoutError && <p role="alert">{logoutError}</p>}
      </dialog>

      <main id="home-content" tabIndex={-1}>
        <section className="eh-hero" data-enter aria-labelledby="home-headline">
          <img
            className="eh-hero-image"
            src={artwork + 'concert.webp'}
            srcSet={`${artwork}concert-small.webp 768w, ${artwork}concert.webp 1536w`}
            sizes="100vw"
            alt=""
            width="1536"
            height="1024"
            fetchPriority="high"
          />
          <div className="eh-wrap eh-hero-content">
            <div className="eh-hero-copy">
              <h1 id="home-headline">
                Find your next
                <br /> <em>live event.</em>
              </h1>
              <p>
                Find concerts, comedy and workshops. Book free and paid tickets.
              </p>
              <div className="eh-hero-actions">
                <Link className="eh-button" to="/events">
                  Explore events <ArrowRight size={20} aria-hidden="true" />
                </Link>
                <form
                  className="eh-search"
                  role="search"
                  onSubmit={(event) => {
                    event.preventDefault();
                    navigate(getEventSearchPath(search));
                  }}
                >
                  <input
                    type="search"
                    aria-label="Search by event title"
                    value={search}
                    placeholder="Search by event title"
                    maxLength={100}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  <button type="submit" aria-label="Search events">
                    <Search size={19} aria-hidden="true" />
                  </button>
                </form>
              </div>
            </div>
            <div className="eh-hero-links">
              <a href="#upcoming-events">
                Upcoming events <ArrowUpRight size={20} aria-hidden="true" />
              </a>
              <Link to="/events?pricing=free">
                Free events <ArrowUpRight size={20} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <EventSection
          id="upcoming-events"
          title="Upcoming events"
          catalogPath="/events"
          {...upcoming}
        />
        <EventJourney />
        <CategoryGallery />
        <EventSection
          id="free-events"
          title="Free events"
          catalogPath="/events?pricing=free"
          {...free}
        />
        <EventSection
          id="paid-events"
          title="Paid events"
          catalogPath="/events?pricing=paid"
          {...paid}
        />

        <section className="eh-food-story" aria-labelledby="food-story-heading">
          <img
            src={artwork + 'stories/after-hours.webp'}
            alt=""
            width="768"
            height="512"
            loading="lazy"
          />
          <div className="eh-wrap">
            <h2 id="food-story-heading">A night around the table</h2>
            <p>Find tastings, food markets and dinners to share.</p>
            <Link className="eh-button" to={getCategoryPath('Food & Drinks')}>
              Explore food events <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className="eh-organizers">
          <div className="eh-wrap eh-organizers-grid">
            <div>
              <h2>Tools for event organizers</h2>
              <p>
                Publish events, manage attendees, and check tickets at the door.
              </p>
              {organizerPath && (
                <Link className="eh-button" to={organizerPath}>
                  {user ? 'Open organizer dashboard' : 'Log in as an organizer'}
                  <ArrowUpRight size={20} aria-hidden="true" />
                </Link>
              )}
            </div>
            <img
              src={artwork + 'backstage.webp'}
              srcSet={`${artwork}backstage-small.webp 640w, ${artwork}backstage.webp 1024w`}
              sizes="(max-width: 720px) 90vw, 46vw"
              alt=""
              width="1024"
              height="682"
              loading="lazy"
            />
          </div>
        </section>
      </main>

      <footer className="eh-footer">
        <div className="eh-wrap">
          <Link to="/" className="eh-wordmark" aria-label="EventHub home">
            EventHub<span>.</span>
          </Link>
          <nav aria-label="Footer navigation">
            <Link to="/events">Events</Link>
            {organizerPath && <Link to={organizerPath}>Organizers</Link>}
            <Link to={user ? '/my-bookings' : '/login'}>
              {user ? 'My bookings' : 'Log in'}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
