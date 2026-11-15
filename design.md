# EventHub homepage design

Event ticket discovery and booking software.

The homepage uses warm ivory, ink, and copper, with concert lighting supplying the most saturated color. Georgia lends an editorial voice to display headings. System sans keeps navigation, prices, and dates easy to scan.

## Scope

The public homepage serves visitors looking for an event and organizers returning to manage their events. The main action, **Explore events**, opens the existing catalog. [PRD](PRD.md) governs discovery, ticketing, and organizer access. [README](README.md) describes the existing application and its routes.

Delta Cafés is the reference for the full-width hero, lower-left display type, compact right-side navigation, and a rhythm of full-width editorial sections. AUGE Experience is the reference for horizontal image movement within a single gallery. EventHub uses its own copy, artwork, and motion timing. [Delta Cafés](https://deltacafes.com/en) · [AUGE Experience](https://auge-xp.com/)

## Page order

| Section                      | Content and behavior                                                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hero                         | One concert photograph with a lower-left headline, search by event title, and a catalog link. Two discovery shortcuts sit on the right when there is room. The headline enters once. |
| Upcoming events              | Photo cards show real listings from the public API, including title, date, venue, and price. Loading, empty, and retry states have distinct presentations.                           |
| From plans to the front door | Three photo chapters show how to pick an event, book a ticket, and check in.                                                                                                         |
| Browse by category           | Comedy, Workshops, and Art & Culture get photo links. Music, Tech & Business, Sports, and Food & Drinks use text links. All links use the catalog's existing category filter.        |
| Free and paid events         | Dedicated listing sections keep both existing ticket discovery paths available.                                                                                                      |
| A night around the table     | A full-width food market photo introduces the Food & Drinks catalog.                                                                                                                 |
| For organizers               | Backstage photography accompanies a link to the existing organizer dashboard. The dashboard handles access by role.                                                                  |

## Responsive behavior and motion

The hero fills the initial viewport and the editorial sections share the same content edges. The ticket story holds its panel in place on wide screens while native scroll advances the chapters. On smaller screens and with reduced motion, it presents all three chapters in order. The category gallery pans its photos inside the tiles on supported desktop browsers. Links stay in place and work with a keyboard.

## Artwork

Built-in ImageGen created the promotional stories and illustrative event covers. The homepage, catalog and detail page resolve an existing local cover key first, then match the event's category, then use a generic live event image.

| Asset                                        | Image direction                                                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `concert.webp`, `concert-small.webp`         | Wide concert crowd in India, amber spotlights and vermilion stage haze, clear dark space at left for type                       |
| `comedy.webp`, `workshops.webp`, `arts.webp` | Three editorial scenes from one source image, featuring a stand-up club, a ceramics workshop and a dance performance            |
| `backstage.webp`, `backstage-small.webp`     | A crew member at a venue mixing console under warm stage light                                                                  |
| `stories/*.webp`                             | Friends making plans over tea, approaching a concert hall, watching a live set, and sharing dishes at a night market            |
| `covers/*.webp`                              | Seven category covers for music, comedy, pottery, dance, makers, football, and food, plus an intimate live venue as the default |

Production images are stored under `client/public/eventhub` as WebP. The concert and backstage images offer smaller responsive sources. Below-the-fold artwork loads lazily.
