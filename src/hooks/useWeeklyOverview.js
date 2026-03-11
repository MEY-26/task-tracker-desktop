import { useState, useCallback } from 'react';
import { WeeklyGoals } from '../api';
import { getMonday, fmtYMD } from '../utils/date.js';

export function useWeeklyOverview() {
  const [showWeeklyOverview, setShowWeeklyOverview] = useState(false);
  const [weeklyOverview, setWeeklyOverview] = useState({ week_start: '', items: [] });
  const [weeklyOverviewLoading, setWeeklyOverviewLoading] = useState(false);
  const [weeklyOverviewError, setWeeklyOverviewError] = useState(null);
  const [weeklyOverviewWeekStart, setWeeklyOverviewWeekStart] = useState('');

  const loadWeeklyOverview = useCallback(async (weekStart = null) => {
    const defaultWeekStart = fmtYMD(getMonday());
    const ws = weekStart || weeklyOverviewWeekStart || defaultWeekStart;
    setWeeklyOverviewWeekStart(ws);

    try {
      setWeeklyOverviewLoading(true);
      setWeeklyOverviewError(null);

      const res = await WeeklyGoals.leaderboard({ week_start: ws });
      const items = Array.isArray(res?.items) ? res.items.filter(item => item?.role !== 'observer') : [];
      setWeeklyOverview({ week_start: res?.week_start || ws, items });
    } catch (err) {
      console.error('Weekly overview load error:', err);
      setWeeklyOverviewError(err.response?.data?.message || 'Haftalık hedef listesi yüklenemedi');
      setWeeklyOverview({ week_start: ws, items: [] });
    } finally {
      setWeeklyOverviewLoading(false);
    }
  }, [weeklyOverviewWeekStart]);

  const setWeeklyOverviewErrorState = setWeeklyOverviewError;

  return {
    showWeeklyOverview,
    setShowWeeklyOverview,
    weeklyOverview,
    setWeeklyOverview,
    weeklyOverviewLoading,
    setWeeklyOverviewLoading,
    weeklyOverviewError,
    setWeeklyOverviewError: setWeeklyOverviewErrorState,
    weeklyOverviewWeekStart,
    setWeeklyOverviewWeekStart,
    loadWeeklyOverview
  };
}
