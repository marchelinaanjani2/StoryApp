import CONFIG from '../config';
import { getAccessToken } from '../utils/auth';


const ENDPOINTS = {
  // Auth
  REGISTER: `${CONFIG.BASE_URL}/register`,
  LOGIN: `${CONFIG.BASE_URL}/login`,
};


export async function addStory({ description, photo, lat, lon }) {
  const accessToken = getAccessToken();
  const formData = new FormData();
  formData.append('description', description);
  formData.append('photo', photo);
  if (lat) formData.append('lat', lat);
  if (lon) formData.append('lon', lon);

  const fetchResponse = await fetch(`${CONFIG.BASE_URL}/stories`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });
  const json = await fetchResponse.json();

  return {
    ...json,
    ok: fetchResponse.ok,
  };
}

export async function getMyUserInfo() {
  const accessToken = getAccessToken();

  const fetchResponse = await fetch(`${CONFIG.BASE_URL}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await fetchResponse.json();

  return {
    ...json,
    ok: fetchResponse.ok,
  };
}

export async function getStoryById(id) {
  const accessToken = getAccessToken();
  const fetchResponse = await fetch(`${CONFIG.BASE_URL}/stories/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await fetchResponse.json();

  return {
    ...json,
    ok: fetchResponse.ok,
  };
}


export async function getAllStorys({ page = 1, size = 10, location = 0 } = {}) {
  const accessToken = getAccessToken();
  const fetchResponse = await fetch(`${CONFIG.BASE_URL}/stories?page=${page}&size=${size}&location=${location}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await fetchResponse.json();

  if (!data.error) {
    return data.listStory;
  }
  throw new Error(data.message);
}

export async function getAllStories({ page = 1, size = 10, location = 0 } = {}) {
  const accessToken = getAccessToken();
  const fetchResponse = await fetch(`${CONFIG.BASE_URL}/stories?page=${page}&size=${size}&location=${location}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await fetchResponse.json();

  if (!data.error) {
    return data.listStory;
  }
  throw new Error(data.message);
}


export async function getRegistered({ name, email, password }) {
  const data = JSON.stringify({ name, email, password });

  const fetchResponse = await fetch(ENDPOINTS.REGISTER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data,
  });
  const json = await fetchResponse.json();

  return {
    ...json,
    ok: fetchResponse.ok,
  };
}

export async function getLogin({ email, password }) {
  const data = JSON.stringify({ email, password });

  const fetchResponse = await fetch(ENDPOINTS.LOGIN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data,
  });
  const json = await fetchResponse.json();

  return {
    ...json,
    ok: fetchResponse.ok,
  };
}


export async function storeNewStory({
  title,
  description,
  Image,
  latitude,
  longitude,
}) {
  const accessToken = getAccessToken();

  const formData = new FormData();
  formData.set('title', title);
  formData.set('description', description);
  formData.set('latitude', latitude);
  formData.set('longitude', longitude);
  Image.forEach((Image) => {
    formData.append('image', Image);
  });

  const fetchResponse = await fetch(`${CONFIG.BASE_URL}/reports`, {
     method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });
  const json = await fetchResponse.json();

  return {
    ...json,
    ok: fetchResponse.ok,
  };
}


export async function subscribePushNotification({ endpoint, keys: { p256dh, auth } }) {
  const accessToken = getAccessToken();
  const data = JSON.stringify({
    endpoint,
    keys: { p256dh, auth },
  });


  const fetchResponse = await fetch(`${CONFIG.BASE_URL}/notifications/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: data,
    cache: 'no-store'
  });
  const json = await fetchResponse.json();

  return {
    ...json,
    ok: fetchResponse.ok,
  };
}


export async function unsubscribePushNotification({ endpoint }) {
  const accessToken = getAccessToken();
  const data = JSON.stringify({ endpoint });

  const fetchResponse = await fetch(`${CONFIG.BASE_URL}/notifications/subscribe`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: data,
    cache: 'no-store'
  });
  const json = await fetchResponse.json();

  return {
    ...json,
    ok: fetchResponse.ok,
  };
}

