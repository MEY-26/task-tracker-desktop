import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { WeeklyGoals } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { getMonday, fmtYMD, at1330, at10AM } from '../utils/date.js';
import { getMaxActualLimitForToday } from '../utils/weeklyLimits.js';
import { computeWeeklyScore } from '../utils/computeWeeklyScore.js';

const WEEKLY_BASE_MINUTES = 2700;

export function useWeeklyGoals() {
  const { user } = useAuth();
  const { addNotification } = useNotification();

  const [weeklyGoals, setWeeklyGoals] = useState({ goal: null, items: [], locks: { targets_locked: false, actuals_locked: false }, summary: null });
  const [weeklyWeekStart, setWeeklyWeekStart] = useState('');
  const [weeklyUserId, setWeeklyUserId] = useState(null);
  const [weeklyLeaveMinutesInput, setWeeklyLeaveMinutesInput] = useState('0');
  const [weeklyOvertimeMinutesInput, setWeeklyOvertimeMinutesInput] = useState('0');
  const [weeklySaveState, setWeeklySaveState] = useState('idle');
  const [transferButtonText, setTransferButtonText] = useState('Tamamlanmayan İşleri Aktar');
  const [weeklyValidationErrors, setWeeklyValidationErrors] = useState({
    overCapacity: false,
    overDailyLimit: false,
    overDailyLimitAmount: 0,
    overDailyLimitMax: 0,
    invalidItems: []
  });

  const textInputRefs = useRef({});
  const goalDescriptionRef = useRef(null);
  const prevWeeklyDataRef = useRef({ items: null, leaveMinutes: null });
  const weeklySaveStateTimeoutRef = useRef(null);

  const getInvalidItemIndices = useCallback((items) => {
    if (!Array.isArray(items)) return [];
    const invalidIndices = [];
    items.forEach((x, idx) => {
      const hasTitle = x.title && x.title.trim() !== '';
      const hasActionPlan = x.action_plan && x.action_plan.trim() !== '';
      const hasTarget = x.target_minutes && Number(x.target_minutes) > 0;
      if (x.is_unplanned) {
        if (!hasTitle || !hasActionPlan) invalidIndices.push(idx);
      } else {
        if (!hasTitle || !hasActionPlan || !hasTarget) invalidIndices.push(idx);
      }
    });
    return invalidIndices;
  }, []);

  const updateInvalidItemsIfActive = useCallback((items) => {
    setWeeklyValidationErrors(prev => {
      if (!prev.invalidItems || prev.invalidItems.length === 0) return prev;
      return { ...prev, invalidItems: getInvalidItemIndices(items) };
    });
  }, [getInvalidItemIndices]);

  const weeklyLeaveMinutes = useMemo(() => {
    try {
      const normalized = (weeklyLeaveMinutesInput ?? '').toString().replace(',', '.').trim();
      if (!normalized) return 0;
      const minutes = Math.round(Number(normalized));
      if (!Number.isFinite(minutes) || minutes <= 0) return 0;
      return Math.min(WEEKLY_BASE_MINUTES, Math.max(0, minutes));
    } catch (err) {
      return 0;
    }
  }, [weeklyLeaveMinutesInput]);

  const weeklyOvertimeMinutes = useMemo(() => {
    try {
      const normalized = (weeklyOvertimeMinutesInput ?? '').toString().replace(',', '.').trim();
      if (!normalized) return 0;
      const minutes = Math.round(Number(normalized));
      if (!Number.isFinite(minutes) || minutes <= 0) return 0;
      return Math.max(0, minutes);
    } catch (err) {
      return 0;
    }
  }, [weeklyOvertimeMinutesInput]);

  const uiLocks = useMemo(() => {
    try {
      const selStart = weeklyWeekStart ? new Date(weeklyWeekStart) : getMonday();
      selStart.setHours(0, 0, 0, 0);
      const now = new Date();
      const curStart = getMonday(now);
      curStart.setHours(0, 0, 0, 0);
      const curStart10 = at10AM(curStart);
      const curStart1330 = at1330(curStart);
      const isSelectedCurrent = selStart.getTime() === curStart.getTime();
      const isSelectedFuture = selStart.getTime() > curStart.getTime();
      const isSelectedPreviousWeek = selStart.getTime() === curStart.getTime() - (7 * 24 * 60 * 60 * 1000);
      const isAdmin = user?.role === 'admin';
      const isLeader = user?.role === 'team_leader' || user?.role === 'admin';
      const memberDeadline = curStart10;
      const leaderDeadline = curStart1330;
      const isBeforeMemberDeadline = now < memberDeadline;
      const isBeforeLeaderDeadline = now < leaderDeadline;

      let targetsUnlocked = false;
      let actualsUnlocked = false;
      if (isSelectedFuture) {
        targetsUnlocked = true;
        actualsUnlocked = false;
      } else if (isSelectedCurrent) {
        targetsUnlocked = isAdmin ? true : (isLeader ? isBeforeLeaderDeadline : isBeforeMemberDeadline);
        actualsUnlocked = true;
      } else if (isSelectedPreviousWeek) {
        targetsUnlocked = false;
        actualsUnlocked = isBeforeLeaderDeadline;
      } else {
        targetsUnlocked = false;
        actualsUnlocked = false;
      }
      return { targets_locked: !targetsUnlocked, actuals_locked: !actualsUnlocked };
    } catch (e) {
      return { targets_locked: false, actuals_locked: false };
    }
  }, [weeklyWeekStart, user?.role]);

  const combinedLocks = useMemo(() => {
    const backendTargetsLocked = !!(weeklyGoals?.locks?.targets_locked);
    const backendActualsLocked = !!(weeklyGoals?.locks?.actuals_locked);
    return {
      targets_locked: backendTargetsLocked || uiLocks.targets_locked,
      actuals_locked: backendActualsLocked || uiLocks.actuals_locked,
    };
  }, [weeklyGoals?.locks, uiLocks]);

  const weeklyLive = useMemo(() => {
    const items = Array.isArray(weeklyGoals.items) ? weeklyGoals.items : [];
    const planned = items.filter(x => !x.is_unplanned).map(x => ({
      name: x?.title || x?.name,
      target_minutes: Math.max(0, Number(x?.target_minutes || 0)),
      actual_minutes: Math.max(0, Number(x?.actual_minutes || 0)),
      is_completed: x?.is_completed === true,
    }));
    const unplanned = items.filter(x => x.is_unplanned).map(x => ({
      name: x?.title || x?.name,
      actual_minutes: Math.max(0, Number(x?.actual_minutes || 0)),
    }));

    const penaltiesEnabled = (() => {
      const ws = weeklyWeekStart || fmtYMD(getMonday());
      const selectedStart = new Date(ws);
      selectedStart.setHours(0, 0, 0, 0);
      const currentStart = new Date(fmtYMD(getMonday()));
      currentStart.setHours(0, 0, 0, 0);
      if (selectedStart > currentStart) return false;
      if (selectedStart < currentStart) return true;
      const fridayCutoff = new Date(selectedStart);
      fridayCutoff.setDate(fridayCutoff.getDate() + 4);
      fridayCutoff.setHours(18, 15, 0, 0);
      return new Date() >= fridayCutoff;
    })();

    const breakdown = computeWeeklyScore({
      baseMinutes: WEEKLY_BASE_MINUTES,
      leaveMinutes: weeklyLeaveMinutes,
      overtimeMinutes: weeklyOvertimeMinutes,
      planned,
      unplanned,
      params: {
        kappa: penaltiesEnabled ? 0.50 : 0,
        lambda_: penaltiesEnabled ? 0.75 : 0,
        mu: penaltiesEnabled ? 2.5 : 0,
        scoreCap: 130,
        incompletePenalty: penaltiesEnabled ? 0.10 : 0,
      },
    });

    const totalTarget = breakdown.sumPlannedMinutes;
    const availableMinutes = breakdown.T_allow;
    const plannedActual = breakdown.sumActualPlanned;
    const unplannedMinutes = breakdown.U;
    const totalActual = breakdown.W;
    const unplannedPercent = availableMinutes > 0
      ? Number(((unplannedMinutes / availableMinutes) * 100).toFixed(2))
      : 0;
    const plannedScore = Number((breakdown.PlanlyScore * 100).toFixed(2));
    const remainingUnplanned = Math.max(0, unplannedMinutes - breakdown.F);
    const unplannedBonus = availableMinutes > 0
      ? Number(((remainingUnplanned / availableMinutes) * 100).toFixed(2))
      : 0;
    const finalScore = Number((breakdown.Score).toFixed(2));
    const overtimeBonus = breakdown.OvertimeBonus || 0;
    const overtimeMinutes = breakdown.T_overtime || 0;
    const overtimeUsed = breakdown.T_overtime_used || 0;

    return {
      totalTarget,
      totalWeight: availableMinutes > 0 ? Number(((totalTarget / availableMinutes) * 100).toFixed(1)) : 0,
      unplannedMinutes,
      plannedActual,
      totalActual,
      plannedScore,
      unplannedBonus,
      finalScore,
      unplannedPercent,
      leaveMinutes: weeklyLeaveMinutes,
      overtimeMinutes,
      overtimeBonus,
      overtimeUsed,
      availableMinutes,
      overCapacity: false,
      overActualCapacity: totalActual > availableMinutes,
      breakdown,
      overtimeBonusPercent: Number((overtimeBonus * 100).toFixed(2)),
    };
  }, [weeklyGoals.items, weeklyLeaveMinutes, weeklyOvertimeMinutes, weeklyWeekStart]);

  const updateNumberInput = useCallback((row, field, value) => {
    const items = [...weeklyGoals.items];
    const itemIndex = items.findIndex(r => r === row);
    if (itemIndex >= 0) {
      items[itemIndex][field] = Number(value || 0);
      setWeeklyGoals({ ...weeklyGoals, items });
      updateInvalidItemsIfActive(items);
    }
  }, [weeklyGoals, updateInvalidItemsIfActive]);

  const getTextInputKey = useCallback((row, field) => {
    const rowId = row.id || `row-${weeklyGoals.items.indexOf(row)}`;
    return `${rowId}-${field}`;
  }, [weeklyGoals]);

  const saveTextInputToState = useCallback((row, field, value) => {
    const items = [...weeklyGoals.items];
    const itemIndex = items.findIndex(r => r === row);
    if (itemIndex >= 0) {
      items[itemIndex][field] = value;
      setWeeklyGoals({ ...weeklyGoals, items });
      updateInvalidItemsIfActive(items);
    }
  }, [weeklyGoals, updateInvalidItemsIfActive]);

  const handleWeeklyLeaveMinutesChange = useCallback((event) => {
    const raw = (event?.target?.value ?? '').toString();
    if (raw === '') { setWeeklyLeaveMinutesInput(''); return; }
    if (!/^\d*$/.test(raw)) return;
    setWeeklyLeaveMinutesInput(raw);
  }, []);

  const handleWeeklyLeaveMinutesBlur = useCallback(() => {
    const normalized = (weeklyLeaveMinutesInput ?? '').toString().trim();
    if (!normalized) { setWeeklyLeaveMinutesInput('0'); return; }
    const parsed = parseInt(normalized, 10);
    if (Number.isNaN(parsed) || parsed < 0) { setWeeklyLeaveMinutesInput('0'); return; }
    setWeeklyLeaveMinutesInput(Math.min(parsed, WEEKLY_BASE_MINUTES).toString());
  }, [weeklyLeaveMinutesInput]);

  const handleWeeklyOvertimeMinutesChange = useCallback((event) => {
    const raw = (event?.target?.value ?? '').toString();
    if (raw === '') { setWeeklyOvertimeMinutesInput(''); return; }
    if (!/^\d*$/.test(raw)) return;
    setWeeklyOvertimeMinutesInput(raw);
  }, []);

  const handleWeeklyOvertimeMinutesBlur = useCallback(() => {
    const normalized = (weeklyOvertimeMinutesInput ?? '').toString().trim();
    if (!normalized) { setWeeklyOvertimeMinutesInput('0'); return; }
    const parsed = parseInt(normalized, 10);
    if (Number.isNaN(parsed) || parsed < 0) { setWeeklyOvertimeMinutesInput('0'); return; }
    setWeeklyOvertimeMinutesInput(parsed.toString());
  }, [weeklyOvertimeMinutesInput]);

  const loadWeeklyGoals = useCallback(async (weekStart = null, userId = null) => {
    try {
      const ws = weekStart || weeklyWeekStart || fmtYMD(getMonday());
      setWeeklyWeekStart(ws);
      let uid;
      if (userId !== null) {
        uid = userId;
      } else if (userId === null && arguments.length > 1) {
        uid = null;
      } else {
        uid = weeklyUserId;
      }
      setWeeklyUserId(uid);
      const params = { week_start: ws };
      if (uid) params.user_id = uid;
      const res = await WeeklyGoals.get(params);

      const parsedItems = Array.isArray(res.items) ? res.items.map(item => ({
        ...item,
        is_completed: Boolean(item.is_completed),
        is_unplanned: Boolean(item.is_unplanned),
      })) : [];

      setWeeklyGoals({ goal: res.goal, items: parsedItems, locks: res.locks || {}, summary: res.summary || null });
      const leaveFromServer = Number(res.goal?.leave_minutes ?? 0);
      if (Number.isFinite(leaveFromServer) && leaveFromServer > 0) {
        setWeeklyLeaveMinutesInput(String(Math.max(0, Math.round(leaveFromServer))));
      } else {
        setWeeklyLeaveMinutesInput('0');
      }
      const overtimeFromServer = Number(res.goal?.overtime_minutes ?? 0);
      if (Number.isFinite(overtimeFromServer) && overtimeFromServer > 0) {
        setWeeklyOvertimeMinutesInput(String(Math.max(0, Math.round(overtimeFromServer))));
      } else {
        setWeeklyOvertimeMinutesInput('0');
      }
    } catch (err) {
      console.error('Weekly goals load error:', err);
      setWeeklyGoals({ goal: null, items: [], locks: { targets_locked: false, actuals_locked: false }, summary: null });
      setWeeklyLeaveMinutesInput('0');
      setWeeklyOvertimeMinutesInput('0');
    }
  }, [weeklyWeekStart, weeklyUserId]);

  const transferIncompleteTasksFromPreviousWeek = useCallback(async () => {
    try {
      setTransferButtonText('Aktarılıyor...');
      if (combinedLocks.targets_locked && user?.role !== 'admin') {
        setTransferButtonText('Tamamlanmayan İşleri Aktar');
        addNotification('Hedefler kilitli olduğu için işlem yapılamaz.', 'error');
        return;
      }
      if (user?.role === 'observer') {
        setTransferButtonText('Tamamlanmayan İşleri Aktar');
        addNotification('Bu işlem için yetkiniz yok.', 'error');
        return;
      }

      const currentWeekStart = weeklyWeekStart || fmtYMD(getMonday());
      const currentWeekDate = new Date(currentWeekStart);
      const previousWeekDate = new Date(currentWeekDate);
      previousWeekDate.setDate(previousWeekDate.getDate() - 7);
      const previousWeekStart = fmtYMD(getMonday(previousWeekDate));

      const params = { week_start: previousWeekStart };
      if (weeklyUserId) params.user_id = weeklyUserId;
      const res = await WeeklyGoals.get(params);

      const previousWeekItems = Array.isArray(res.items) ? res.items.map(item => ({
        ...item,
        is_completed: Boolean(item.is_completed),
        is_unplanned: Boolean(item.is_unplanned),
      })) : [];

      const incompletePlannedTasks = previousWeekItems.filter(item => !item.is_completed && !item.is_unplanned);
      if (incompletePlannedTasks.length === 0) {
        setTransferButtonText('Aktarılacak iş bulunamadı');
        setTimeout(() => setTransferButtonText('Tamamlanmayan İşleri Aktar'), 5000);
        addNotification('Önceki haftada aktarılacak tamamlanmamış iş bulunamadı.', 'info');
        return;
      }

      const currentWeekItems = Array.isArray(weeklyGoals.items) ? weeklyGoals.items : [];
      const normalize = (str) => (str || '').trim().toLowerCase();
      const tasksToAdd = incompletePlannedTasks.filter(previousTask => {
        const previousTitle = normalize(previousTask.title);
        const previousActionPlan = normalize(previousTask.action_plan);
        const isDuplicate = currentWeekItems.some(currentTask =>
          normalize(currentTask.title) === previousTitle && normalize(currentTask.action_plan) === previousActionPlan
        );
        return !isDuplicate;
      });

      if (tasksToAdd.length === 0) {
        setTransferButtonText('Aktarılacak iş bulunamadı');
        setTimeout(() => setTransferButtonText('Tamamlanmayan İşleri Aktar'), 5000);
        addNotification('Önceki haftadan aktarılacak yeni iş bulunamadı. Tüm işler zaten mevcut haftada mevcut.', 'info');
        return;
      }

      const newTasks = tasksToAdd.map(task => ({
        title: task.title || '',
        action_plan: task.action_plan || '',
        target_minutes: task.target_minutes || 0,
        weight_percent: task.weight_percent || 0,
        actual_minutes: 0,
        is_unplanned: false,
        is_completed: false,
        description: task.description || '',
      }));

      const updatedItems = [...weeklyGoals.items, ...newTasks];
      setWeeklyGoals({ ...weeklyGoals, items: updatedItems });
      setTransferButtonText(`${newTasks.length} İş Aktarıldı`);
      setTimeout(() => setTransferButtonText('Tamamlanmayan İşleri Aktar'), 5000);
    } catch (err) {
      console.error('Transfer incomplete tasks error:', err);
      setTransferButtonText('Tamamlanmayan İşleri Aktar');
      addNotification('Önceki haftadan işler aktarılırken bir hata oluştu.', 'error');
    }
  }, [combinedLocks, user?.role, weeklyWeekStart, weeklyUserId, weeklyGoals, addNotification]);

  const saveWeeklyGoals = useCallback(async () => {
    try {
      if (user?.role === 'observer') {
        addNotification('Bu işlem için yetkiniz yok.', 'error');
        return;
      }

      const itemsToSave = [...weeklyGoals.items];
      let hasChanges = false;
      Object.keys(textInputRefs.current).forEach(key => {
        const ref = textInputRefs.current[key];
        if (ref && ref.value !== undefined) {
          const parts = key.split('-');
          const field = parts[parts.length - 1];
          const rowId = parts.slice(0, -1).join('-');
          const itemIndex = itemsToSave.findIndex((r, idx) => {
            const id = r.id || `row-${idx}`;
            return id === rowId || (idx.toString() === rowId && !r.id);
          });
          if (itemIndex >= 0 && (field === 'title' || field === 'action_plan')) {
            const refValue = ref.value || '';
            if (itemsToSave[itemIndex][field] !== refValue) {
              itemsToSave[itemIndex][field] = refValue;
              hasChanges = true;
            }
          }
        }
      });
      if (hasChanges) {
        setWeeklyGoals({ ...weeklyGoals, items: itemsToSave });
      }

      setWeeklySaveState('saving');
      if (weeklySaveStateTimeoutRef.current) {
        clearTimeout(weeklySaveStateTimeoutRef.current);
      }

      const leaveMinutesForSave = weeklyLeaveMinutes;
      const overtimeMinutesForSave = weeklyOvertimeMinutes;
      const availableMinutes = Number.isFinite(weeklyLive?.availableMinutes)
        ? Number(weeklyLive.availableMinutes)
        : Math.max(0, WEEKLY_BASE_MINUTES - leaveMinutesForSave + overtimeMinutesForSave);

      if (itemsToSave.length > 0) {
        const invalidItems = itemsToSave.filter(x => {
          const hasTitle = x.title && x.title.trim() !== '';
          const hasActionPlan = x.action_plan && x.action_plan.trim() !== '';
          const hasTarget = x.target_minutes && Number(x.target_minutes) > 0;
          if (x.is_unplanned) return !hasTitle || !hasActionPlan;
          return !hasTitle || !hasActionPlan || !hasTarget;
        });

        if (invalidItems.length > 0) {
          const msg = invalidItems.some(x => x.is_unplanned)
            ? 'Lütfen tüm görevlere Başlık ve Aksiyon Planı girin.'
            : 'Lütfen tüm görevlere Başlık, Aksiyon Planı ve Hedef süresini girin.';
          addNotification(msg, 'error');
          const invalidIndices = invalidItems.map(item => itemsToSave.indexOf(item));
          setWeeklyValidationErrors({ overCapacity: false, invalidItems: invalidIndices });
          setWeeklySaveState('idle');
          return;
        }
      }

      if (user?.role !== 'admin') {
        const plannedActual = weeklyLive?.plannedActual || 0;
        const unplannedMinutes = weeklyLive?.unplannedMinutes || 0;
        const totalUsedMinutes = plannedActual + unplannedMinutes;
        if (totalUsedMinutes > availableMinutes) {
          const errorMsg = `Kullanılan süre (${plannedActual} dk) + Plandışı süre (${unplannedMinutes} dk) = ${totalUsedMinutes} dk, toplam süreyi (${availableMinutes} dk) aşamaz.`;
          addNotification(errorMsg, 'error');
          setWeeklyValidationErrors({ overCapacity: true, invalidItems: [] });
          setWeeklySaveState('idle');
          return;
        }
      }

      setWeeklyValidationErrors({ overCapacity: false, invalidItems: [] });

      const planned = itemsToSave.filter(x => !x.is_unplanned);
      const totalTarget = planned.reduce((acc, x) => acc + Math.max(0, Number(x.target_minutes || 0)), 0);

      const items = itemsToSave.map((x) => {
        const isUnplanned = !!x.is_unplanned;
        let weight = Number(x.weight_percent || 0);
        if (!isUnplanned) {
          const minutes = Math.max(0, Number(x.target_minutes || 0));
          weight = totalTarget > 0 ? (minutes / totalTarget) * 100 : 0;
        }
        return {
          id: x.id,
          title: x.title || '',
          action_plan: x.action_plan || '',
          description: x.description || '',
          target_minutes: Number(x.target_minutes || 0),
          weight_percent: Number(weight.toFixed(2)),
          actual_minutes: Number(x.actual_minutes || 0),
          is_unplanned: isUnplanned,
          is_completed: !!x.is_completed,
        };
      });

      const payload = {
        week_start: weeklyWeekStart || fmtYMD(getMonday()),
        leave_minutes: leaveMinutesForSave,
        overtime_minutes: overtimeMinutesForSave,
        items,
        ...(weeklyUserId ? { user_id: weeklyUserId } : {}),
      };

      const res = await WeeklyGoals.save(payload);

      const savedItems = items.map((localItem, idx) => {
        const apiItem = (res.items || []).find(x =>
          (localItem.id && x.id === localItem.id) || (!localItem.id && res.items.indexOf(x) === idx)
        );
        return { ...localItem, id: apiItem?.id || localItem.id };
      });

      const savedLeave = Number(res.goal?.leave_minutes ?? leaveMinutesForSave);
      const savedOvertime = Number(res.goal?.overtime_minutes ?? weeklyOvertimeMinutes);
      const newLeaveMinutes = savedLeave && Number.isFinite(savedLeave) && savedLeave > 0
        ? String(Math.max(0, Math.round(savedLeave)))
        : '0';
      const newOvertimeMinutes = savedOvertime && Number.isFinite(savedOvertime) && savedOvertime > 0
        ? String(Math.max(0, Math.round(savedOvertime)))
        : '0';

      prevWeeklyDataRef.current = {
        items: JSON.stringify(savedItems),
        leaveMinutes: newLeaveMinutes,
        overtimeMinutes: newOvertimeMinutes
      };

      setWeeklyGoals({ goal: res.goal, items: savedItems, locks: res.locks || {}, summary: res.summary || null });
      setWeeklyLeaveMinutesInput(newLeaveMinutes);
      setWeeklyOvertimeMinutesInput(newOvertimeMinutes);

      addNotification('Haftalık hedefler kaydedildi', 'success');
      setWeeklySaveState('saved');
      setWeeklyValidationErrors({ overCapacity: false, invalidItems: [] });

      if (weeklySaveStateTimeoutRef.current) clearTimeout(weeklySaveStateTimeoutRef.current);
      weeklySaveStateTimeoutRef.current = setTimeout(() => {
        setWeeklySaveState('idle');
        weeklySaveStateTimeoutRef.current = null;
      }, 2000);
    } catch (err) {
      console.error('Weekly goals save error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Kaydedilemedi';
      addNotification(errorMessage, 'error');
      setWeeklySaveState('idle');
      if (weeklySaveStateTimeoutRef.current) {
        clearTimeout(weeklySaveStateTimeoutRef.current);
        weeklySaveStateTimeoutRef.current = null;
      }
    }
  }, [user?.role, weeklyGoals, weeklyWeekStart, weeklyUserId, weeklyLeaveMinutes, weeklyOvertimeMinutes, weeklyLive, addNotification]);

  const approveWeeklyGoals = useCallback(async (approvalStatus, approvalNote = null) => {
    try {
      if (!['admin', 'team_leader'].includes(user?.role)) {
        addNotification('Bu işlem için yetkiniz yok.', 'error');
        return;
      }
      const targetUserId = weeklyUserId ?? user?.id;
      if (!targetUserId) {
        addNotification('Kullanıcı bilgisi bulunamadı.', 'error');
        return;
      }
      const ws = weeklyWeekStart || fmtYMD(getMonday());
      const res = await WeeklyGoals.approve({
        week_start: ws,
        user_id: targetUserId,
        approval_status: approvalStatus,
        approval_note: approvalNote || undefined,
      });
      const parsedItems = Array.isArray(res.items) ? res.items.map(item => ({
        ...item,
        is_completed: Boolean(item.is_completed),
        is_unplanned: Boolean(item.is_unplanned),
      })) : (weeklyGoals.items || []);
      setWeeklyGoals({ goal: res.goal, items: parsedItems, locks: res.locks || {}, summary: res.summary || null });
      addNotification(res.message || (approvalStatus === 'approved' ? 'Onaylandı' : 'Reddedildi'), 'success');
    } catch (err) {
      console.error('Weekly goals approve error:', err);
      const msg = err.response?.data?.message || err.message || 'İşlem başarısız';
      addNotification(msg, 'error');
    }
  }, [user?.role, user?.id, weeklyUserId, weeklyWeekStart, weeklyGoals.items, addNotification]);

  useEffect(() => {
    setWeeklyValidationErrors(prev => {
      if (!prev.invalidItems || prev.invalidItems.length === 0) return prev;
      return { ...prev, invalidItems: [] };
    });
  }, [weeklyWeekStart]);

  useEffect(() => {
    const plannedActual = Number(weeklyLive?.plannedActual || 0);
    const unplannedMinutes = Number(weeklyLive?.unplannedMinutes || 0);
    const totalUsedMinutes = plannedActual + unplannedMinutes;
    const capacity = Number.isFinite(weeklyLive?.availableMinutes) ? Number(weeklyLive.availableMinutes) : WEEKLY_BASE_MINUTES;
    if (totalUsedMinutes > capacity) {
      setWeeklyValidationErrors(prev => ({ ...prev, overCapacity: true }));
    } else {
      setWeeklyValidationErrors(prev => ({ ...prev, overCapacity: false }));
    }
  }, [weeklyLive.plannedActual, weeklyLive.unplannedMinutes, weeklyLive.availableMinutes]);

  useEffect(() => {
    if (!weeklyWeekStart) return;
    const currentWeekStart = fmtYMD(getMonday());
    if (weeklyWeekStart === currentWeekStart) {
      const totalActual = Number(weeklyLive?.totalActual || 0);
      const overtimeMinutes = Number(weeklyLive?.overtimeMinutes || 0);
      const maxActualLimit = getMaxActualLimitForToday(weeklyWeekStart, overtimeMinutes);
      if (totalActual > maxActualLimit) {
        setWeeklyValidationErrors(prev => ({
          ...prev,
          overDailyLimit: true,
          overDailyLimitAmount: totalActual,
          overDailyLimitMax: maxActualLimit
        }));
      } else {
        setWeeklyValidationErrors(prev => ({
          ...prev,
          overDailyLimit: false,
          overDailyLimitAmount: 0,
          overDailyLimitMax: 0
        }));
      }
    } else {
      setWeeklyValidationErrors(prev => ({
        ...prev,
        overDailyLimit: false,
        overDailyLimitAmount: 0,
        overDailyLimitMax: 0
      }));
    }
  }, [weeklyLive.totalActual, weeklyLive.overtimeMinutes, weeklyWeekStart]);

  return {
    weeklyGoals,
    setWeeklyGoals,
    weeklyWeekStart,
    setWeeklyWeekStart,
    weeklyUserId,
    setWeeklyUserId,
    weeklyLeaveMinutesInput,
    setWeeklyLeaveMinutesInput,
    weeklyOvertimeMinutesInput,
    setWeeklyOvertimeMinutesInput,
    weeklySaveState,
    setWeeklySaveState,
    weeklyValidationErrors,
    setWeeklyValidationErrors,
    transferButtonText,
    setTransferButtonText,
    weeklyLive,
    uiLocks,
    combinedLocks,
    loadWeeklyGoals,
    saveWeeklyGoals,
    approveWeeklyGoals,
    transferIncompleteTasksFromPreviousWeek,
    updateNumberInput,
    saveTextInputToState,
    getTextInputKey,
    getInvalidItemIndices,
    updateInvalidItemsIfActive,
    handleWeeklyLeaveMinutesChange,
    handleWeeklyLeaveMinutesBlur,
    handleWeeklyOvertimeMinutesChange,
    handleWeeklyOvertimeMinutesBlur,
    textInputRefs,
    goalDescriptionRef,
    prevWeeklyDataRef,
    weeklySaveStateTimeoutRef,
    weeklyLeaveMinutes,
    weeklyOvertimeMinutes,
    WEEKLY_BASE_MINUTES,
  };
}
