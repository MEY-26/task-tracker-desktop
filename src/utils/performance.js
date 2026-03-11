import { formatDateOnly } from './date.js';

/**
 * Performans harfi ve rengi hesaplama
 */
export function getPerformanceGrade(score) {
  if (score >= 111) return { grade: 'A', color: '#00c800', description: 'Üstün Başarı' };
  if (score >= 101) return { grade: 'B', color: '#3dac05', description: 'Beklentiyi Aşıyor' };
  if (score >= 80) return { grade: 'C', color: '#649600', description: 'Beklentiyi Karşılıyor' };
  if (score >= 55) return { grade: 'D', color: '#fa6400', description: 'İyileştirme Gerekli' };
  return { grade: 'E', color: '#fa3200', description: 'Yetersiz' };
}

export function getPriorityColor(priority) {
  switch (priority) {
    case 'low': return '#10b981';
    case 'medium': return '#f59e0b';
    case 'high': return '#ef4444';
    case 'critical': return '#dc2626';
    default: return '#6b7280';
  }
}

export function getPriorityText(priority) {
  switch (priority) {
    case 'low': return 'Düşük';
    case 'medium': return 'Orta';
    case 'high': return 'Yüksek';
    case 'critical': return 'Kritik';
    default: return 'Orta';
  }
}

/**
 * @param {string} taskType
 * @param {object|null} task - task.task_type_text kullanilirsa onu dondurur
 * @param {Array} allTypes - getAllTaskTypes() sonucu
 */
export function getTaskTypeText(taskType, task = null, allTypes = []) {
  if (task && task.task_type_text) {
    return task.task_type_text;
  }
  const foundType = allTypes.find(type =>
    type.value === taskType || type.id === taskType || type.key === taskType
  );
  return foundType ? foundType.label : 'Geliştirme';
}

/**
 * @param {string} taskType
 * @param {object|null} task - task.task_type_color kullanilirsa onu dondurur
 * @param {Array} allTypes - getAllTaskTypes() sonucu
 */
export function getTaskTypeColor(taskType, task = null, allTypes = []) {
  if (task && task.task_type_color) {
    return task.task_type_color;
  }
  const foundType = allTypes.find(type =>
    type.value === taskType || type.id === taskType || type.key === taskType
  );
  return foundType ? foundType.color : '#f59e0b';
}

const systemStatuses = [
  { value: 'waiting', label: 'Bekliyor', color: '#6b7280' },
  { value: 'completed', label: 'Tamamlandı', color: '#10b981' },
  { value: 'cancelled', label: 'İptal', color: '#ef4444' }
];

/**
 * @param {string} status
 * @param {object|null} task - task.status_text kullanilirsa onu dondurur
 * @param {Object} customTaskStatuses - { taskTypeId: [{id, name, label, color}] }
 */
export function getStatusText(status, task = null, customTaskStatuses = {}) {
  if (task && task.status_text) {
    return task.status_text;
  }
  const foundStatus = systemStatuses.find(s => s.value === status);
  if (foundStatus) return foundStatus.label;
  for (const taskType in customTaskStatuses) {
    const customStatus = customTaskStatuses[taskType].find(s =>
      (s.id || s.key || s.value) === status
    );
    if (customStatus) return customStatus.name || customStatus.label;
  }
  return status || 'Bekliyor';
}

/**
 * @param {string} status
 * @param {object|null} task - task.status_color kullanilirsa onu dondurur
 * @param {Object} customTaskStatuses - { taskTypeId: [{id, name, label, color}] }
 */
export function getStatusColor(status, task = null, customTaskStatuses = {}) {
  if (task && task.status_color) {
    return task.status_color;
  }
  const foundStatus = systemStatuses.find(s => s.value === status);
  if (foundStatus) return foundStatus.color;
  for (const taskType in customTaskStatuses) {
    const customStatus = customTaskStatuses[taskType].find(s =>
      (s.id || s.key || s.value) === status
    );
    if (customStatus) return customStatus.color;
  }
  return '#6b7280';
}

/**
 * @param {number|string|null} userId
 * @param {Array} users - users listesi
 */
export function resolveUserName(userId, users = []) {
  if (userId === null || userId === undefined || userId === '') return '-';
  const idNum = typeof userId === 'string' ? parseInt(userId) : userId;
  const u = Array.isArray(users) ? users.find(x => x.id === idNum) : null;
  return u?.name ?? String(userId);
}

/**
 * @param {string} field - changelog field adi
 * @param {*} value - eski veya yeni deger
 * @param {Object} ctx - { customTaskStatuses, allTaskTypes, users }
 */
export function renderHistoryValue(field, value, ctx = {}) {
  const { customTaskStatuses = {}, allTaskTypes = [], users = [] } = ctx;

  if (field === 'status') {
    const foundStatus = systemStatuses.find(s => s.value === value);
    if (foundStatus) return foundStatus.label;
    for (const taskType in customTaskStatuses) {
      const customStatus = customTaskStatuses[taskType].find(s =>
        (s.id || s.key || s.value) == value || s.id == value || s.key == value
      );
      if (customStatus) return customStatus.name || customStatus.label;
    }
    return value || 'Bekliyor';
  }
  if (field === 'priority') return getPriorityText(value);
  if (field === 'task_type') {
    const systemTypes = [{ value: 'development', label: 'Geliştirme' }];
    const foundType = systemTypes.find(t => t.value === value);
    if (foundType) return foundType.label;
    const customType = allTaskTypes.find(t =>
      (t.id || t.key || t.value) == value || t.id == value || t.key == value
    );
    if (customType) return customType.label || customType.name;
    return value || 'Geliştirme';
  }
  if (field === 'comment') return value ?? '';
  if (field === 'responsible_id' || field === 'created_by') return resolveUserName(value, users);
  if (field === 'start_date' || field === 'due_date' || field === 'end_date') return formatDateOnly(value);
  if (field === 'assigned_users') {
    try {
      const userIds = typeof value === 'string' ? JSON.parse(value) : value;
      if (Array.isArray(userIds)) {
        return userIds.map(id => resolveUserName(id, users)).join(', ');
      }
    } catch (e) {
      console.error('Error parsing assigned_users:', e);
    }
    return value ?? 'boş';
  }
  return value ?? 'boş';
}

export function renderFieldLabel(field) {
  switch (field) {
    case 'title': return 'başlığı';
    case 'description': return 'açıklamayı';
    case 'status': return 'durumu';
    case 'priority': return 'önceliği';
    case 'task_type': return 'görev türünü';
    case 'responsible_id': return 'sorumluyu';
    case 'created_by': return 'oluşturanı';
    case 'start_date': return 'başlangıç tarihini';
    case 'due_date': return 'bitiş tarihini';
    case 'end_date': return 'bitiş tarihini';
    case 'assigned_users': return 'atanan kullanıcıları';
    case 'attachments': return 'dosyaları';
    case 'comment': return 'yorumu';
    case 'task_response': return 'görev yanıtını';
    case 'task_type_color':
    case 'status_color': return null;
    default: return field;
  }
}

export function getRoleText(role) {
  switch (role) {
    case 'admin': return 'Yönetici';
    case 'team_leader': return 'Takım Lideri';
    case 'team_member': return 'Takım Üyesi';
    case 'observer': return 'Gözlemci';
    default: return String(role || '-');
  }
}
