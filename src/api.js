import axios from 'axios';

const getApiBaseURL = () => {
  // 0) Explicit override via Vite env (if provided)
  try {
    const envUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
      ? import.meta.env.VITE_API_BASE_URL
      : null;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
      const trimmed = envUrl.replace(/\/+$/, '');
      return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
    }
  } catch {
    // ignore if import.meta is not available
  }

  // 1) Electron/file protocol (no hostname)
  if (typeof window !== 'undefined' && window.location?.protocol === 'file:') {
    return 'http://localhost:8000/api';
  }

  // 2) Default: use the SAME host as the frontend, port 8000
  //    Works for IPs, *.local, intranet DNS, etc.
  const host = (typeof window !== 'undefined' && window.location?.hostname)
    ? window.location.hostname
    : 'localhost';
  return `http://${host}:8000/api`;
};

export const api = axios.create({
  baseURL: getApiBaseURL(),
  timeout: 30000, // 30 seconds - increased for slow network/large responses
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

export const apiOrigin = (() => {
  try {
    const u = new URL(api.defaults.baseURL);
    return `${u.protocol}//${u.host}`;
  } catch {
    return 'http://localhost:8000';
  }
})();

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt');
    if (token && token !== 'null' && token !== 'undefined') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // FormData gönderildiğinde Content-Type header'ını kaldır
    // Axios otomatik olarak multipart/form-data boundary'sini ekler
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data
    });
    
    // 401 Unauthorized veya 500 + "Unauthenticated" - authentication hatası
    const isAuthError = error.response?.status === 401 || 
                       (error.response?.status === 500 && 
                        error.response?.data?.error === 'Unauthenticated.');
    
    if (isAuthError) {
      const hadToken = !!localStorage.getItem('jwt') && localStorage.getItem('jwt') !== 'null' && localStorage.getItem('jwt') !== 'undefined';
      localStorage.removeItem('jwt');
      console.error('Token geçersiz veya süresi dolmuş, oturum sonlandırıldı');

      // Login ekranında veya token yokken asla reload yapma
      const isLoginPage = window.location.pathname === '/login' || !hadToken;

      // Arka plan/ayarsal uç noktalar için de reload yapma
      const url = error.config?.url || '';
      const isBackgroundEndpoint = url.includes('/notifications') || url.includes('/history') || url.includes('/task-views') || url.includes('/task-types') || url.includes('/task-statuses');

      if (!isLoginPage && !isBackgroundEndpoint) {
        console.warn('Critical auth error, reloading page');
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

export async function login(email, password) {
  try {
    const { data } = await api.post('/login', { email, password });
    
    if (data.access_token) {
      localStorage.setItem('jwt', data.access_token);
      try {
        const me = await api.get('/user');
        return me.data;
      } catch (error) {
        console.warn('User fetch failed:', error);
        return data.user || data;
      }
    }
    
    return data;
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    throw error;
  }
}

export async function restore() {
  const token = localStorage.getItem('jwt');
  if (token && token !== 'null' && token !== 'undefined') {
    try {
      await api.get('/user');
      return true;
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 404) {
        localStorage.removeItem('jwt');
        return false;
      }
      throw error;
    }
  }
  return false;
}

// Laravel Sanctum doesn't have a refresh endpoint
// Token refresh is not supported in this implementation

export async function getUser() {
  try {
    const response = await api.get('/user');
    return response.data;
  } catch (error) {
    console.error('Get user error:', error.response?.data || error.message);
    throw error;
  }
}

export async function getUsers() {
  try {
    const response = await api.get('/users');
    return response.data.users;
  } catch (error) {
    console.error('Users fetch error:', error.response?.data || error.message);
    throw error;
  }
}

export async function changePassword(currentPassword, newPassword) {
  try {
    const response = await api.post('/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    });
    return response.data;
  } catch (error) {
    console.error('Change password error:', error.response?.data || error.message);
    throw error;
  }
}

// Email-based password reset flow removed. Use PasswordReset.requestReset + admin action.

export async function registerUser({ name, email, password, password_confirmation, role, leader_id }) {
  try {
    const requestData = {
      name,
      email,
      password,
      password_confirmation,
      role,
    };
    
    // leader_id varsa ekle
    if (leader_id !== null && leader_id !== undefined) {
      requestData.leader_id = leader_id;
    }
    
    const response = await api.post('/register', requestData);
    return response.data;
  } catch (error) {
    console.error('Register user error:', error.response?.data || error.message);
    throw error;
  }
}

export async function updateUserAdmin(id, payload) {
  try {
    const response = await api.put(`/users/${id}`, payload);
    return response.data;
  } catch (error) {
    console.error('Update user error:', error.response?.data || error.message);
    throw error;
  }
}

export async function deleteUserAdmin(id) {
  try {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  } catch (error) {
    console.error('Delete user error:', error.response?.data || error.message);
    throw error;
  }
}

export const Tasks = {
  list: async () => {
    try {
      const response = await api.get('/tasks');
      return response.data.tasks || response.data;
    } catch (error) {
      console.error('Tasks fetch error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  get: async (taskId) => {
    try {
      const response = await api.get(`/tasks/${taskId}`);
      return response.data.task || response.data;
    } catch (error) {
      console.error('Task fetch error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  create: async (taskData) => {
    try {
      const response = await api.post('/tasks', taskData);
      return response.data;
    } catch (error) {
      console.error('Task create error:', error.response?.data || error.message);
      throw error;
    }
  },

  update: async (taskId, taskData) => {
    try {
      const response = await api.put(`/tasks/${taskId}`, taskData);
      return response.data;
    } catch (error) {
      console.error('Task update error:', error.response?.data || error.message);
      throw error;
    }
  },

  assignUsers: async (taskId, userIds) => {
    try {
      const response = await api.put(`/tasks/${taskId}`, { assigned_users: userIds });
      return response.data;
    } catch (error) {
      console.error('Task assign users error:', error.response?.data || error.message);
      throw error;
    }
  },

  uploadAttachments: async (taskId, files, onProgress = null) => {
    try {
      const form = new FormData();
      form.append('_method', 'PUT');
      for (const f of files) form.append('attachments[]', f);
      const response = await api.post(`/tasks/${taskId}`, form, {
        // Content-Type header'ı interceptor tarafından otomatik olarak kaldırılacak
        timeout: 0, // large files: disable per-request timeout
        onUploadProgress: (e) => {
          if (typeof onProgress === 'function') {
            try {
              const total = e.total || e.srcElement?.getResponseHeader?.('Content-Length') || 0;
              const percent = total ? Math.min(100, Math.round((e.loaded * 100) / total)) : Math.round((e.loaded % (5 * 1024 * 1024)) / (5 * 1024 * 1024) * 100);
              onProgress(percent);
            } catch (error) {
              console.warn('Upload progress error:', error);
              onProgress(null);
            }
          }
        }
      });
      return response.data;
    } catch (error) {
      console.error('Task upload attachments error:', error.response?.data || error.message);
      throw error;
    }
  },

  delete: async (taskId) => {
    try {
      const response = await api.delete(`/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      console.error('Task delete error:', error.response?.data || error.message);
      throw error;
    }
  },

  accept: async (taskId) => {
    try {
      const response = await api.put(`/tasks/${taskId}/accept`);
      return response.data;
    } catch (error) {
      console.error('Task accept error:', error.response?.data || error.message);
      throw error;
    }
  },

  reject: async (taskId) => {
    try {
      const response = await api.put(`/tasks/${taskId}/reject`);
      return response.data;
    } catch (error) {
      console.error('Task reject error:', error.response?.data || error.message);
      throw error;
    }
  },

  toggleStatus: async (taskId) => {
    try {
      const response = await api.put(`/tasks/${taskId}/toggle-status`);
      return response.data;
    } catch (error) {
      console.error('Task toggle status error:', error.response?.data || error.message);
      throw error;
    }
  },

  markAsSeen: async (taskId) => {
    try {
      const response = await api.post(`/tasks/${taskId}/seen`);
      return response.data;
    } catch (error) {
      console.error('Task mark as seen error:', error.response?.data || error.message);
      throw error;
    }
  },

  recordView: async (taskId) => {
    try {
      const response = await api.post(`/tasks/${taskId}/view`);
      return response.data;
    } catch (error) {
      console.error('Task record view error:', error.response?.data || error.message);
      throw error;
    }
  },

  respond: async (taskId, response) => {
    try {
      const apiResponse = await api.post(`/tasks/${taskId}/respond`, { response });
      return apiResponse.data;
    } catch (error) {
      console.error('Task respond error:', error.response?.data || error.message);
      throw error;
    }
  },

  comment: async (taskId, text) => {
    try {
      const res = await api.post(`/tasks/${taskId}/comment`, { text });
      return res.data;
    } catch (error) {
      console.error('Task comment error:', error.response?.data || error.message);
      throw error;
    }
  },

  deleteHistory: async (taskId, historyId) => {
    try {
      const res = await api.delete(`/tasks/${taskId}/history/${historyId}`);
      return res.data;
    } catch (error) {
      console.error('Task history delete error:', error.response?.data || error.message);
      throw error;
    }
  },

  remind: async (taskId, userIds = null) => {
    try {
      const data = userIds ? { user_ids: userIds } : {};
      const response = await api.post(`/tasks/${taskId}/remind`, data);
      return response.data;
    } catch (error) {
      console.error('Task remind error:', error.response?.data || error.message);
      throw error;
    }
  },

  deleteAttachment: async (attachmentId) => {
    try {
      const response = await api.delete(`/attachments/${attachmentId}`);
      return response.data;
    } catch (error) {
      console.error('Attachment delete error:', error.response?.data || error.message);
      throw error;
    }
  },

  getHistory: async (taskId) => {
    try {
      const response = await api.get(`/tasks/${taskId}/history`);
      return response.data.history || response.data || [];
    } catch (error) {
      console.error('Task history error:', error.response?.data || error.message);
      throw error;
    }
  }
};

export const TaskViews = {
  getLast: async (taskId) => {
    try {
      const response = await api.get(`/tasks/${taskId}/last-views`);
      const v = response.data?.views;
      return Array.isArray(v) ? v : (v ? Object.values(v) : []);
    } catch (error) {
      console.error('Task last views error:', error.response?.data || error.message);
      throw error;
    }
  }
};

export const Notifications = {
  list: async () => {
    try {
      const response = await api.get('/notifications');
      return response.data.notifications || response.data || [];
    } catch (error) {
      console.error('Notifications fetch error:', error.response?.data || error.message);
      throw error;
    }
  },

  markAsRead: async (notificationId) => {
    try {
      const response = await api.post(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Notification mark as read error:', error.response?.data || error.message);
      throw error;
    }
  },

  markAllAsRead: async () => {
    try {
      const response = await api.post('/notifications/read-all');
      return response.data;
    } catch (error) {
      console.error('Notifications mark all as read error:', error.response?.data || error.message);
      throw error;
    }
  },

  delete: async (notificationId) => {
    try {
      const response = await api.delete(`/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error('Notification delete error:', error.response?.data || error.message);
      throw error;
    }
  },

  deleteAll: async () => {
    try {
      const response = await api.delete('/notifications');
      return response.data;
    } catch (error) {
      console.error('Notifications delete all error:', error.response?.data || error.message);
      throw error;
    }
  },

  cleanup: async () => {
    try {
      const response = await api.delete('/notifications/cleanup');
      return response.data;
    } catch (error) {
      console.error('Notifications cleanup error:', error.response?.data || error.message);
      throw error;
    }
  }
};

export const PasswordReset = {
  requestReset: async (email) => {
    try {
      const response = await api.post('/password-reset-request', { email });
      return response.data;
    } catch (error) {
      console.error('Password reset request error:', error.response?.data || error.message);
      throw error;
    }
  },

  resetPassword: async (token, password, passwordConfirmation) => {
    try {
      const response = await api.post('/password-reset', {
        token,
        password,
        password_confirmation: passwordConfirmation
      });
      return response.data;
    } catch (error) {
      console.error('Password reset error:', error.response?.data || error.message);
      throw error;
    }
  },

  getResetRequests: async () => {
    try {
      const response = await api.get('/password-reset-requests');
      // normalize to array of requests
      return response.data?.data || response.data || [];
    } catch (error) {
      console.error('Get reset requests error:', error.response?.data || error.message);
      throw error;
    }
  },

  adminResetPassword: async (userId, newPassword) => {
    try {
      const response = await api.post('/admin-reset-password', {
        user_id: userId,
        new_password: newPassword
      });
      return response.data;
    } catch (error) {
      console.error('Admin reset password error:', error.response?.data || error.message);
      throw error;
    }
  },

  cancelResetRequest: async (requestId) => {
    try {
      const response = await api.post('/cancel-reset-request', {
        request_id: requestId
      });
      return response.data;
    } catch (error) {
      console.error('Cancel reset request error:', error.response?.data || error.message);
      throw error;
    }
  }
};

export const WeeklyGoals = {
  get: async (params = {}) => {
    try {
      const response = await api.get('/weekly-goals', { params });
      return response.data;
    } catch (error) {
      console.error('Weekly goals fetch error:', error.response?.data || error.message);
      throw error;
    }
  },
  leaderboard: async (params = {}) => {
    try {
      const response = await api.get('/weekly-goals/leaderboard', { params });
      return response.data;
    } catch (error) {
      console.error('Weekly goals leaderboard error:', error.response?.data || error.message);
      throw error;
    }
  },
  save: async (payload) => {
    try {
      const response = await api.post('/weekly-goals', payload);
      return response.data;
    } catch (error) {
      console.error('Weekly goals save error:', error.response?.data || error.message);
      throw error;
    }
  }
};

export const Team = {
  members: async (leaderId = null) => {
    try {
      const response = await api.get('/team-members', { params: leaderId ? { leader_id: leaderId } : {} });
      return response.data?.members || [];
    } catch (error) {
      console.error('Team members fetch error:', error.response?.data || error.message);
      throw error;
    }
  }
};

export const TaskTypes = {
  list: async () => {
    try {
      const response = await api.get('/task-types');
      return response.data;
    } catch (error) {
      console.error('Task types fetch error:', error.response?.data || error.message);
      throw error;
    }
  },

  create: async (taskTypeData) => {
    try {
      const response = await api.post('/task-types', taskTypeData);
      return response.data;
    } catch (error) {
      console.error('Task type create error:', error.response?.data || error.message);
      throw error;
    }
  },

  update: async (taskTypeId, taskTypeData) => {
    try {
      const response = await api.put(`/task-types/${taskTypeId}`, taskTypeData);
      return response.data;
    } catch (error) {
      console.error('Task type update error:', error.response?.data || error.message);
      throw error;
    }
  },

  delete: async (taskTypeId) => {
    try {
      const response = await api.delete(`/task-types/${taskTypeId}`);
      return response.data;
    } catch (error) {
      console.error('Task type delete error:', error.response?.data || error.message);
      throw error;
    }
  }
};

export const TaskStatuses = {
  list: async (taskTypeId = null) => {
    try {
      const params = taskTypeId ? { task_type_id: taskTypeId } : {};
      const response = await api.get('/task-statuses', { params });
      return response.data;
    } catch (error) {
      console.error('Task statuses fetch error:', error.response?.data || error.message);
      throw error;
    }
  },

  create: async (taskStatusData) => {
    try {
      const response = await api.post('/task-statuses', taskStatusData);
      return response.data;
    } catch (error) {
      console.error('Task status create error:', error.response?.data || error.message);
      throw error;
    }
  },

  update: async (taskStatusId, taskStatusData) => {
    try {
      const response = await api.put(`/task-statuses/${taskStatusId}`, taskStatusData);
      return response.data;
    } catch (error) {
      console.error('Task status update error:', error.response?.data || error.message);
      throw error;
    }
  },

  delete: async (taskStatusId) => {
    try {
      const response = await api.delete(`/task-statuses/${taskStatusId}`);
      return response.data;
    } catch (error) {
      console.error('Task status delete error:', error.response?.data || error.message);
      throw error;
    }
  }
};

export default api;
