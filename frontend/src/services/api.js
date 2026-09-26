import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = 'Bearer ' + token;
  return cfg;
});

api.interceptors.response.use(
  res => res,
  err => {
    const isLoginRequest = err.config?.url?.includes('/auth/login');
    if (err.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('sessionId');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

const requireHardwareAgent = () => {
  if (window.__hardwareAgentAvailable !== true) {
    return Promise.reject({ response: { data: { Message: 'Hardware agent is not connected. Sales are disabled.' } } });
  }
  return null;
};

export const authApi = {
  login: (username, password, terminalGuid) => api.post('/auth/login', { Username: username, Password: password, TerminalGuid: terminalGuid }),
  logout: (closingCash, endShift) => api.post('/auth/logout', { ClosingCash: closingCash, EndShift: endShift }),
  terminalActivate: terminalCode => api.post('/auth/terminal-activate', { TerminalCode: terminalCode }),
};
export const terminalsApi = { byMac: macAddress => api.get('/terminals/by-mac/' + encodeURIComponent(macAddress)) };
export const productsApi = {
  getAll: () => api.get('/products'), search: q => api.get('/products/search?q=' + encodeURIComponent(q)),
  byBarcode: b => api.get('/products/barcode/' + encodeURIComponent(b)), lowStock: () => api.get('/products/lowstock'),
  create: body => api.post('/products', body), update: (id, body) => api.put('/products/' + id, body),
  toggle: (id, body) => api.patch('/products/' + id + '/toggle', body),
  adjustStock: (id, adjustment, reason) => api.post('/products/' + id + '/stock', { Adjustment: adjustment, Reason: reason }),
  importProducts: formData => api.post('/products/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};
export const categoriesApi = { getAll: () => api.get('/categories'), create: body => api.post('/categories', body), update: (id, body) => api.put('/categories/' + id, body) };
export const suppliersApi = { getAll: () => api.get('/suppliers'), create: body => api.post('/suppliers', body), update: (id, body) => api.put('/suppliers/' + id, body) };
export const customersApi = { getAll: () => api.get('/customers'), create: body => api.post('/customers', body), update: (id, body) => api.put('/customers/' + id, body) };
export const transactionsApi = {
  sale: body => requireHardwareAgent() ?? api.post('/transactions/sale', body),
  getById: id => api.get('/transactions/' + id), byReceipt: r => api.get('/transactions/receipt/' + r),
  byRange: (start, end) => api.get('/transactions?startDate=' + start + '&endDate=' + end),
  void: (id, reason) => api.post('/transactions/' + id + '/void', { Reason: reason }),
  return: (id, items, reason) => api.post('/transactions/' + id + '/return', { Items: items, Reason: reason }),
};
export const receiptsApi = { list: params => api.get('/receipts', {params}) };
export const reportsApi = {
  lowStock: () => api.get('/reports/inventory/low-stock'),
  expiry: days => api.get('/reports/inventory/expiry?days='+days),
  dashboard: () => api.get('/reports/dashboard'), xread: () => api.get('/reports/xread'), zread: closingCash => api.post('/reports/zread', { ClosingCash }),
  summary: (start, end) => api.get('/reports/summary?startDate=' + start + '&endDate=' + end), sessions: date => api.get('/reports/sessions?date=' + date),
  getFastMovingItems: (start, end) => api.get('/reports/getFastMovingItems?startDate=' + start + '&endDate=' + end),
  getFastMovingItemsWithOffset: (start, end, pageNumber, pageSize) => api.get('/reports/getFastMovingItemsWithOffset?startDate=' + start + '&endDate=' + end + '&pageNumber=' + pageNumber + '&pageSize=' + pageSize),
  getSlowMovingItems: (start, end) => api.get('/reports/getSlowMovingItems?startDate=' + start + '&endDate=' + end),
  getSlowMovingItemsWithOffset: (start, end, pageNumber, pageSize) => api.get('/reports/getSlowMovingItemsWithOffset?startDate=' + start + '&endDate=' + end + '&pageNumber=' + pageNumber + '&pageSize=' + pageSize),
};
export const usersApi = { getAll: () => api.get('/users'), create: body => api.post('/users', body), update: (id, body) => api.put('/users/' + id, body), toggle: id => api.patch('/users/' + id + '/toggle') };
export default api;
