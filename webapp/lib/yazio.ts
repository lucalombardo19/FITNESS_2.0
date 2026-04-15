const OAUTH_URL = 'https://yzapi.yazio.com/v5/oauth/token';
const API_BASE  = 'https://api.yazio.com/v1';
const USER_URL  = 'https://yzapi.yazio.com/v5/user';

// Public client credentials from yazio_public_api repo
const CLIENT_ID     = '1_4hiybetvfksgw40o0sog4s884kwc840wwso8go4k8c04goo4c';
const CLIENT_SECRET = '6rok2m65xuskgkgogw40wkkk8sw0osg84s8cggsc4woos4s8o';

export interface YazioTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string; // ISO datetime
}

export async function yazioLogin(username: string, password: string): Promise<YazioTokens> {
  const res = await fetch(OAUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, username, password, grant_type: 'password' }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Yazio login fallito (${res.status}): credenziali errate o account non valido`);
  }
  const data = await res.json();
  return {
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
    expires_at:    new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
}

export async function yazioRefresh(refresh_token: string): Promise<YazioTokens> {
  const res = await fetch(OAUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, refresh_token, grant_type: 'refresh_token' }),
  });
  if (!res.ok) throw new Error('Token Yazio scaduto — riconnetti il tuo account Yazio');
  const data = await res.json();
  return {
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
    expires_at:    new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
}

export async function yazioGetUser(access_token: string) {
  const res = await fetch(USER_URL, {
    headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Impossibile recuperare profilo Yazio');
  return res.json();
}

export async function yazioGetDiary(access_token: string) {
  const res = await fetch(`${API_BASE}/get_meals`, {
    headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Impossibile recuperare diario Yazio');
  return res.json();
}

export async function yazioLogMeal(access_token: string, mealDetails: string) {
  const res = await fetch(`${API_BASE}/log_meal`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mealDetails }),
  });
  if (!res.ok) throw new Error(`Errore log pasto Yazio (${res.status})`);
  return res.json();
}
