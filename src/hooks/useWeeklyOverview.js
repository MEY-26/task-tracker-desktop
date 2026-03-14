import { useState, useCallback } from 'react';
import { WeeklyGoals } from '../api';
import { getMonday, fmtYMD } from '../utils/date.js';

export function useWeeklyOverview() {
  const [showWeeklyOverview, setShowWeeklyOverview] = useState(false);
  const [weeklyOverview, setWeeklyOverview] = useState({ week_start: '', items: [] });
  const [weeklyOverviewLoading, setWeeklyOverviewLoading] = useState(false);
  const [weeklyOverviewError, setWeeklyOverviewError] = useState(null);
  const [weeklyOverviewWeekStart, setWeeklyOverviewWeekStart] = useState('');

  const [multiWeekOverview, setMultiWeekOverview] = useState({ start_date: '', end_date: '', weeks_count: 0, items: [] });
  const [multiWeekOverviewLoading, setMultiWeekOverviewLoading] = useState(false);
  const [multiWeekOverviewError, setMultiWeekOverviewError] = useState(null);
  const [multiWeekFilters, setMultiWeekFilters] = useState({
    roles: ['admin', 'team_leader', 'team_member'],
    departments: [],
    exclude_user_ids: []
  });

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

  const loadMultiWeekOverview = useCallback(async (params) => {
    try {
      setMultiWeekOverviewLoading(true);
      setMultiWeekOverviewError(null);

      const res = await WeeklyGoals.multiWeekLeaderboard(params);
      setMultiWeekOverview({
        start_date: res?.start_date || '',
        end_date: res?.end_date || '',
        weeks_count: res?.weeks_count || 0,
        items: Array.isArray(res?.items) ? res.items : []
      });
    } catch (err) {
      console.error('Multi-week overview load error:', err);
      setMultiWeekOverviewError(err.response?.data?.message || 'Çok dönemli rapor yüklenemedi');
      setMultiWeekOverview({ start_date: '', end_date: '', weeks_count: 0, items: [] });
    } finally {
      setMultiWeekOverviewLoading(false);
    }
  }, []);

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
    loadWeeklyOverview,
    multiWeekOverview,
    setMultiWeekOverview,
    multiWeekOverviewLoading,
    multiWeekOverviewError,
    multiWeekFilters,
    setMultiWeekFilters,
    loadMultiWeekOverview
  };
}
