export function lockEvent(tx, eventId) {
  return tx.$queryRaw`
    SELECT "id"
    FROM "Event"
    WHERE "id" = ${eventId}::uuid
    FOR UPDATE
  `;
}
