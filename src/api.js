// src/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://api.gorevtakip.vaden:800/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Request interceptor - her istekte token'ı ekle
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt');
    if (token && token !== 'null' && token !== 'undefined') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - hataları yakala
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data
    });
    
    if (error.response?.status === 401) {
      localStorage.removeItem('jwt');
      console.error('Token geçersiz, oturum sonlandırıldı');
      // Sayfayı yenile veya login sayfasına yönlendir
      if (window.location.pathname !== '/login') {
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
      // Login sonrası garantili kullanıcı bilgisi getir
      try {
        const me = await api.get('/user');
        return me.data;
      } catch (e) {
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

export async function registerUser({ name, email, password, password_confirmation, role }) {
  try {
    const response = await api.post('/register', {
      name,
      email,
      password,
      password_confirmation,
      role,
    });
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

  uploadAttachments: async (taskId, files) => {
    try {
      const form = new FormData();
      form.append('_method', 'PUT');
      for (const f of files) form.append('attachments[]', f);
      const response = await api.post(`/tasks/${taskId}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
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
      console.log('Raw task history response:', response.data); // Debug için
      // Backend'in döndürdüğü formatı kontrol et
      return response.data.history || response.data || [];
    } catch (error) {
      console.error('Task history error:', error.response?.data || error.message);
      throw error;
    }
  }
};

export const Notifications = {
  list: async () => {
    try {
      const response = await api.get('/notifications');
      console.log('Raw notifications response:', response.data); // Debug için
      // Backend'in döndürdüğü formatı kontrol et
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

export default api;
