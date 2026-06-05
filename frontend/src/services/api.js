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
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login:  (username, password, terminalGuid) => api.post('/auth/login',  { Username: username, Password: password, TerminalGuid: terminalGuid}),
  logout: (closingCash)        => api.post('/auth/logout', { ClosingCash: closingCash }),
  terminalActivate: (terminalCode)        => api.post('/auth/terminal-activate', { TerminalCode: terminalCode }),
};

export const productsApi = {
  getAll:      ()                       => api.get('/products'),
  search:      (q)                      => api.get('/products/search?q=' + encodeURIComponent(q)),
  byBarcode:   (b)                      => api.get('/products/barcode/' + encodeURIComponent(b)),
  lowStock:    ()                       => api.get('/products/lowstock'),
  create:      (body)                   => api.post('/products', body),
  update:      (id, body)               => api.put('/products/' + id, body),
  toggle:      (id, body)               => api.patch('/products/' + id + '/toggle', body),
  adjustStock: (id, adjustment, reason) => api.post('/products/' + id + '/stock', { Adjustment: adjustment, Reason: reason }),
  categories:  ()                       => api.get('/products/categories'),
  suppliers:   ()                       => api.get('/products/suppliers'),
  customers:   ()                       => api.get('/products/customers'),
};

export const transactionsApi = {
  sale:      (body)               => api.post('/transactions/sale', body),
  getById:   (id)                 => api.get('/transactions/' + id),
  byReceipt: (r)                  => api.get('/transactions/receipt/' + r),
  byRange:   (start, end)         => api.get('/transactions?startDate=' + start + '&endDate=' + end),
  void:      (id, reason)         => api.post('/transactions/' + id + '/void', { Reason: reason }),
  return:    (id, items, reason)  => api.post('/transactions/' + id + '/return', { Items: items, Reason: reason }),
};

export const reportsApi = {
  dashboard: ()            => api.get('/reports/dashboard'),
  xread:     ()            => api.get('/reports/xread'),
  zread:     (closingCash) => api.post('/reports/zread', { ClosingCash: closingCash }),
  summary:   (start, end)  => api.get('/reports/summary?startDate=' + start + '&endDate=' + end),
  sessions:  (date)        => api.get('/reports/sessions?date=' + date),
  getFastMovingItems: (start, end) => api.get('/reports/getFastMovingItems?startDate=' + start + '&endDate=' + end),
  getSlowMovingItems: (start, end) => api.get('/reports/getSlowMovingItems?startDate=' + start + '&endDate=' + end),
};

export const usersApi = {
  getAll: ()         => api.get('/users'),
  create: (body)     => api.post('/users', body),
  update: (id, body) => api.put('/users/' + id, body),
  toggle: (id)       => api.patch('/users/' + id + '/toggle'),
};

export default api;
