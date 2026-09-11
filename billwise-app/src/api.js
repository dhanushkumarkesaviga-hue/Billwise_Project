import { isJwtExpired } from './utils/tokenUtils';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const STORAGE_KEY = 'billwise_session_auth';
let memoryToken = null;

export function setApiToken(token) {
  memoryToken = token;
}

export function getToken() {
  if (memoryToken && !isJwtExpired(memoryToken)) return memoryToken;
  try {
    // Check sessionStorage (active browser tab session)
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.token && !isJwtExpired(parsed.token)) {
      memoryToken = parsed.token;
      return parsed.token;
    }
    // Token expired or invalid: purge
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('billwise_auth');
    localStorage.removeItem(STORAGE_KEY);
    memoryToken = null;
    return null;
  } catch {
    return null;
  }
}

export function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(res, isLoginRequest = false) {
  if ((res.status === 401 || res.status === 403) && !isLoginRequest) {
    // Token is invalid/expired
    memoryToken = null;
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('billwise_auth');
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('billwise:unauthorized', { detail: { reason: 'session_expired' } }));
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const authApi = {
  login: async (username, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await handleResponse(res, true);
    if (data?.token) {
      setApiToken(data.token);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      localStorage.removeItem('billwise_auth');
    }
    return data;
  },

  register: async (paramsOrUsername, email, password, role) => {
    let payload;
    if (typeof paramsOrUsername === 'object' && paramsOrUsername !== null) {
      payload = paramsOrUsername;
    } else {
      payload = { username: paramsOrUsername, email, password, role: role || 'ACCOUNTANT' };
    }

    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await handleResponse(res, true);
    if (data?.token) {
      setApiToken(data.token);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      localStorage.removeItem('billwise_auth');
    }
    return data;
  },

  googleLogin: async (googlePayload) => {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(googlePayload),
    });
    const data = await handleResponse(res, true);
    if (data?.token) {
      setApiToken(data.token);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      localStorage.removeItem('billwise_auth');
    }
    return data;
  },

  forgotPassword: async (identifier) => {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier }),
    });
    return handleResponse(res, true);
  },

  sendOtp: async (email, purpose = 'ADMIN_SIGNUP_VERIFICATION') => {
    const res = await fetch(`${API_BASE}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose }),
    });
    return handleResponse(res, true);
  },

  sendSignupOtp: async (email) => {
    const res = await fetch(`${API_BASE}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose: 'ADMIN_SIGNUP_VERIFICATION' }),
    });
    return handleResponse(res, true);
  },

  verifyOtp: async (email, otp, purpose = 'ADMIN_SIGNUP_VERIFICATION') => {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, purpose }),
    });
    return handleResponse(res, true);
  },

  verifySignupOtp: async (email, otp) => {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, purpose: 'ADMIN_SIGNUP_VERIFICATION' }),
    });
    return handleResponse(res, true);
  },

  requestPasswordReset: async ({ identifier, newPassword, phone, reason }) => {
    const res = await fetch(`${API_BASE}/auth/forgot-password/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, newPassword, phone, reason }),
    });
    return handleResponse(res, true);
  },

  checkPasswordResetStatus: async (identifier) => {
    const res = await fetch(`${API_BASE}/auth/forgot-password/status?identifier=${encodeURIComponent(identifier)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(res, true);
  },

  verifyResetOtp: async (identifier, otp) => {
    const res = await fetch(`${API_BASE}/auth/verify-reset-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, otp }),
    });
    return handleResponse(res, true);
  },

  resetPassword: async (identifier, otp, newPassword) => {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, otp, newPassword }),
    });
    return handleResponse(res, true);
  },

  me: () =>
    fetch(`${API_BASE}/auth/me`, {
      headers: { ...authHeaders() },
    }).then(r => handleResponse(r, false)),

  getPublicMerchants: () =>
    fetch(`${API_BASE}/auth/merchants-list`).then(r => handleResponse(r, false)),
};


export const merchantApi = {
  signup: (merchantData) =>
    fetch(`${API_BASE}/merchants/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merchantData),
    }).then(r => handleResponse(r, false)),

  resubmit: (merchantId, data) =>
    fetch(`${API_BASE}/merchants/${merchantId}/resubmit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    }).then(r => handleResponse(r, false)),

  getPending: () =>
    fetch(`${API_BASE}/merchants/pending`, {
      headers: { ...authHeaders() },
    }).then(r => handleResponse(r, false)),

  getAll: (status) => {
    const url = status ? `${API_BASE}/merchants/all?status=${status}` : `${API_BASE}/merchants/all`;
    return fetch(url, { headers: { ...authHeaders() } }).then(r => handleResponse(r, false));
  },

  approve: (merchantId, reason) =>
    fetch(`${API_BASE}/merchants/${merchantId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ reason }),
    }).then(r => handleResponse(r, false)),

  reject: (merchantId, reason) =>
    fetch(`${API_BASE}/merchants/${merchantId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ reason }),
    }).then(r => handleResponse(r, false)),

  suspend: (merchantId, reason) =>
    fetch(`${API_BASE}/merchants/${merchantId}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ reason }),
    }).then(r => handleResponse(r, false)),

  getLogs: (merchantId) =>
    fetch(`${API_BASE}/merchants/${merchantId}/logs`, {
      headers: { ...authHeaders() },
    }).then(r => handleResponse(r, false)),

  getMyBusiness: () =>
    fetch(`${API_BASE}/merchants/my-business`, {
      headers: { ...authHeaders() },
    }).then(r => handleResponse(r, false)),

  updateMyBusiness: (data) =>
    fetch(`${API_BASE}/merchants/my-business`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    }).then(r => handleResponse(r, false)),

  getStaff: () =>
    fetch(`${API_BASE}/merchants/staff`, {
      headers: { ...authHeaders() },
    }).then(r => handleResponse(r, false)),

  createStaff: (staffData) =>
    fetch(`${API_BASE}/merchants/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(staffData),
    }).then(r => handleResponse(r, false)),

  toggleStaffStatus: (staffUserId, enabled) =>
    fetch(`${API_BASE}/merchants/staff/${staffUserId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ enabled }),
    }).then(r => handleResponse(r, false)),

  verifyStaff: (staffUserId, verified) =>
    fetch(`${API_BASE}/merchants/staff/${staffUserId}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ verified }),
    }).then(r => handleResponse(r, false)),

  deleteStaff: (staffUserId) =>
    fetch(`${API_BASE}/merchants/staff/${staffUserId}`, {
      method: 'DELETE',
      headers: { ...authHeaders() },
    }).then(r => handleResponse(r, false)),

  getPendingPasswordResets: () =>
    fetch(`${API_BASE}/merchants/password-resets/pending`, {
      headers: { ...authHeaders() },
    }).then(r => handleResponse(r, false)),

  getAllPasswordResets: () =>
    fetch(`${API_BASE}/merchants/password-resets/all`, {
      headers: { ...authHeaders() },
    }).then(r => handleResponse(r, false)),

  approvePasswordReset: (requestId, note) =>
    fetch(`${API_BASE}/merchants/password-resets/${requestId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ note }),
    }).then(r => handleResponse(r, false)),

  rejectPasswordReset: (requestId, reason) =>
    fetch(`${API_BASE}/merchants/password-resets/${requestId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ note: reason }),
    }).then(r => handleResponse(r, false)),
};


export const userApi = {
  getMe: () =>
    fetch(`${API_BASE}/users/me`, {
      headers: { ...authHeaders() },
    }).then(r => handleResponse(r, false)),

  sendEmailChangeOtp: (newEmail) =>
    fetch(`${API_BASE}/users/me/send-email-change-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ newEmail }),
    }).then(r => handleResponse(r, false)),

  updateProfile: (profileData) =>
    fetch(`${API_BASE}/users/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(profileData),
    }).then(r => handleResponse(r, false)),

  changePassword: (currentPassword, newPassword) =>
    fetch(`${API_BASE}/users/me/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ currentPassword, newPassword }),
    }).then(r => handleResponse(r, false)),

  getSettings: () =>
    fetch(`${API_BASE}/users/me/settings`, {
      headers: { ...authHeaders() },
    }).then(r => handleResponse(r, false)),

  updateSettings: (settingsData) =>
    fetch(`${API_BASE}/users/me/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(settingsData),
    }).then(r => handleResponse(r, false)),
};

export const invoiceApi = {
  getAll: () => fetch(`${API_BASE}/invoices`, { headers: { ...authHeaders() } }).then(r => handleResponse(r, false)),

  getById: (id) => fetch(`${API_BASE}/invoices/${id}`, { headers: { ...authHeaders() } }).then(r => handleResponse(r, false)),

  create: (invoice) =>
    fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(invoice),
    }).then(r => handleResponse(r, false)),

  update: (id, invoice) =>
    fetch(`${API_BASE}/invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(invoice),
    }).then(r => handleResponse(r, false)),

  updateStatus: (id, { status, paymentStatus }) =>
    fetch(`${API_BASE}/invoices/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ status, paymentStatus }),
    }).then(r => handleResponse(r, false)),

  remove: (id) =>
    fetch(`${API_BASE}/invoices/${id}`, { method: 'DELETE', headers: { ...authHeaders() } }).then(r => handleResponse(r, false)),

  requestDeletion: (invoiceId, reason) =>
    fetch(`${API_BASE}/invoices/${invoiceId}/deletion-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ reason }),
    }).then(r => handleResponse(r, false)),

  getDeletionRequests: (status) => {
    const url = status ? `${API_BASE}/invoices/deletion-requests?status=${status}` : `${API_BASE}/invoices/deletion-requests`;
    return fetch(url, { headers: { ...authHeaders() } }).then(r => handleResponse(r, false));
  },

  approveDeletionRequest: (requestId, reviewRemarks) =>
    fetch(`${API_BASE}/invoices/deletion-requests/${requestId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ reviewRemarks }),
    }).then(r => handleResponse(r, false)),

  rejectDeletionRequest: (requestId, reviewRemarks) =>
    fetch(`${API_BASE}/invoices/deletion-requests/${requestId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ reviewRemarks }),
    }).then(r => handleResponse(r, false)),

  getStats: () => fetch(`${API_BASE}/invoices/stats`, { headers: { ...authHeaders() } }).then(r => handleResponse(r, false)),

  classify: (ocrText, vendorNameHint) =>
    fetch(`${API_BASE}/invoices/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ ocrText, vendorNameHint }),
    }).then(r => handleResponse(r, false)),

  deduplicate: () =>
    fetch(`${API_BASE}/invoices/deduplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    }).then(r => handleResponse(r, false)),

  extractVlm: (payload) =>
    fetch(`${API_BASE}/invoices/extract-vlm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
    }).then(r => handleResponse(r, false)),
};

export const deadlineApi = {
  getAll: () => fetch(`${API_BASE}/deadlines`, { headers: { ...authHeaders() } }).then(r => handleResponse(r, false)),
  getPersonalized: () => fetch(`${API_BASE}/deadlines/personalized`, { headers: { ...authHeaders() } }).then(r => handleResponse(r, false)),
  triggerTestReminder: () =>
    fetch(`${API_BASE}/deadlines/trigger-reminder-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    }).then(r => handleResponse(r, false)),
  updatePreferences: (payload) =>
    fetch(`${API_BASE}/deadlines/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
    }).then(r => handleResponse(r, false)),
};

export const copilotApi = {
  getSessionId: (username = '') => {
    let cleanUser = username;
    if (!cleanUser) {
      try {
        const stored = JSON.parse(sessionStorage.getItem('billwise_auth') || localStorage.getItem('billwise_auth') || '{}');
        cleanUser = stored?.username || 'anonymous';
      } catch (e) {
        cleanUser = 'anonymous';
      }
    }
    const storageKey = `billwise_copilot_session_${cleanUser}`;
    let sessionId = localStorage.getItem(storageKey);
    if (!sessionId) {
      sessionId = `${cleanUser}_${crypto.randomUUID()}`;
      localStorage.setItem(storageKey, sessionId);
    }
    return sessionId;
  },

  getHistory: (sessionId) =>
    fetch(`${API_BASE}/copilot/history/${sessionId}`, { headers: { ...authHeaders() } }).then(r => handleResponse(r, false)),

  sendMessage: (sessionId, message) =>
    fetch(`${API_BASE}/copilot/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ sessionId, message }),
    }).then(r => handleResponse(r, false)),

  clearHistory: (sessionId) =>
    fetch(`${API_BASE}/copilot/history/${sessionId}`, { method: 'DELETE', headers: { ...authHeaders() } }).then(r => handleResponse(r, false)),
};

export const salesInvoiceApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.from) query.append('from', params.from);
    if (params.to) query.append('to', params.to);
    if (params.status) query.append('status', params.status);
    if (params.supplyType) query.append('supplyType', params.supplyType);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetch(`${API_BASE}/sales-invoices${qs}`, { headers: { ...authHeaders() } }).then(r => handleResponse(r, false));
  },

  getById: (id) =>
    fetch(`${API_BASE}/sales-invoices/${id}`, { headers: { ...authHeaders() } }).then(r => handleResponse(r, false)),

  create: (invoice) =>
    fetch(`${API_BASE}/sales-invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(invoice),
    }).then(r => handleResponse(r, false)),

  update: (id, invoice) =>
    fetch(`${API_BASE}/sales-invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(invoice),
    }).then(r => handleResponse(r, false)),

  remove: (id) =>
    fetch(`${API_BASE}/sales-invoices/${id}`, {
      method: 'DELETE',
      headers: { ...authHeaders() },
    }).then(r => handleResponse(r, false)),

  getStats: () =>
    fetch(`${API_BASE}/sales-invoices/stats`, { headers: { ...authHeaders() } }).then(r => handleResponse(r, false)),

  getGstr3bSummary: (from, to) => {
    const query = new URLSearchParams();
    if (from) query.append('from', from);
    if (to) query.append('to', to);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetch(`${API_BASE}/sales-invoices/gstr3b-summary${qs}`, { headers: { ...authHeaders() } }).then(r => handleResponse(r, false));
  },

  getGstr1Summary: (from, to) => {
    const query = new URLSearchParams();
    if (from) query.append('from', from);
    if (to) query.append('to', to);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetch(`${API_BASE}/sales-invoices/gstr1-summary${qs}`, { headers: { ...authHeaders() } }).then(r => handleResponse(r, false));
  },
};
