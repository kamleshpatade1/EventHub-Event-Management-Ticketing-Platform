let refreshInFlight;

function refreshAccess() {
  if (!refreshInFlight) {
    const refresh = async () => {
      // Another request or tab may have refreshed while this request was pending.
      const current = await fetch('/api/auth/me', { credentials: 'include' });
      if (current.status !== 401) return current;

      return fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
    };

    const locks = globalThis.navigator?.locks;
    refreshInFlight = (
      locks ? locks.request('eventhub-session', refresh) : refresh()
    ).finally(() => {
      refreshInFlight = undefined;
    });
  }
  return refreshInFlight;
}

export async function api(path, { body, headers, ...options } = {}) {
  const request = () =>
    fetch(`/api${path}`, {
      credentials: 'include',
      headers:
        body === undefined
          ? headers
          : { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      ...options,
    });

  let res = await request();

  // Access token lasts 15 minutes: refresh once and retry.
  if (
    res.status === 401 &&
    (path === '/auth/me' || !path.startsWith('/auth/'))
  ) {
    const refreshed = await refreshAccess();
    if (refreshed.ok) res = await request();
    else if (refreshed.status !== 401) res = refreshed.clone();
  }

  if (res.status === 204) return null;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(
      json.error?.message ?? json.message ?? 'Something went wrong.'
    );
    error.status = res.status;
    error.code = json.error?.code;
    error.fields = json.error?.fields ?? {};
    throw error;
  }
  return json;
}
