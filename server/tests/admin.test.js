import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { createTestAccessToken } from './fixtures/session.js';

process.env.JWT_ACCESS_SECRET ||= 'admin-integration-test-secret';

test(
  'admin roles and event visibility',
  { skip: !process.env.DATABASE_URL },
  async (t) => {
    const { default: app } = await import('../src/app.js');
    const { prisma } = await import('../src/db.js');
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const origin = `http://127.0.0.1:${server.address().port}`;
    const prefix = `admin-test-${randomUUID()}`;
    const [admin, target, organizer, buyer] = await Promise.all(
      ['ADMIN', 'ATTENDEE', 'ORGANIZER', 'ATTENDEE'].map((role, index) =>
        prisma.user.create({
          data: {
            name: `${prefix}-${index}`,
            email: `${prefix}-${index}@example.test`,
            passwordHash: 'not-used',
            role,
          },
        })
      )
    );
    const ids = [admin.id, target.id, organizer.id, buyer.id];
    t.after(async () => {
      try {
        await prisma.booking.deleteMany({ where: { userId: { in: ids } } });
        await prisma.event.deleteMany({ where: { organizerId: organizer.id } });
        await prisma.user.deleteMany({ where: { id: { in: ids } } });
      } finally {
        server.closeAllConnections();
        await new Promise((resolve) => server.close(resolve));
        await prisma.$disconnect();
      }
    });
    const [adminToken, targetToken, organizerToken, buyerToken] =
      await Promise.all(ids.map((id) => createTestAccessToken(prisma, id)));

    function api(
      path,
      {
        token = adminToken,
        body,
        method = body ? 'PATCH' : 'GET',
        requestOrigin = origin,
      } = {}
    ) {
      return fetch(`${origin}/api${path}`, {
        method,
        headers: {
          origin: requestOrigin,
          ...(token ? { cookie: `accessToken=${token}` } : {}),
          ...(body ? { 'content-type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    }

    await t.test(
      'lists safe user fields and enforces live role changes',
      async () => {
        assert.equal((await api('/admin/users', { token: null })).status, 401);
        assert.equal(
          (await api('/admin/users', { token: targetToken })).status,
          403
        );
        assert.equal(
          (await api('/admin/events', { token: organizerToken })).status,
          403
        );
        const response = await api(
          `/admin/users?q=${prefix}&role=ATTENDEE&limit=1`
        );
        assert.equal(response.status, 200);
        const { data, pagination } = await response.json();
        assert.equal(data.length, 1);
        assert.deepEqual(Object.keys(data[0]).sort(), [
          'createdAt',
          'email',
          'id',
          'name',
          'role',
        ]);
        assert.deepEqual(pagination, { page: 1, limit: 1, total: 2 });
        assert.equal((await api('/admin/users?role=invalid')).status, 400);
        const rolePath = `/admin/users/${target.id}/role`;
        const promote = { role: 'ORGANIZER' };
        assert.equal(
          (await api(rolePath, { token: targetToken, body: promote })).status,
          403
        );
        assert.equal(
          (
            await api(rolePath, {
              body: promote,
              requestOrigin: 'https://untrusted.example',
            })
          ).status,
          403
        );
        assert.equal(
          (await api(rolePath, { body: { role: 'ADMIN' } })).status,
          400
        );
        assert.equal(
          (
            await api(`/admin/users/${admin.id}/role`, {
              body: { role: 'ATTENDEE' },
            })
          ).status,
          403
        );
        assert.equal(
          (await api(`/admin/users/${randomUUID()}/role`, { body: promote }))
            .status,
          404
        );
        assert.equal(
          (await api('/organizer/events', { token: targetToken })).status,
          403
        );
        assert.equal((await api(rolePath, { body: promote })).status, 200);
        assert.equal(
          (await api('/organizer/events', { token: targetToken })).status,
          200
        );
        assert.equal(
          (await api(rolePath, { body: { role: 'ATTENDEE' } })).status,
          200
        );
        assert.equal(
          (await api('/organizer/events', { token: targetToken })).status,
          403
        );
      }
    );

    await t.test(
      'hides and restores an event without cancelling its tickets',
      async () => {
        const startAt = new Date(Date.now() + 30 * 60_000);
        const event = await prisma.event.create({
          data: {
            organizerId: organizer.id,
            title: prefix,
            description: 'Admin moderation test',
            category: 'Test',
            venue: 'Test venue',
            address: 'Test address',
            city: 'Test city',
            timezone: 'Asia/Kolkata',
            startAt,
            endAt: new Date(startAt.getTime() + 60 * 60_000),
            registrationClosesAt: startAt,
            capacity: 3,
            priceMinor: 0,
            currency: 'INR',
            status: 'PUBLISHED',
          },
        });
        const path = `/events/${event.id}`;
        const visibility = `/admin${path}/visibility`;
        const book = (token) =>
          api(`${path}/bookings`, { token, method: 'POST' });
        const bookingResponse = await book(buyerToken);
        assert.equal(bookingResponse.status, 201);
        const booking = (await bookingResponse.json()).data;
        const ticketPath = `/bookings/${booking.id}/ticket`;
        const ticketResponse = await api(ticketPath, { token: buyerToken });
        assert.equal(ticketResponse.status, 200);
        const { ticketCode } = (await ticketResponse.json()).data;
        const checkIn = () =>
          api(`/organizer${path}/check-ins`, {
            token: organizerToken,
            method: 'POST',
            body: { ticketCode },
          });

        assert.equal(
          (await api(visibility, { body: { hidden: true, reason: '   ' } }))
            .status,
          400
        );
        assert.equal(
          (
            await api(visibility, {
              token: organizerToken,
              body: { hidden: true, reason: 'Attempt' },
            })
          ).status,
          403
        );
        let hideRequest;
        let competingBooking;
        await prisma.$transaction(async (tx) => {
          const [{ pid }] = await tx.$queryRaw`SELECT pg_backend_pid() AS pid`;
          await tx.$queryRaw`SELECT "id" FROM "Event" WHERE "id" = ${event.id}::uuid FOR UPDATE`;
          hideRequest = api(visibility, {
            body: { hidden: true, reason: 'Review venue details' },
          });

          for (let attempt = 0; attempt < 100; attempt += 1) {
            const [{ blocked }] = await prisma.$queryRaw`
              SELECT EXISTS (
                SELECT 1 FROM pg_stat_activity
                WHERE wait_event_type = 'Lock' AND ${pid}::integer = ANY(pg_blocking_pids(pid))
              ) AS blocked
            `;
            if (blocked) {
              competingBooking = book(targetToken);
              return;
            }
            await delay(20);
          }
          assert.fail('Expected moderation to wait for the event lock');
        });
        const hide = await hideRequest;
        assert.equal(hide.status, 200);
        assert.equal((await competingBooking).status, 404);
        const hidden = (await hide.json()).data;
        assert.equal(hidden.moderatedBy.id, admin.id);
        assert.equal(hidden.moderationReason, 'Review venue details');
        assert.equal(hidden.moderatedAt, hidden.hiddenAt);
        const repeatedHide = await api(visibility, {
          body: { hidden: true, reason: 'Repeated request' },
        });
        assert.equal(repeatedHide.status, 200);
        assert.equal(
          (await repeatedHide.json()).data.moderationReason,
          hidden.moderationReason
        );
        assert.equal((await api(path, { token: null })).status, 404);
        const publicList = await api(`/events?q=${prefix}`, { token: null });
        assert.equal((await publicList.json()).data.length, 0);
        assert.equal((await book(targetToken)).status, 404);
        assert.equal(
          (await api(ticketPath, { token: buyerToken })).status,
          200
        );
        assert.equal((await checkIn()).status, 404);
        const list = await api(
          `/admin/events?q=${prefix}&status=PUBLISHED&hidden=true&limit=1`
        );
        assert.equal((await list.json()).data[0].id, event.id);

        const unhide = await api(visibility, {
          body: { hidden: false, reason: 'Venue details verified' },
        });
        assert.equal(unhide.status, 200);
        const restored = (await unhide.json()).data;
        assert.equal(restored.hiddenAt, null);
        assert.equal(restored.moderatedBy.id, admin.id);
        assert.equal(restored.moderationReason, 'Venue details verified');
        assert.ok(restored.moderatedAt);
        assert.equal((await api(path, { token: null })).status, 200);
        assert.equal((await book(targetToken)).status, 201);
        assert.equal((await checkIn()).status, 200);
      }
    );
  }
);
