

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

function log(...args) { console.log('[auth-e2e]', ...args); }

async function fetchJson(path, opts = {}) {
  const res = await fetch(`${SERVER_URL}${path}`, opts);
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch (e) { body = text; }
  return { status: res.status, body };
}

(async function run() {
  try {
    const unique = Date.now();
    const email = `test+${unique}@example.com`;
    const password = 'Test123!';

    log('1) Registering', email);
    const reg = await fetchJson('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, confirmPassword: password }),
    });
    log('register ->', reg.status, reg.body);
    if (![200,201].includes(reg.status)) {
      log('Registration failed — stop'); process.exit(1);
    }

    log('2) Logging in');
    const login = await fetchJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    log('login ->', login.status, login.body);
    if (login.status !== 200) { process.exit(2); }

    const accessToken = login.body.accessToken || login.body.token;
    const refreshToken = login.body.refreshToken;
    const sessionToken = login.body.sessionToken;

    if (!accessToken) { log('No access token returned'); process.exit(3); }

    log('3) Calling protected /api/auth/me with access token');
    const me = await fetchJson('/api/auth/me', { headers: { Authorization: `Bearer ${accessToken}` } });
    log('me ->', me.status, me.body);
    if (me.status !== 200) { process.exit(4); }

    log('4) Refreshing token');
    const ref = await fetchJson('/api/auth/refresh-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    log('refresh ->', ref.status, ref.body);
    if (ref.status !== 200) { process.exit(5); }
    const newAccessToken = ref.body.accessToken || ref.body.sessionToken || accessToken;

    log('5) Logging out (revoke session + refresh)');
    const out = await fetchJson('/api/auth/logout', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newAccessToken}`
      },
      body: JSON.stringify({ sessionToken, refreshToken }),
    });
    log('logout ->', out.status, out.body);

    log('6) Calling protected /api/auth/me with old access token (should fail)');
    const meOld = await fetchJson('/api/auth/me', { headers: { Authorization: `Bearer ${accessToken}` } });
    log('me after logout ->', meOld.status, meOld.body);

    if (meOld.status === 200) {
      log('ERROR: old access token still valid'); process.exit(6);
    }

    log('E2E flow completed — OK');
    process.exit(0);
  } catch (err) {
    console.error('Test failed', err);
    process.exit(99);
  }
})();
