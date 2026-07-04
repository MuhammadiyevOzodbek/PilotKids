// Backend API client — fetch wrapper.
// Base URL .env dan (VITE_API_URL), JWT token localStorage'dan har so'rovga qo'shiladi.
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'
const TOKEN_KEY = 'pilotkids_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// Backend {error} maydonini va HTTP statusni saqlaydigan xato tipi
export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (auth && token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    // Tarmoq/ulanish xatosi — backend ishga tushmagan bo'lishi mumkin
    throw new ApiError('Serverga ulanib bo\'lmadi. Internet yoki backend holatini tekshiring.', 0)
  }

  const text = await res.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!res.ok) {
    throw new ApiError(data?.error || 'So\'rovda xatolik yuz berdi', res.status)
  }
  return data
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
}
