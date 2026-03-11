import { useState, useCallback, useEffect } from 'react';
import { TaskTypes, TaskStatuses } from '../api';
import { useNotification } from '../contexts/NotificationContext';

export function useTaskSettings(userId) {
  const { addNotification } = useNotification();

  const [showTaskSettings, setShowTaskSettings] = useState(false);
  const [customTaskTypes, setCustomTaskTypes] = useState([]);
  const [customTaskStatuses, setCustomTaskStatuses] = useState({});
  const [allTaskTypesFromAPI, setAllTaskTypesFromAPI] = useState([]);
  const [selectedTaskTypeForStatuses, setSelectedTaskTypeForStatuses] = useState('development');
  const [newTaskTypeName, setNewTaskTypeName] = useState('');
  const [newTaskTypeColor, setNewTaskTypeColor] = useState('#3b82f6');
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#ef4444');
  const [editingTaskTypeId, setEditingTaskTypeId] = useState(null);
  const [editingTaskTypeName, setEditingTaskTypeName] = useState('');
  const [editingTaskTypeColor, setEditingTaskTypeColor] = useState('');
  const [editingTaskStatusId, setEditingTaskStatusId] = useState(null);
  const [editingTaskStatusName, setEditingTaskStatusName] = useState('');
  const [editingTaskStatusColor, setEditingTaskStatusColor] = useState('');

  const getSystemTaskTypeNames = useCallback(() => ['Geliştirme'], []);

  const getAllTaskTypes = useCallback(() => {
    const systemTypes = [{
      id: 'development',
      value: 'development',
      label: 'Geliştirme',
      color: '#f59e0b',
      isCustom: false,
      isPermanent: true
    }];
    const formattedCustomTypes = customTaskTypes.map((type, index) => {
      const typeId = type.id || type.key || `custom_${index}`;
      return {
        id: typeId,
        value: typeId,
        label: type.label || type.name,
        color: type.color || '#6b7280',
        isCustom: true,
        isPermanent: false
      };
    });
    return [...systemTypes, ...formattedCustomTypes];
  }, [customTaskTypes]);

  const getAllTaskStatuses = useCallback((taskType) => {
    return (customTaskStatuses[taskType] || []).map((status, index) => ({
      id: status.id || `custom_status_${index}`,
      value: String(status.id || status.key || status.value || `custom_status_${index}`),
      label: status.name || status.label,
      color: status.color || '#6b7280',
      isSystem: false
    }));
  }, [customTaskStatuses]);

  const getSystemTaskStatuses = useCallback(() => [
    { id: 'waiting', value: 'waiting', label: 'Bekliyor', color: '#6b7280', isSystem: true },
    { id: 'completed', value: 'completed', label: 'Tamamlandı', color: '#10b981', isSystem: true },
    { id: 'cancelled', value: 'cancelled', label: 'İptal', color: '#ef4444', isSystem: true }
  ], []);

  const loadTaskSettings = useCallback(async () => {
    try {
      const [taskTypes, taskStatuses] = await Promise.all([
        TaskTypes.list(),
        TaskStatuses.list()
      ]);
      setAllTaskTypesFromAPI(taskTypes);

      const customTypes = taskTypes
        .filter(type => !type.is_system)
        .map(type => ({
          id: type.id,
          key: type.id,
          name: type.name,
          label: type.name,
          color: type.color,
          isCustom: true,
          isPermanent: type.is_permanent
        }));
      setCustomTaskTypes(customTypes);

      const statusesByType = {};
      taskStatuses.forEach(status => {
        const taskTypeId = status.task_type_id;
        if (!statusesByType[taskTypeId]) statusesByType[taskTypeId] = [];
        statusesByType[taskTypeId].push({
          id: status.id,
          key: status.id,
          name: status.name,
          label: status.name,
          color: status.color,
          isCustom: !status.is_system
        });
        const taskType = taskTypes.find(t => t.id === taskTypeId && t.is_system);
        if (taskType && taskType.name === 'Geliştirme') {
          if (!statusesByType['development']) statusesByType['development'] = [];
          statusesByType['development'].push({
            id: status.id,
            key: status.id,
            name: status.name,
            label: status.name,
            color: status.color,
            isCustom: !status.is_system
          });
        }
      });
      setCustomTaskStatuses(statusesByType);
    } catch (error) {
      console.error('Error loading task settings:', error);
      try {
        const savedSettings = localStorage.getItem('taskSettings');
        if (savedSettings) {
          const { customTaskTypes: savedTypes, customTaskStatuses: savedStatuses } = JSON.parse(savedSettings);
          setCustomTaskTypes(savedTypes || []);
          setCustomTaskStatuses(savedStatuses || {});
        }
      } catch (localError) {
        console.error('Error loading from localStorage:', localError);
      }
    }
  }, []);

  const handleAddTaskType = useCallback(async () => {
    if (!newTaskTypeName.trim()) {
      addNotification('Tür adı boş olamaz', 'error');
      return;
    }
    const trimmedName = newTaskTypeName.trim();
    if (getSystemTaskTypeNames().includes(trimmedName)) {
      addNotification('Bu isim sistem türü olarak kullanılıyor, farklı bir isim seçin', 'error');
      return;
    }
    if (customTaskTypes.map(t => t.name || t.label).includes(trimmedName)) {
      addNotification('Bu isimde bir tür zaten mevcut, farklı bir isim seçin', 'error');
      return;
    }
    try {
      const newType = await TaskTypes.create({ name: trimmedName, color: newTaskTypeColor });
      setCustomTaskTypes(prev => [...prev, {
        id: newType.id,
        key: newType.id,
        name: newType.name,
        label: newType.name,
        color: newType.color,
        isCustom: true,
        isPermanent: false
      }]);
      setNewTaskTypeName('');
      setNewTaskTypeColor('#3b82f6');
      addNotification(`"${newType.name}" türü eklendi`, 'success');
    } catch (error) {
      console.error('Error creating task type:', error);
      addNotification('Tür eklenemedi', 'error');
    }
  }, [newTaskTypeName, newTaskTypeColor, customTaskTypes, getSystemTaskTypeNames, addNotification]);

  const handleAddTaskStatus = useCallback(async () => {
    if (!newStatusName.trim()) {
      addNotification('Durum adı boş olamaz', 'error');
      return;
    }
    let taskTypeId = selectedTaskTypeForStatuses;
    if (typeof selectedTaskTypeForStatuses === 'string' && selectedTaskTypeForStatuses === 'development') {
      taskTypeId = 'development';
    }
    try {
      const newStatus = await TaskStatuses.create({
        task_type_id: taskTypeId,
        name: newStatusName.trim(),
        color: newStatusColor
      });
      const actualTaskTypeId = newStatus.task_type_id || taskTypeId;
      setCustomTaskStatuses(prev => {
        const updated = { ...prev };
        if (!updated[actualTaskTypeId]) updated[actualTaskTypeId] = [];
        updated[actualTaskTypeId] = [...updated[actualTaskTypeId], {
          id: newStatus.id,
          key: newStatus.id,
          name: newStatus.name,
          label: newStatus.name,
          color: newStatus.color,
          isCustom: true
        }];
        if (selectedTaskTypeForStatuses === 'development') {
          if (!updated['development']) updated['development'] = [];
          if (!updated['development'].some(s => s.id === newStatus.id)) {
            updated['development'] = [...updated['development'], {
              id: newStatus.id,
              key: newStatus.id,
              name: newStatus.name,
              label: newStatus.name,
              color: newStatus.color,
              isCustom: true
            }];
          }
        }
        return updated;
      });
      setNewStatusName('');
      setNewStatusColor('#ef4444');
      addNotification(`"${newStatus.name}" durumu eklendi`, 'success');
    } catch (error) {
      console.error('Error creating task status:', error);
      addNotification('Durum eklenemedi', 'error');
    }
  }, [newStatusName, newStatusColor, selectedTaskTypeForStatuses, addNotification]);

  const handleDeleteTaskType = useCallback(async (typeId) => {
    try {
      await TaskTypes.delete(typeId);
      setCustomTaskTypes(prev => prev.filter(type => (type.id || type.key) !== typeId));
      setCustomTaskStatuses(prev => {
        const updated = { ...prev };
        delete updated[typeId];
        return updated;
      });
      if (selectedTaskTypeForStatuses === typeId) {
        setSelectedTaskTypeForStatuses('development');
      }
      addNotification('Tür silindi', 'success');
    } catch (error) {
      console.error('Error deleting task type:', error);
      addNotification('Tür silinemedi', 'error');
    }
  }, [selectedTaskTypeForStatuses, addNotification]);

  const handleEditTaskType = useCallback((taskType) => {
    setEditingTaskTypeId(taskType.id || taskType.value);
    setEditingTaskTypeName(taskType.label || taskType.name);
    setEditingTaskTypeColor(taskType.color);
  }, []);

  const handleSaveTaskType = useCallback(async () => {
    if (!editingTaskTypeName.trim()) {
      addNotification('Tür adı boş olamaz', 'error');
      return;
    }
    const trimmedName = editingTaskTypeName.trim();
    if (getSystemTaskTypeNames().includes(trimmedName)) {
      addNotification('Bu isim sistem türü olarak kullanılıyor, farklı bir isim seçin', 'error');
      return;
    }
    if (customTaskTypes.filter(t => (t.id || t.key) !== editingTaskTypeId).map(t => t.name || t.label).includes(trimmedName)) {
      addNotification('Bu isimde bir tür zaten mevcut, farklı bir isim seçin', 'error');
      return;
    }
    try {
      await TaskTypes.update(editingTaskTypeId, { name: trimmedName, color: editingTaskTypeColor });
      setCustomTaskTypes(prev => prev.map(type =>
        (type.id || type.key) === editingTaskTypeId
          ? { ...type, name: trimmedName, label: trimmedName, color: editingTaskTypeColor }
          : type
      ));
      setEditingTaskTypeId(null);
      setEditingTaskTypeName('');
      setEditingTaskTypeColor('');
      addNotification('Tür güncellendi', 'success');
    } catch (error) {
      console.error('Error updating task type:', error);
      addNotification('Tür güncellenemedi', 'error');
    }
  }, [editingTaskTypeId, editingTaskTypeName, editingTaskTypeColor, customTaskTypes, getSystemTaskTypeNames, addNotification]);

  const handleCancelEditTaskType = useCallback(() => {
    setEditingTaskTypeId(null);
    setEditingTaskTypeName('');
    setEditingTaskTypeColor('');
  }, []);

  const handleDeleteTaskStatus = useCallback(async (statusId) => {
    try {
      await TaskStatuses.delete(statusId);
      setCustomTaskStatuses(prev => ({
        ...prev,
        [selectedTaskTypeForStatuses]: prev[selectedTaskTypeForStatuses]?.filter(s => (s.id || s.key) !== statusId) || []
      }));
      addNotification('Durum silindi', 'success');
    } catch (error) {
      console.error('Error deleting task status:', error);
      addNotification('Durum silinemedi', 'error');
    }
  }, [selectedTaskTypeForStatuses, addNotification]);

  const handleEditTaskStatus = useCallback((status) => {
    setEditingTaskStatusId(status.id || status.key);
    setEditingTaskStatusName(status.name || status.label);
    setEditingTaskStatusColor(status.color);
  }, []);

  const handleSaveTaskStatus = useCallback(async () => {
    if (!editingTaskStatusName.trim()) {
      addNotification('Durum adı boş olamaz', 'error');
      return;
    }
    try {
      await TaskStatuses.update(editingTaskStatusId, {
        name: editingTaskStatusName.trim(),
        color: editingTaskStatusColor
      });
      setCustomTaskStatuses(prev => ({
        ...prev,
        [selectedTaskTypeForStatuses]: prev[selectedTaskTypeForStatuses]?.map(status =>
          (status.id || status.key) === editingTaskStatusId
            ? { ...status, name: editingTaskStatusName.trim(), label: editingTaskStatusName.trim(), color: editingTaskStatusColor }
            : status
        ) || []
      }));
      setEditingTaskStatusId(null);
      setEditingTaskStatusName('');
      setEditingTaskStatusColor('');
      addNotification('Durum güncellendi', 'success');
    } catch (error) {
      console.error('Error updating task status:', error);
      addNotification('Durum güncellenemedi', 'error');
    }
  }, [editingTaskStatusId, editingTaskStatusName, editingTaskStatusColor, selectedTaskTypeForStatuses, addNotification]);

  const handleCancelEditTaskStatus = useCallback(() => {
    setEditingTaskStatusId(null);
    setEditingTaskStatusName('');
    setEditingTaskStatusColor('');
  }, []);

  useEffect(() => {
    if (userId) {
      loadTaskSettings();
    }
  }, [userId, loadTaskSettings]);

  return {
    showTaskSettings,
    setShowTaskSettings,
    customTaskTypes,
    setCustomTaskTypes,
    customTaskStatuses,
    setCustomTaskStatuses,
    allTaskTypesFromAPI,
    setAllTaskTypesFromAPI,
    selectedTaskTypeForStatuses,
    setSelectedTaskTypeForStatuses,
    newTaskTypeName,
    setNewTaskTypeName,
    newTaskTypeColor,
    setNewTaskTypeColor,
    newStatusName,
    setNewStatusName,
    newStatusColor,
    setNewStatusColor,
    editingTaskTypeId,
    editingTaskTypeName,
    setEditingTaskTypeName,
    editingTaskTypeColor,
    setEditingTaskTypeColor,
    editingTaskStatusId,
    editingTaskStatusName,
    setEditingTaskStatusName,
    editingTaskStatusColor,
    setEditingTaskStatusColor,
    getAllTaskTypes,
    getAllTaskStatuses,
    getSystemTaskStatuses,
    getSystemTaskTypeNames,
    loadTaskSettings,
    handleAddTaskType,
    handleAddTaskStatus,
    handleDeleteTaskType,
    handleDeleteTaskStatus,
    handleEditTaskType,
    handleEditTaskStatus,
    handleSaveTaskType,
    handleSaveTaskStatus,
    handleCancelEditTaskType,
    handleCancelEditTaskStatus,
  };
}
