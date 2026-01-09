import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { login, restore, getUser, getUsers, Tasks, Notifications, registerUser, updateUserAdmin, deleteUserAdmin, changePassword, apiOrigin, PasswordReset, TaskViews, WeeklyGoals, Team, TaskTypes, TaskStatuses, getTheme, saveTheme } from './api';
import { api } from './api';
import './App.css'
import { createPortal } from 'react-dom';
import * as ExcelJS from 'exceljs';
import logo from './assets/VadenLogo.svg';
import darkLogo from './assets/Dark_VadenLogo.svg';
import lightLogo from './assets/Light_VadenLogo.svg';
import { computeWeeklyScore } from './utils/computeWeeklyScore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';


const WEEKLY_BASE_MINUTES = 2700;

const PRIORITY_LEVELS = [
  {
    label: 'Düşük',
    description: 'Süreci aksatmayan, geliştirme/iyileştirme amaçlı görevler.',
    color: '#10b981'
  },
  {
    label: 'Orta',
    description: 'Stoklu ürün; sipariş stok altına inse bile acil üretim/sevkiyat gerekmiyor.',
    color: '#eab308'
  },
  {
    label: 'Yüksek',
    description: 'Belirli bir ürünün üretim/sevkiyatını tamamen ya da kısmen aksatabilir.',
    color: '#f97316'
  },
  {
    label: 'Kritik',
    description: 'Tüm üretimi/sevkiyatı tamamen/kısmen durdurma riski var.',
    color: '#ef4444'
  }
];

// Priority info tooltip shown when hovering over priority label
const PriorityLabelWithTooltip = ({ htmlFor, currentTheme }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative flex items-center gap-2 cursor-help"
      style={{ justifySelf: 'start' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      <label
        htmlFor={htmlFor}
        className="!text-[24px] sm:!text-[16px] font-medium text-left"
        style={{ color: currentTheme?.text || '#e5e7eb' }}
      >
        Öncelik
      </label>
      {visible && (
        <div
          className="absolute top-full left-0 z-[9999] mt-3 w-[700px] translate-x-[80px] transform rounded-2xl p-4 text-sm shadow-[0_18px_45px_rgba(0,0,0,0.45)] backdrop-blur-md text-left"
          style={{
            backgroundColor: currentTheme?.tableBackground || currentTheme?.background || '#111827',
            border: `1px solid ${currentTheme?.border || 'rgba(255,255,255,0.1)'}`,
            color: currentTheme?.text || '#e5e7eb'
          }}
          onMouseEnter={() => setVisible(true)}
          onMouseLeave={() => setVisible(false)}
        >
          <div className="text-sm font-semibold" style={{ color: currentTheme?.text || '#ffffff' }}>
            Öncelik seçimi (gereksiz yere "Yüksek" / "Kritik" seçmeyin)
          </div>
          <ul className="mt-3 space-y-2">
            {PRIORITY_LEVELS.map((level) => (
              <li key={level.label} className="flex items-center gap-[10px]">
                <span
                  className="inline-block h-3 w-3 flex-shrink-0 rounded-full shadow"
                  style={{
                    backgroundColor: level.color,
                    minWidth: '12px',
                    minHeight: '12px',
                    border: `1px solid ${currentTheme?.border || 'rgba(255,255,255,0.15)'}`
                  }}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium leading-5" style={{ color: currentTheme?.text || '#ffffff' }}>
                  {level.label} : {level.description}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-sm font-semibold" style={{ color: currentTheme?.text || '#ffffff' }}>
            Not: Önceliği işin gerçek etkisine göre belirleyin; gereksiz yükseltmeler ekip planını olumsuz etkiler.
          </p>
        </div>
      )}
    </div>
  );
};

// Tooltip component with dynamic positioning using fixed positioning
const TooltipStatus = ({ task, onLoadHistory, getStatusColor, getStatusText, formatDateOnly, getLastAddedDescription, currentTheme }) => {
  const [tooltipPosition, setTooltipPosition] = useState({ visible: false, top: 0, left: 0, arrowPosition: 'bottom', arrowLeft: 0 });
  const statusRef = useRef(null);

  const handleMouseEnter = () => {
    onLoadHistory();

    if (statusRef.current) {
      const rect = statusRef.current.getBoundingClientRect();
      const tooltipHeight = 150; // Estimated tooltip height
      const tooltipWidth = 300; // Estimated tooltip width
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Calculate tooltip position (centered horizontally above/below status indicator)
      const left = rect.left + (rect.width / 2) - (tooltipWidth / 2);

      // Keep tooltip within viewport bounds
      const clampedLeft = Math.max(10, Math.min(left, window.innerWidth - tooltipWidth - 10));

      let top, arrowPosition;

      // If there's not enough space below but enough space above, show tooltip on top
      if (spaceBelow < tooltipHeight + 20 && spaceAbove > tooltipHeight + 20) {
        top = rect.top - tooltipHeight - 10; // Position above
        arrowPosition = 'bottom';
      } else {
        top = rect.bottom + 10; // Position below
        arrowPosition = 'top';
      }

      // Ensure tooltip stays within viewport
      if (top < 10) {
        top = 10;
      } else if (top + tooltipHeight > window.innerHeight - 10) {
        top = window.innerHeight - tooltipHeight - 10;
      }

      setTooltipPosition({
        visible: true,
        top,
        left: clampedLeft,
        arrowPosition,
        arrowLeft: rect.left + (rect.width / 2) - clampedLeft // Arrow position relative to tooltip
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltipPosition({ visible: false, top: 0, left: 0, arrowPosition: 'bottom' });
  };

  return (
    <div
      ref={statusRef}
      className="relative group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="w-8 h-8 rounded-full cursor-help shadow-lg transition-all duration-200 hover:scale-110"
        style={{
          backgroundColor: getStatusColor(task.status, task),
          border: `3px solid ${currentTheme?.border || 'rgba(255, 255, 255, 0.3)'}`,
          boxShadow: `0 4px 12px ${currentTheme?.background || 'rgba(0, 0, 0, 0.3)'}80, 0 0 0 1px ${currentTheme?.border || 'rgba(255, 255, 255, 0.1)'}`,
          width: '24px',
          height: '24px'
        }}
      ></div>
      {tooltipPosition.visible && (
        <div
          className="fixed px-4 py-3 text-xs rounded-xl shadow-xl transition-opacity duration-200 pointer-events-none z-[9999]"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            opacity: 1,
            backgroundColor: currentTheme?.tableBackground || currentTheme?.background || 'rgba(17, 24, 39, 0.98)',
            color: currentTheme?.text || '#ffffff',
            border: `1px solid ${currentTheme?.border || 'rgba(156, 163, 175, 1)'}`,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            minWidth: '300px',
            maxWidth: '400px',
            padding: '20px 16px'
          }}
          onMouseEnter={(e) => e.stopPropagation()}
        >
          <div className="text-justify" style={{ color: currentTheme?.text || '#ffffff' }}>Bitiş Tarihi: {task.due_date ? formatDateOnly(task.due_date) : 'Belirtilmemiş'}</div>
          <div className="text-justify" style={{ color: currentTheme?.text || '#ffffff' }}>Durum: {getStatusText(task.status, task)}</div>
          <div className="max-w-full break-words whitespace-normal text-justify" style={{ color: currentTheme?.text || '#ffffff' }}>{getLastAddedDescription()}</div>
          <div
            className="absolute w-0 h-0 border-l-4 border-r-4"
            style={{
              [tooltipPosition.arrowPosition === 'top' ? 'bottom' : 'top']: '-4px',
              left: `${tooltipPosition.arrowLeft}px`,
              transform: 'translateX(-50%)',
              [tooltipPosition.arrowPosition === 'top'
                ? 'borderTopColor'
                : 'borderBottomColor']: currentTheme?.tableBackground || currentTheme?.background || 'rgba(17, 24, 39, 0.98)',
              [tooltipPosition.arrowPosition === 'top'
                ? 'borderBottomColor'
                : 'borderTopColor']: 'transparent',
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent'
            }}
          ></div>
        </div>
      )}
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingDates, setEditingDates] = useState({ start_date: '', due_date: '' });
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'waiting',
    task_type: 'development',
    responsible_id: null,
    assigned_users: [],
    start_date: '',
    due_date: '',
    attachments: []
  });
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [assigneeSearchDetail, setAssigneeSearchDetail] = useState('');
  const [showAssigneeDropdownDetail, setShowAssigneeDropdownDetail] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [transferButtonText, setTransferButtonText] = useState('Tamamlanmayan İşleri Aktar');

  const resetNewTask = () => {
    setNewTask({
      title: '',
      description: '',
      priority: 'medium',
      status: 'waiting',
      task_type: 'development',
      responsible_id: null,
      assigned_users: [],
      start_date: '',
      due_date: '',
      attachments: []
    });
    setAssigneeSearch('');
    setShowAssigneeDropdown(false);
    setError(null);
  };
  const [sortConfig, setSortConfig] = useState({ key: null, dir: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [markingAllNotifications, setMarkingAllNotifications] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [users, setUsers] = useState([]);
  const [taskHistory, setTaskHistory] = useState([]);
  const [taskLastViews, setTaskLastViews] = useState([]);
  const [taskHistories, setTaskHistories] = useState({});
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [showTaskSettings, setShowTaskSettings] = useState(false);
  const [selectedTaskTypeForStatuses, setSelectedTaskTypeForStatuses] = useState('development');
  const [newTaskTypeName, setNewTaskTypeName] = useState('');
  const [newTaskTypeColor, setNewTaskTypeColor] = useState('#3b82f6');
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#ef4444');
  const [customTaskTypes, setCustomTaskTypes] = useState([]);
  const [customTaskStatuses, setCustomTaskStatuses] = useState({});
  const [allTaskTypesFromAPI, setAllTaskTypesFromAPI] = useState([]); // Tüm task types (sistem + custom)

  // Edit mode states
  const [editingTaskTypeId, setEditingTaskTypeId] = useState(null);
  const [editingTaskStatusId, setEditingTaskStatusId] = useState(null);
  const [editingTaskTypeName, setEditingTaskTypeName] = useState('');
  const [editingTaskTypeColor, setEditingTaskTypeColor] = useState('');
  const [editingTaskStatusName, setEditingTaskStatusName] = useState('');
  const [editingTaskStatusColor, setEditingTaskStatusColor] = useState('');
  const [showWeeklyGoals, setShowWeeklyGoals] = useState(false);
  const [weeklyGoals, setWeeklyGoals] = useState({ goal: null, items: [], locks: { targets_locked: false, actuals_locked: false }, summary: null });
  const [weeklyWeekStart, setWeeklyWeekStart] = useState('');
  const [weeklyUserId, setWeeklyUserId] = useState(null); // null = current user
  const [showWeeklyOverview, setShowWeeklyOverview] = useState(false);
  const [weeklyOverview, setWeeklyOverview] = useState({ week_start: '', items: [] });
  const [weeklyOverviewLoading, setWeeklyOverviewLoading] = useState(false);
  const [weeklyOverviewError, setWeeklyOverviewError] = useState(null);
  const [weeklyOverviewWeekStart, setWeeklyOverviewWeekStart] = useState('');
  const [weeklyLeaveMinutesInput, setWeeklyLeaveMinutesInput] = useState('0');
  const [weeklyOvertimeMinutesInput, setWeeklyOvertimeMinutesInput] = useState('0');
  const [showGoalDescription, setShowGoalDescription] = useState(false);
  const [selectedGoalIndex, setSelectedGoalIndex] = useState(null);
  const [goalDescription, setGoalDescription] = useState('');
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [descDraft, setDescDraft] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [bulkLeaderId, setBulkLeaderId] = useState('');
  const bellRef = useRef(null);
  const notifPanelRef = useRef(null);
  const [notifPos, setNotifPos] = useState({ top: 64, right: 16 });
  const badgeCount = Array.isArray(notifications) ? notifications.filter(n => !n.isFrontendNotification && !n.read_at).length : 0;
  const prevWeeklyDataRef = useRef({ items: null, leaveMinutes: null });
  const [historyDeleteMode, setHistoryDeleteMode] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showUpdatesModal, setShowUpdatesModal] = useState(false);
  const [updatesContent, setUpdatesContent] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedTaskType, setSelectedTaskType] = useState('all');
  const [passwordResetRequests, setPasswordResetRequests] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null); // { percent: number|null, label: string }
  const [attachmentsExpanded, setAttachmentsExpanded] = useState(false);
  const [detailDraft, setDetailDraft] = useState(null);
  const assigneeDetailInputRef = useRef(null);
  const [weeklySaveState, setWeeklySaveState] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const weeklySaveStateTimeoutRef = useRef(null);

  // Debounce timers for inputs (moved to top level to avoid hooks rule violation)
  const numberInputDebounceTimers = useRef({});

  // Debounced update function for number inputs (instant update for performance)
  const updateNumberInput = useCallback((row, field, value) => {
    const rowId = row.id || `row-${weeklyGoals.items.indexOf(row)}`;
    const timerKey = `${rowId}-${field}`;

    // Clear existing timer
    if (numberInputDebounceTimers.current[timerKey]) {
      clearTimeout(numberInputDebounceTimers.current[timerKey]);
    }

    // Set new timer (150ms delay)
    numberInputDebounceTimers.current[timerKey] = setTimeout(() => {
      const items = [...weeklyGoals.items];
      const itemIndex = items.findIndex(r => r === row);
      if (itemIndex >= 0) {
        items[itemIndex][field] = Number(value || 0);
        setWeeklyGoals({ ...weeklyGoals, items });
      }
      delete numberInputDebounceTimers.current[timerKey];
    }, 150);
  }, [weeklyGoals]);

  // Refs to store text input values without triggering re-renders
  const textInputRefs = useRef({});
  const goalDescriptionRef = useRef(null);

  // Function to get text input ref key
  const getTextInputKey = useCallback((row, field) => {
    const rowId = row.id || `row-${weeklyGoals.items.indexOf(row)}`;
    return `${rowId}-${field}`;
  }, [weeklyGoals]);

  // Function to save text input to main state (called on blur or save)
  const saveTextInputToState = useCallback((row, field, value) => {
    const items = [...weeklyGoals.items];
    const itemIndex = items.findIndex(r => r === row);
    if (itemIndex >= 0) {
      items[itemIndex][field] = value;
      setWeeklyGoals({ ...weeklyGoals, items });
    }
  }, [weeklyGoals]);
  const [showThemePanel, setShowThemePanel] = useState(false);
  const [themeSaveState, setThemeSaveState] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const isInitialThemeLoadRef = useRef(true);

  // Hazır temalar
  const predefinedThemes = {
    dark: {
      name: 'Koyu Tema',
      background: '#0f172a',
      text: '#e2e8f0',
      textSecondary: '#94a3b8',
      accent: '#3b82f6',
      border: '#334155',
      tableBackground: '#1e293b',
      tableRowAlt: '#1a2332',
      tableHeader: '#334155',
      socialIconColor: '#94a3b8'
    },
    light: {
      name: 'Açık Tema',
      background: '#f8fafc',
      text: '#1e293b',
      textSecondary: '#64748b',
      accent: '#3b82f6',
      border: '#e2e8f0',
      tableBackground: '#ffffff',
      tableRowAlt: '#f1f5f9',
      tableHeader: '#e2e8f0',
      socialIconColor: '#475569'
    },
    blue: {
      name: 'Mavi Tema',
      background: '#0a1220',
      text: '#e0e7ff',
      textSecondary: '#a5b4fc',
      accent: '#3b82f6',
      border: '#1e3a8a',
      tableBackground: '#1e293b',
      tableRowAlt: '#1a2332',
      tableHeader: '#1e3a8a',
      socialIconColor: '#a5b4fc'
    },
    green: {
      name: 'Yeşil Tema',
      background: '#0a1f0a',
      text: '#d1fae5',
      textSecondary: '#86efac',
      accent: '#10b981',
      border: '#166534',
      tableBackground: '#1a2e1a',
      tableRowAlt: '#0f2410',
      tableHeader: '#166534',
      socialIconColor: '#86efac'
    },
    purple: {
      name: 'Mor Tema',
      background: '#1a0a2e',
      text: '#f3e8ff',
      textSecondary: '#c084fc',
      accent: '#9333ea',
      border: '#6b21a8',
      tableBackground: '#2d1b3d',
      tableRowAlt: '#241530',
      tableHeader: '#6b21a8',
      socialIconColor: '#c084fc'
    },
    orange: {
      name: 'Turuncu Tema',
      background: '#1f0f0a',
      text: '#ffe4d6',
      textSecondary: '#fdba74',
      accent: '#f97316',
      border: '#7c2d12',
      tableBackground: '#2e1f1a',
      tableRowAlt: '#251810',
      tableHeader: '#7c2d12',
      socialIconColor: '#fdba74'
    }
  };

  // Özel tema state'i (başlangıçta light tema değerleriyle)
  const [customTheme, setCustomTheme] = useState({
    background: '#f8fafc',
    text: '#1e293b',
    textSecondary: '#64748b',
    accent: '#3b82f6',
    border: '#e2e8f0',
    tableBackground: '#ffffff',
    tableRowAlt: '#f1f5f9',
    tableHeader: '#e2e8f0',
    logoType: 'dark', // 'dark' veya 'light' (light temada dark logo kullanılır)
    socialIconColor: '#475569'
  });

  // Mevcut tema (hazır tema adı veya 'custom')
  const [currentThemeName, setCurrentThemeName] = useState('light');
  const [isThemeLoading, setIsThemeLoading] = useState(true);

  // Tema objesi (hazır tema veya özel tema)
  const currentTheme = useMemo(() => {
    if (currentThemeName === 'custom') {
      return customTheme;
    }
    return predefinedThemes[currentThemeName] || predefinedThemes.dark;
  }, [currentThemeName, customTheme]);

  // Logo seçimi (tema değişkenine göre)
  // Light temada dark logo, dark temada light logo kullanılır (ters mantık)
  const currentLogo = useMemo(() => {
    // Custom tema için kullanıcının seçtiği logo tipini kullan
    if (currentThemeName === 'custom') {
      return customTheme.logoType === 'light' ? lightLogo : darkLogo;
    }

    // Hazır temalar için: light temada dark logo, dark temalarda light logo
    const isLightTheme = currentThemeName === 'light';
    return isLightTheme ? darkLogo : lightLogo;
  }, [currentThemeName, customTheme.logoType]);

  // Backend'den temayı yükle
  useEffect(() => {
    const loadUserTheme = async () => {
      if (!user) {
        setIsThemeLoading(false);
        isInitialThemeLoadRef.current = false;
        return;
      }

      isInitialThemeLoadRef.current = true;
      setIsThemeLoading(true);
      try {
        const themePrefs = await getTheme();
        console.log('Theme loaded from backend:', themePrefs);
        if (themePrefs && themePrefs.theme_name) {
          setCurrentThemeName(themePrefs.theme_name);
          if (themePrefs.theme_name === 'custom' && themePrefs.custom_theme) {
            // Eski window değerini tableBackground'a migrate et
            const customThemeData = { ...themePrefs.custom_theme };
            if (customThemeData.window && !customThemeData.tableBackground) {
              customThemeData.tableBackground = customThemeData.window;
              delete customThemeData.window;
            }
            // logoType yoksa varsayılan olarak 'dark' ekle
            if (!customThemeData.logoType) {
              customThemeData.logoType = 'dark';
            }
            // tableHeader yoksa varsayılan olarak border rengini kullan
            if (!customThemeData.tableHeader) {
              customThemeData.tableHeader = customThemeData.border || '#334155';
            }
            // socialIconColor yoksa textSecondary'den al
            if (!customThemeData.socialIconColor) {
              customThemeData.socialIconColor = customThemeData.textSecondary || '#94a3b8';
            }
            setCustomTheme(customThemeData);
          }
        } else {
          // Backend'de tema yoksa varsayılan temayı kullan ama kaydetme
          console.log('No theme found in backend, using default');
          setCurrentThemeName('dark');
        }
      } catch (error) {
        console.error('Failed to load theme from backend:', error);
        // Fallback to localStorage if backend fails
        const saved = localStorage.getItem('appTheme');
        if (saved) {
          setCurrentThemeName(saved);
        }
      } finally {
        setIsThemeLoading(false);
        // İlk yükleme tamamlandıktan sonra flag'i false yap
        setTimeout(() => {
          isInitialThemeLoadRef.current = false;
          console.log('Initial theme load completed, saving enabled');
        }, 1000);
      }
    };

    loadUserTheme();
  }, [user]);

  // Tema değiştiğinde backend'e kaydet (sadece tema paneli kapalıyken ve kullanıcı manuel değiştirdiğinde)
  useEffect(() => {
    if (!user || isThemeLoading || isInitialThemeLoadRef.current || showThemePanel) {
      // Tema paneli açıkken kaydetme işlemi sadece "Kaydet" butonuna basıldığında yapılacak
      return;
    }

    const saveUserTheme = async () => {
      try {
        await saveTheme(currentThemeName, currentThemeName === 'custom' ? customTheme : null);
      } catch (error) {
        console.error('Failed to save theme to backend:', error);
        // Fallback to localStorage if backend fails
        localStorage.setItem('appTheme', currentThemeName);
        if (currentThemeName === 'custom') {
          localStorage.setItem('customTheme', JSON.stringify(customTheme));
        }
      }
    };

    saveUserTheme();
  }, [currentThemeName, customTheme, user, isThemeLoading, showThemePanel]);

  // Tema ayarları açıldığında customTheme'i currentTheme ile senkronize et (sadece bir kez)
  const prevShowThemePanelRef = useRef(false);
  useEffect(() => {
    // Sadece modal yeni açıldığında çalış (false -> true geçişi)
    if (showThemePanel && !prevShowThemePanelRef.current) {
      // Mevcut aktif temanın renklerini customTheme'e kopyala
      const themeToSync = {
        ...currentTheme,
        logoType: currentTheme.logoType || (currentThemeName === 'light' ? 'dark' : 'light'),
        socialIconColor: currentTheme.socialIconColor || currentTheme.textSecondary,
        tableHeader: currentTheme.tableHeader || currentTheme.border
      };
      setCustomTheme(themeToSync);
      setThemeSaveState('idle'); // Modal açıldığında kaydet durumunu sıfırla
    }
    prevShowThemePanelRef.current = showThemePanel;
  }, [showThemePanel, currentTheme, currentThemeName]);


  // Tema CSS değişkenlerini uygula
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // CSS değişkenlerini ayarla
    root.style.setProperty('--theme-bg', currentTheme.background);
    root.style.setProperty('--theme-window', currentTheme.background); // Window = Background
    root.style.setProperty('--theme-text', currentTheme.text);
    root.style.setProperty('--theme-text-secondary', currentTheme.textSecondary);
    root.style.setProperty('--theme-accent', currentTheme.accent);
    root.style.setProperty('--theme-border', currentTheme.border);
    root.style.setProperty('--theme-table-bg', currentTheme.tableBackground || currentTheme.background);
    root.style.setProperty('--theme-table-header', currentTheme.tableHeader || currentTheme.tableBackground || currentTheme.background);
    root.style.setProperty('--theme-table-row-alt', currentTheme.tableRowAlt || currentTheme.background);
    root.style.setProperty('--theme-social-icon', currentTheme.socialIconColor || currentTheme.textSecondary);
    root.style.setProperty('--theme-placeholder', currentTheme.textSecondary || currentTheme.text);

    // Placeholder rengi için CSS değişkeni
    root.style.setProperty('--theme-placeholder', currentTheme.textSecondary);

    // Body ve HTML arkaplan rengini ayarla
    root.style.backgroundColor = currentTheme.background;
    body.style.backgroundColor = currentTheme.background;
  }, [currentTheme]);

  function getMonday(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // Monday as 1
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function fmtYMD(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function isoWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
  }

  function at1330(d) {
    const x = new Date(d);
    x.setHours(13, 30, 0, 0);
    return x;
  }

  // Compute UI locks for targets and actuals based on business rules
  const uiLocks = useMemo(() => {
    try {
      // Selected week start (Monday 00:00)
      const selStart = weeklyWeekStart ? new Date(weeklyWeekStart) : getMonday();
      selStart.setHours(0, 0, 0, 0);

      // Current week start (Monday 00:00)
      const now = new Date();
      const curStart = getMonday(now);
      curStart.setHours(0, 0, 0, 0);

      const curStart1330 = at1330(curStart);
      const isSelectedCurrent = selStart.getTime() === curStart.getTime();
      const isSelectedFuture = selStart.getTime() > curStart.getTime();
      const isSelectedPreviousWeek = selStart.getTime() === curStart.getTime() - (7 * 24 * 60 * 60 * 1000); // Önceki hafta (7 gün önce)
      const isBefore1330 = now < curStart1330; // Mevcut hafta Pazartesi 13:30'dan önce mi?

      let targetsUnlocked = false;
      let actualsUnlocked = false;

      if (isSelectedFuture) {
        // Future weeks: no locks at all
        targetsUnlocked = true;
        actualsUnlocked = true; // Gelecek haftalar için gerçekleşme açık
      } else if (isSelectedCurrent) {
        // Current week: targets closed after Mon 13:30, actuals always open
        targetsUnlocked = isBefore1330;
        actualsUnlocked = true; // İçinde bulunduğumuz hafta için gerçekleşme her zaman açık
      } else if (isSelectedPreviousWeek) {
        // Previous week: targets always locked, actuals open only if current week is before Mon 13:30
        targetsUnlocked = false; // Önceki haftanın hedefleri her zaman kilitli
        actualsUnlocked = isBefore1330; // Önceki haftanın gerçekleşmesi sadece mevcut hafta Pazartesi 13:30'dan önceyse açık
      } else {
        // Older past weeks: both targets and actuals locked
        targetsUnlocked = false;
        actualsUnlocked = false; // Daha eski geçmiş haftalar için gerçekleşme kilitli
      }

      return {
        targets_locked: !targetsUnlocked,
        actuals_locked: !actualsUnlocked,
      };
    } catch (e) {
      console.warn('UI locks compute failed:', e);
      return { targets_locked: false, actuals_locked: false };
    }
  }, [weeklyWeekStart]);
  const combinedLocks = useMemo(() => {
    const backendTargetsLocked = !!(weeklyGoals?.locks?.targets_locked);
    const backendActualsLocked = !!(weeklyGoals?.locks?.actuals_locked);
    return {
      targets_locked: backendTargetsLocked || uiLocks.targets_locked,
      actuals_locked: backendActualsLocked || uiLocks.actuals_locked,
    };
  }, [weeklyGoals?.locks, uiLocks]);

  const weeklyLeaveMinutes = useMemo(() => {
    try {
      const normalized = (weeklyLeaveMinutesInput ?? '').toString().replace(',', '.').trim();
      if (!normalized) return 0;
      const minutes = Math.round(Number(normalized));
      if (!Number.isFinite(minutes) || minutes <= 0) return 0;
      return Math.min(WEEKLY_BASE_MINUTES, Math.max(0, minutes));
    } catch (err) {
      console.warn('weeklyLeaveMinutes compute failed:', err);
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
      console.warn('weeklyOvertimeMinutes compute failed:', err);
      return 0;
    }
  }, [weeklyOvertimeMinutesInput]);

  const handleWeeklyLeaveMinutesChange = useCallback((event) => {
    const raw = (event?.target?.value ?? '').toString();
    if (raw === '') {
      setWeeklyLeaveMinutesInput('');
      return;
    }
    if (!/^\d*$/.test(raw)) {
      return;
    }
    setWeeklyLeaveMinutesInput(raw);
  }, []);

  const handleWeeklyLeaveMinutesBlur = useCallback(() => {
    const normalized = (weeklyLeaveMinutesInput ?? '').toString().trim();
    if (!normalized) {
      setWeeklyLeaveMinutesInput('0');
      return;
    }
    const parsed = parseInt(normalized, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      setWeeklyLeaveMinutesInput('0');
      return;
    }
    const clamped = Math.min(parsed, WEEKLY_BASE_MINUTES);
    setWeeklyLeaveMinutesInput(clamped.toString());
  }, [weeklyLeaveMinutesInput]);

  const handleWeeklyOvertimeMinutesChange = useCallback((event) => {
    const raw = (event?.target?.value ?? '').toString();
    if (raw === '') {
      setWeeklyOvertimeMinutesInput('');
      return;
    }
    if (!/^\d*$/.test(raw)) {
      return;
    }
    setWeeklyOvertimeMinutesInput(raw);
  }, []);

  const handleWeeklyOvertimeMinutesBlur = useCallback(() => {
    const normalized = (weeklyOvertimeMinutesInput ?? '').toString().trim();
    if (!normalized) {
      setWeeklyOvertimeMinutesInput('0');
      return;
    }
    const parsed = parseInt(normalized, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      setWeeklyOvertimeMinutesInput('0');
      return;
    }
    setWeeklyOvertimeMinutesInput(parsed.toString());
  }, [weeklyOvertimeMinutesInput]);

  // Performans harfi ve rengi hesaplama
  function getPerformanceGrade(score) {
    if (score >= 111) return { grade: 'A', color: '#00c800', description: 'Üstün Başarı' };
    if (score >= 101) return { grade: 'B', color: '#3dac05', description: 'Beklentiyi Aşıyor' };
    if (score >= 80) return { grade: 'C', color: '#649600', description: 'Beklentiyi Karşılıyor' };
    if (score >= 55) return { grade: 'D', color: '#fa6400', description: 'İyileştirme Gerekli' };
    return { grade: 'E', color: '#fa3200', description: 'Yetersiz' };
  }

  // Live summary for UI (updates immediately on input changes)
  const weeklyLive = useMemo(() => {
    const items = Array.isArray(weeklyGoals.items) ? weeklyGoals.items : [];

    const planned = items.filter(x => !x.is_unplanned).map(x => ({
      name: x?.name,
      target_minutes: Math.max(0, Number(x?.target_minutes || 0)),
      actual_minutes: Math.max(0, Number(x?.actual_minutes || 0)),
      is_completed: x?.is_completed === true,
    }));

    const unplanned = items.filter(x => x.is_unplanned).map(x => ({
      name: x?.name,
      actual_minutes: Math.max(0, Number(x?.actual_minutes || 0)),
    }));

    const breakdown = computeWeeklyScore({
      baseMinutes: WEEKLY_BASE_MINUTES,      // sende zaten var (2700)
      leaveMinutes: weeklyLeaveMinutes,      // senin state'in
      overtimeMinutes: weeklyOvertimeMinutes, // mesai süresi
      planned,
      unplanned,
      params: {
        alpha: 0.10,
        beta: 0.25,
        B_max: 0.20,
        eta_max: 2.0,
        kappa: 0.50,
        lambda_: 0.75,
        mu: 2.5,
        scoreCap: 130,
        incompletePenalty: 0.10,
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
      overCapacity: totalTarget > availableMinutes,
      overActualCapacity: totalActual > availableMinutes,

      // debug/rapor için detay
      breakdown,
      overtimeBonusPercent: Number((overtimeBonus * 100).toFixed(2)),
    };
  }, [weeklyGoals.items, weeklyLeaveMinutes, weeklyOvertimeMinutes]);


  // Warn if total planned time exceeds available minutes after leave
  const overTargetWarnedRef = useRef(false);
  useEffect(() => {
    const tt = Number(weeklyLive?.totalTarget || 0);
    const capacity = Number.isFinite(weeklyLive?.availableMinutes)
      ? Number(weeklyLive.availableMinutes)
      : WEEKLY_BASE_MINUTES;

    if (capacity >= 0 && tt > capacity) {
      if (!overTargetWarnedRef.current) {
        addNotification('Planlı hedef toplamı izin sonrası kullanılabilir süreyi aşıyor', 'warning');
        overTargetWarnedRef.current = true;
      }
    } else {
      overTargetWarnedRef.current = false;
    }
  }, [weeklyLive.totalTarget, weeklyLive.availableMinutes]);

  async function loadWeeklyGoals(weekStart = null, userId = null) {
    try {
      const ws = weekStart || weeklyWeekStart || fmtYMD(getMonday());
      setWeeklyWeekStart(ws);

      // userId parametresi açıkça geçilmişse onu kullan, yoksa mevcut weeklyUserId'yi kullan
      let uid;
      if (userId !== null) {
        uid = userId;
      } else if (userId === null && arguments.length > 1) {
        // userId açıkça null olarak geçilmişse
        uid = null;
      } else {
        // userId parametresi geçilmemişse mevcut state'i kullan
        uid = weeklyUserId;
      }

      setWeeklyUserId(uid);
      const params = { week_start: ws };
      if (uid) params.user_id = uid;
      const res = await WeeklyGoals.get(params);

      // Backend'den gelen items'ı parse et (is_completed ve is_unplanned boolean'a çevir)
      const parsedItems = Array.isArray(res.items) ? res.items.map(item => ({
        ...item,
        is_completed: Boolean(item.is_completed), // 0/1 veya false/true → boolean
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
  }

  async function loadWeeklyOverview(weekStart = null) {
    const ws = weekStart || weeklyOverviewWeekStart || fmtYMD(getMonday());
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
  }

  async function transferIncompleteTasksFromPreviousWeek() {
    try {
      // Buton metnini "Aktarılıyor..." olarak değiştir
      setTransferButtonText('Aktarılıyor...');

      // Hedefler kilitliyse işlem yapılamaz
      if (combinedLocks.targets_locked && user?.role !== 'admin') {
        setTransferButtonText('Tamamlanmayan İşleri Aktar');
        addNotification('Hedefler kilitli olduğu için işlem yapılamaz.', 'error');
        return;
      }

      // Observer hiçbir zaman bu işlemi yapamaz
      if (user?.role === 'observer') {
        setTransferButtonText('Tamamlanmayan İşleri Aktar');
        addNotification('Bu işlem için yetkiniz yok.', 'error');
        return;
      }

      // Mevcut haftanın başlangıcını al
      const currentWeekStart = weeklyWeekStart || fmtYMD(getMonday());
      const currentWeekDate = new Date(currentWeekStart);

      // Önceki haftanın başlangıcını hesapla (7 gün geriye git)
      const previousWeekDate = new Date(currentWeekDate);
      previousWeekDate.setDate(previousWeekDate.getDate() - 7);
      const previousWeekStart = fmtYMD(getMonday(previousWeekDate));

      // Önceki haftanın verilerini çek
      const params = { week_start: previousWeekStart };
      if (weeklyUserId) params.user_id = weeklyUserId;
      const res = await WeeklyGoals.get(params);

      // Backend'den gelen items'ı parse et
      const previousWeekItems = Array.isArray(res.items) ? res.items.map(item => ({
        ...item,
        is_completed: Boolean(item.is_completed),
        is_unplanned: Boolean(item.is_unplanned),
      })) : [];

      // Tamamlanmamış (is_completed: false) ve planlı (is_unplanned: false) işleri filtrele
      const incompletePlannedTasks = previousWeekItems.filter(item =>
        !item.is_completed && !item.is_unplanned
      );

      if (incompletePlannedTasks.length === 0) {
        setTransferButtonText('Aktarılacak iş bulunamadı');
        setTimeout(() => {
          setTransferButtonText('Tamamlanmayan İşleri Aktar');
        }, 5000);
        addNotification('Önceki haftada aktarılacak tamamlanmamış iş bulunamadı.', 'info');
        return;
      }

      // Mevcut haftadaki işleri al (başlık ve aksiyon planına göre karşılaştırma için)
      const currentWeekItems = Array.isArray(weeklyGoals.items) ? weeklyGoals.items : [];

      // Normalize fonksiyonu: boşlukları temizle ve küçük harfe çevir
      const normalize = (str) => (str || '').trim().toLowerCase();

      // Mevcut haftada zaten var olan işleri kontrol et (başlık ve aksiyon planına göre)
      const tasksToAdd = incompletePlannedTasks.filter(previousTask => {
        const previousTitle = normalize(previousTask.title);
        const previousActionPlan = normalize(previousTask.action_plan);

        // Mevcut haftada aynı başlık ve aksiyon planına sahip iş var mı?
        const isDuplicate = currentWeekItems.some(currentTask => {
          const currentTitle = normalize(currentTask.title);
          const currentActionPlan = normalize(currentTask.action_plan);
          return currentTitle === previousTitle && currentActionPlan === previousActionPlan;
        });

        return !isDuplicate; // Duplicate değilse ekle
      });

      if (tasksToAdd.length === 0) {
        setTransferButtonText('Aktarılacak iş bulunamadı');
        setTimeout(() => {
          setTransferButtonText('Tamamlanmayan İşleri Aktar');
        }, 5000);
        addNotification('Önceki haftadan aktarılacak yeni iş bulunamadı. Tüm işler zaten mevcut haftada mevcut.', 'info');
        return;
      }

      // ID'leri kaldırarak yeni işler olarak ekle (actual_minutes ve is_completed'i sıfırla)
      const newTasks = tasksToAdd.map(task => ({
        title: task.title || '',
        action_plan: task.action_plan || '',
        target_minutes: task.target_minutes || 0,
        weight_percent: task.weight_percent || 0,
        actual_minutes: 0, // Yeni hafta için sıfırla
        is_unplanned: false,
        is_completed: false, // Yeni hafta için tamamlanmamış olarak işaretle
        description: task.description || '', // Açıklamayı da aktar
      }));

      // Mevcut işlere ekle
      const updatedItems = [...weeklyGoals.items, ...newTasks];
      setWeeklyGoals({ ...weeklyGoals, items: updatedItems });

      // Buton metnini güncelle
      const successMessage = `${newTasks.length} İş Aktarıldı`;
      setTransferButtonText(successMessage);

      // 5 saniye sonra buton metnini eski haline getir
      setTimeout(() => {
        setTransferButtonText('Tamamlanmayan İşleri Aktar');
      }, 5000);
    } catch (err) {
      console.error('Transfer incomplete tasks error:', err);
      setTransferButtonText('Tamamlanmayan İşleri Aktar');
      addNotification('Önceki haftadan işler aktarılırken bir hata oluştu.', 'error');
    }
  }

  async function saveWeeklyGoals() {
    try {
      // Observer hiçbir zaman kayıt yapamaz
      if (user?.role === 'observer') {
        addNotification('Bu işlem için yetkiniz yok.', 'error');
        return;
      }

      // Hedefler kilitliyse sadece admin tam yetkilendirilir; diğerleri gerçekleşme kaydedebilir
      // (Hedef alanları zaten UI'da disabled, backend de kontrol ediyor)

      // Save all text input refs to main state before saving
      const itemsToSave = [...weeklyGoals.items];
      let hasChanges = false;
      Object.keys(textInputRefs.current).forEach(key => {
        const ref = textInputRefs.current[key];
        if (ref && ref.value !== undefined) {
          const parts = key.split('-');
          const field = parts[parts.length - 1]; // Get last part (field name)
          const rowId = parts.slice(0, -1).join('-'); // Get all parts except last (row ID)

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

      // Clear any existing timeout for resetting save state
      if (weeklySaveStateTimeoutRef.current) {
        clearTimeout(weeklySaveStateTimeoutRef.current);
      }

      const leaveMinutesForSave = weeklyLeaveMinutes;
      const availableMinutes = Number.isFinite(weeklyLive?.availableMinutes)
        ? Number(weeklyLive.availableMinutes)
        : Math.max(0, WEEKLY_BASE_MINUTES - leaveMinutesForSave);

      // Sadece gerçekleşen süre kontrolü yapılır
      // Planlı süre kontrolü yok - izin eklendiğinde planlı süre kullanılabilir süreyi aşsa bile kaydedilebilir
      // İzin ve mesai alanları her zaman kaydedilebilir (kısıtlama yok)
      if (user?.role !== 'admin') {
        // Toplam gerçekleşen süre kontrolü (planlı + plandışı)
        // Sadece gerçekleşen süre kullanılabilir süreyi aşmamalı
        const totalActual = weeklyLive?.totalActual || 0;

        if (totalActual > availableMinutes) {
          const errorMsg = `Toplam gerçekleşen süre (${totalActual} dk) kullanılabilir süreyi (${availableMinutes} dk) aşamaz.`;
          addNotification(errorMsg, 'error');
          setWeeklySaveState('idle');
          return;
        }
      }

      // Auto compute weights from target minutes (planned only)
      const planned = itemsToSave.filter(x => !x.is_unplanned);
      const totalTarget = planned.reduce((acc, x) => acc + Math.max(0, Number(x.target_minutes || 0)), 0);

      // Zorunlu alan kontrolü: Başlık, Aksiyon Planı ve Hedef(dk) dolu olmalı
      // Not: Plandışı görevler için hedef süresi opsiyonel
      const invalidItems = itemsToSave.filter(x => {
        const hasTitle = x.title && x.title.trim() !== '';
        const hasActionPlan = x.action_plan && x.action_plan.trim() !== '';
        const hasTarget = x.target_minutes && Number(x.target_minutes) > 0;

        // Plandışı görevler için sadece başlık ve aksiyon planı zorunlu
        if (x.is_unplanned) {
          return !hasTitle || !hasActionPlan;
        }

        // Planlı görevler için başlık, aksiyon planı ve hedef zorunlu
        return !hasTitle || !hasActionPlan || !hasTarget;
      });

      if (invalidItems.length > 0) {
        const msg = invalidItems.some(x => x.is_unplanned)
          ? 'Lütfen tüm görevlere Başlık ve Aksiyon Planı girin.'
          : 'Lütfen tüm görevlere Başlık, Aksiyon Planı ve Hedef süresini girin.';
        addNotification(msg, 'error');
        setWeeklySaveState('idle');
        return;
      }

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
          is_completed: !!x.is_completed, // Yeni alan: iş bitti mi?
        };
      });

      const overtimeMinutesForSave = weeklyOvertimeMinutes;
      const payload = {
        week_start: weeklyWeekStart || fmtYMD(getMonday()),
        leave_minutes: leaveMinutesForSave,
        overtime_minutes: overtimeMinutesForSave,
        items: itemsToSave,
        ...(weeklyUserId ? { user_id: weeklyUserId } : {}),
      };
      const res = await WeeklyGoals.save(payload);

      // Backend'den dönen items'a ID'leri ekle, ancak silinen items'ı dahil etme
      // API response ile gönderdiğimiz items'ı eşleştirip ID'leri güncelle
      const savedItems = items.map((localItem, idx) => {
        // API'den gelen item'ı bul (id'ye göre veya index'e göre)
        const apiItem = (res.items || []).find(x =>
          (localItem.id && x.id === localItem.id) || (!localItem.id && res.items.indexOf(x) === idx)
        );
        return {
          ...localItem,
          id: apiItem?.id || localItem.id, // Backend'den dönen ID'yi kullan
        };
      });

      const savedLeave = Number(res.goal?.leave_minutes ?? leaveMinutesForSave);
      const savedOvertime = Number(res.goal?.overtime_minutes ?? weeklyOvertimeMinutes);

      // Ref'i ÖNCE güncelle ki state güncellemelerinden sonra useEffect değişiklik algılamasın
      // Bu, useEffect'in değişiklik algılamasını önler ve "Kaydedildi" durumunu korur
      const newLeaveMinutes = savedLeave && Number.isFinite(savedLeave) && savedLeave > 0
        ? String(Math.max(0, Math.round(savedLeave)))
        : '0';
      const newOvertimeMinutes = savedOvertime && Number.isFinite(savedOvertime) && savedOvertime > 0
        ? String(Math.max(0, Math.round(savedOvertime)))
        : '0';

      // Ref'i state güncellemelerinden ÖNCE güncelle
      prevWeeklyDataRef.current = {
        items: JSON.stringify(savedItems),
        leaveMinutes: newLeaveMinutes,
        overtimeMinutes: newOvertimeMinutes
      };

      // Şimdi state'i güncelle
      setWeeklyGoals({ goal: res.goal, items: savedItems, locks: res.locks || {}, summary: res.summary || null });
      if (Number.isFinite(savedLeave) && savedLeave > 0) {
        setWeeklyLeaveMinutesInput(newLeaveMinutes);
      } else {
        setWeeklyLeaveMinutesInput('0');
      }

      if (Number.isFinite(savedOvertime) && savedOvertime > 0) {
        setWeeklyOvertimeMinutesInput(newOvertimeMinutes);
      } else {
        setWeeklyOvertimeMinutesInput('0');
      }

      addNotification('Haftalık hedefler kaydedildi', 'success');
      setWeeklySaveState('saved');

      // Clear any existing timeout
      if (weeklySaveStateTimeoutRef.current) {
        clearTimeout(weeklySaveStateTimeoutRef.current);
      }

      // Reset to 'idle' after 2 seconds
      weeklySaveStateTimeoutRef.current = setTimeout(() => {
        setWeeklySaveState('idle');
        weeklySaveStateTimeoutRef.current = null;
      }, 2000);
    } catch (err) {
      console.error('Weekly goals save error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Kaydedilemedi';
      addNotification(errorMessage, 'error');
      setWeeklySaveState('idle');

      // Clear timeout on error
      if (weeklySaveStateTimeoutRef.current) {
        clearTimeout(weeklySaveStateTimeoutRef.current);
        weeklySaveStateTimeoutRef.current = null;
      }
    }
  }

  async function loadTeamMembers(leaderId = null) {
    try {
      const list = await Team.members(leaderId);
      setTeamMembers(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Team members load error:', e);
      setTeamMembers([]);
    }
  }



  const taskCounts = {
    active: Array.isArray(tasks) ? tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length : 0,
    completed: Array.isArray(tasks) ? tasks.filter(t => t.status === 'completed').length : 0,
    deleted: Array.isArray(tasks) ? tasks.filter(t => t.status === 'cancelled').length : 0
  };

  const taskRefreshTimer = useRef(null);
  const isRefreshingTasks = useRef(false);
  const lastTasksSigRef = useRef('');
  const showDetailModalRef = useRef(false);
  const selectedTaskRef = useRef(null);
  const lastSelectedSigRef = useRef('');
  const previousResponsibleIdRef = useRef(null);
  const previousResponsibleIdDetailRef = useRef(null);
  const manuallyRemovedUsersRef = useRef(new Set()); // Manuel olarak kaldırılan kullanıcıları takip et

  useEffect(() => { showDetailModalRef.current = showDetailModal; }, [showDetailModal]);
  useEffect(() => { selectedTaskRef.current = selectedTask; }, [selectedTask]);
  useEffect(() => {
    setDescDraft(selectedTask?.description ?? '');
  }, [selectedTask, showDetailModal]);
  useEffect(() => { lastSelectedSigRef.current = buildTaskSignatureOne(selectedTask); }, [selectedTask]);

  useEffect(() => {
    if (!showNotifications) return;

    const place = () => {
      if (!bellRef.current) return;
      const r = bellRef.current.getBoundingClientRect();
      const panelWidth = 500;
      const maxPanelHeight = 600;

      let top = r.bottom + 8;
      let right = Math.max(16, window.innerWidth - r.right + 8);

      if (top + maxPanelHeight > window.innerHeight) {
        top = Math.max(16, window.innerHeight - maxPanelHeight - 16);
      }

      if (right + panelWidth > window.innerWidth) {
        right = window.innerWidth - panelWidth - 16;
      }

      setNotifPos({
        top,
        right,
      });
    };


    const onDown = (e) => {
      const panel = notifPanelRef.current;
      const bell = bellRef.current;
      if (panel && !panel.contains(e.target) && bell && !bell.contains(e.target)) {
        setShowNotifications(false);
      }
    };

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    document.addEventListener('mousedown', onDown);

    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('mousedown', onDown);
    };
  }, [showNotifications]);


  useEffect(() => {
    function handleClickOutside(event) {
      if (showProfileMenu && !event.target.closest('.profile-menu')) {
        setShowProfileMenu(false);
      }
      if (showAssigneeDropdown && !event.target.closest('.assignee-dropdown-container')) {
        setShowAssigneeDropdown(false);
      }
      if (showAssigneeDropdownDetail && !event.target.closest('.assignee-dropdown-detail-container')) {
        setShowAssigneeDropdownDetail(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu, showAssigneeDropdown, showAssigneeDropdownDetail]);

  useEffect(() => {
    checkAuth();
  }, []); // Sadece component mount olduğunda çalış

  // Modal açıkken body scroll'unu engelle
  useEffect(() => {
    const isModalOpen = showAddForm || showDetailModal || showWeeklyGoals ||
      showGoalDescription || showUserProfile || showTeamModal ||
      showUserPanel || showNotifications || showTaskSettings;

    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddForm, showDetailModal, showWeeklyGoals, showGoalDescription,
    showUserProfile, showTeamModal, showUserPanel, showNotifications, showTaskSettings, showThemePanel]);

  useEffect(() => {
    if (user?.role !== 'admin' && showWeeklyOverview) {
      setShowWeeklyOverview(false);
    }
  }, [user?.role, showWeeklyOverview]);

  useEffect(() => {
    const preventAutofill = () => {
      const inputs = document.querySelectorAll('input');

      inputs.forEach(input => {
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('autocorrect', 'off');
        input.setAttribute('autocapitalize', 'off');
        input.setAttribute('spellcheck', 'false');
        input.setAttribute('data-lpignore', 'true');
        input.setAttribute('data-form-type', 'other');

        if (input.type === 'password') {
          input.setAttribute('autocomplete', 'new-password');
          input.setAttribute('data-lpignore', 'true');
          input.setAttribute('data-form-type', 'other');
        }

        if (input.placeholder && (input.placeholder.includes('ara') || input.placeholder.includes('search'))) {
          input.setAttribute('autocomplete', 'off');
          input.setAttribute('data-lpignore', 'true');
          input.setAttribute('data-form-type', 'other');
        }

        input.addEventListener('focus', (e) => {
          e.target.setAttribute('autocomplete', 'off');
          e.target.setAttribute('data-lpignore', 'true');
        });

        input.addEventListener('input', (e) => {
          if (e.target.value && !e.isTrusted) {
            e.target.value = '';
          }
        });
        input.addEventListener('animationstart', (e) => {
          if (e.animationName === 'onAutoFillStart') {
            e.target.value = '';
          }
        });
      });
    };

    preventAutofill();

    const interval = setInterval(preventAutofill, 50);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (showDetailModal) {
          handleCloseModal();
        } else if (showTaskSettings) {
          setShowTaskSettings(false);
        }
      }
    };
    if (showDetailModal || showTaskSettings) {
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, [showDetailModal, showTaskSettings, selectedTask, descDraft, user?.role, handleCloseModal]);

  useEffect(() => {
    if (showDetailModal) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [showDetailModal]);

  // Yeni görev formu açıldığında previousResponsibleIdRef ve manuallyRemovedUsersRef'i sıfırla
  useEffect(() => {
    if (showAddForm) {
      previousResponsibleIdRef.current = null;
      manuallyRemovedUsersRef.current = new Set();
    }
  }, [showAddForm]);

  // Görev detay modalı açıldığında previousResponsibleIdDetailRef'i sıfırla
  useEffect(() => {
    if (showDetailModal && selectedTask) {
      previousResponsibleIdDetailRef.current = selectedTask.responsible?.id || null;
    }
  }, [showDetailModal]);

  // Sorumlu seçildiğinde takım liderinin ekibini otomatik ekle (sadece yeni görev formunda)
  useEffect(() => {
    if (showAddForm && newTask.responsible_id && users) {
      const responsibleUser = users.find(u => u.id === newTask.responsible_id);

      // Önceki liderin kendisini ve ekibini kaldır
      let cleanedAssignedUsers = [...newTask.assigned_users];
      if (previousResponsibleIdRef.current) {
        const prevResponsibleUser = users.find(u => u.id === previousResponsibleIdRef.current);
        // Önceki sorumluyu atananlardan kaldır
        cleanedAssignedUsers = cleanedAssignedUsers.filter(id => id !== previousResponsibleIdRef.current);

        if (prevResponsibleUser && prevResponsibleUser.role === 'team_leader') {
          const prevTeamMembers = users.filter(u => u.leader_id === previousResponsibleIdRef.current);
          const prevTeamMemberIds = prevTeamMembers.map(m => m.id);
          cleanedAssignedUsers = cleanedAssignedUsers.filter(id => !prevTeamMemberIds.includes(id));
        }
      }

      // Yeni sorumluyu atananlardan kaldır (sorumlu aynı zamanda atanan olamaz)
      cleanedAssignedUsers = cleanedAssignedUsers.filter(id => id !== newTask.responsible_id);

      // Yeni lider takım lideriyse, ekibini ekle
      if (responsibleUser && responsibleUser.role === 'team_leader') {
        // Takım liderinin ekibini bul (ancak sorumlu kişiyi hariç tut)
        const teamMembers = users.filter(u =>
          u.leader_id === newTask.responsible_id &&
          u.id !== newTask.responsible_id
        );
        const teamMemberIds = teamMembers.map(m => m.id);
        // Manuel olarak kaldırılan kullanıcıları filtrele
        const removedUsers = manuallyRemovedUsersRef.current;
        const filteredTeamMemberIds = teamMemberIds.filter(id => !removedUsers.has(id));
        // Ekibi assigned_users'a ekle (duplikasyon olmaması için)
        const combinedIds = [...new Set([...cleanedAssignedUsers, ...filteredTeamMemberIds])];
        setNewTask({ ...newTask, assigned_users: combinedIds });
      } else {
        // Takım lideri değilse, sadece temizlenmiş listeyi kullan
        setNewTask({ ...newTask, assigned_users: cleanedAssignedUsers });
      }

      // Önceki sorumluyu güncelle
      previousResponsibleIdRef.current = newTask.responsible_id;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newTask.responsible_id, showAddForm]);

  // Reset weekly save state when data changes or modal reopens
  useEffect(() => {
    // Modal açıldığında state'i sıfırla
    if (showWeeklyGoals && weeklySaveState !== 'idle') {
      setWeeklySaveState('idle');
    }
  }, [showWeeklyGoals]);

  // Data değiştiğinde state'i sıfırla (yalnızca saved durumundaysa)
  useEffect(() => {
    const currentItemsStr = JSON.stringify(weeklyGoals.items);
    const currentLeaveMinutes = weeklyLeaveMinutesInput;
    const currentOvertimeMinutes = weeklyOvertimeMinutesInput;

    // İlk render'da önceki değerleri kaydet
    if (prevWeeklyDataRef.current.items === null) {
      prevWeeklyDataRef.current = {
        items: currentItemsStr,
        leaveMinutes: currentLeaveMinutes,
        overtimeMinutes: currentOvertimeMinutes
      };
      return;
    }

    // Değişiklik var mı kontrol et
    const hasChanged =
      prevWeeklyDataRef.current.items !== currentItemsStr ||
      prevWeeklyDataRef.current.leaveMinutes !== currentLeaveMinutes ||
      prevWeeklyDataRef.current.overtimeMinutes !== currentOvertimeMinutes;

    // Değişiklik varsa ve saved durumundaysa idle'a dön
    if (hasChanged && weeklySaveState === 'saved') {
      setWeeklySaveState('idle');
    }

    // Önceki değerleri güncelle
    prevWeeklyDataRef.current = {
      items: currentItemsStr,
      leaveMinutes: currentLeaveMinutes,
      overtimeMinutes: currentOvertimeMinutes
    };
  }, [weeklyGoals.items, weeklyLeaveMinutesInput, weeklyOvertimeMinutesInput, weeklySaveState]);

  // Haftalık hedef listesini otomatik güncelle (kayıt sonrası - sadece showWeeklyOverview açıksa)
  // Not: Bu sadece overview açıkken güncelleme yapar, kaydet butonunun durumunu etkilemez
  useEffect(() => {
    if (showWeeklyOverview && weeklyWeekStart && weeklySaveState === 'saved') {
      // Kayıt tamamlandıktan sonra kısa bir gecikme ile güncelle
      const timer = setTimeout(() => {
        loadWeeklyOverview(weeklyWeekStart);
      }, 1000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeklySaveState === 'saved', showWeeklyOverview, weeklyWeekStart]);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const isAuthenticated = await restore();
      if (isAuthenticated) {
        try {
          const userData = await getUser();
          setUser(userData);
          const jobs = [loadTasks(), loadNotifications()];
          if (['admin', 'team_leader', 'observer'].includes(userData?.role)) {
            jobs.push(loadUsers());
          }
          await Promise.all(jobs);
        } catch (err) {
          console.error('User fetch error:', err);
          // 401 veya 500 + "Unauthenticated" hatası için logout yap
          if (err.response?.status === 401 ||
            (err.response?.status === 500 && err.response?.data?.error === 'Unauthenticated.')) {
            console.warn('Token expired or invalid, logging out...');
            handleLogout();
          } else {
            console.error('Unexpected error in checkAuth:', err);
            handleLogout();
          }
        }
      }
    } catch (err) {
      console.error('Auth check error:', err);
      setError('Oturum kontrolü başarısız');
    } finally {
      setLoading(false);
    }
  }, [handleLogout, loadTasks, loadNotifications, loadUsers]);

  async function openTaskById(taskId) {
    try {
      const inList = (Array.isArray(tasks) ? tasks : []).find(t => t.id === taskId);
      if (inList) {
        await handleTaskClick(inList);
        return true;
      }
      const t = await Tasks.get(taskId);
      const task = t.task || t;
      if (task) {
        await handleTaskClick(task);
        return true;
      }
    } catch (err) {
      console.error('Open task by id error:', err);
      addNotification('Görev yüklenemedi', 'error');
    }
    return false;
  }

  async function handleNotificationClick(n) {
    try {
      if (n.action === 'open_task' && n.task_id) {
        await openTaskById(n.task_id);
        setShowNotifications(false);
      } else if ((n.action === 'open_user_settings' || n.type === 'password_reset_request') && (user?.role === 'admin')) {
        if (!showUserPanel) setShowUserPanel(true);
        if (n.user_email) setUserSearchTerm(n.user_email);
        setShowNotifications(false);
      }
    } finally {
      // Bildirim kalıcı değil: tıklanınca silinir
      try { await Notifications.delete(n.id); await loadNotifications(); } catch (error) { console.warn('Notification delete failed:', error); }
    }
  }

  async function loadTasks() {
    try {
      const tasksList = await Tasks.list();
      if (Array.isArray(tasksList)) {
        setTasks(tasksList);
      } else if (tasksList && Array.isArray(tasksList.data)) {
        setTasks(tasksList.data);
      } else {
        console.warn('Tasks API returned non-array data:', tasksList);
        setTasks([]);
      }
    } catch (err) {
      console.error('Tasks load error:', err);
      setError('Görevler yüklenemedi');
      setTasks([]);
    }
  }

  function buildTasksSignature(arr) {
    try {
      return JSON.stringify((Array.isArray(arr) ? arr : []).map(t => [
        t?.id,
        t?.updated_at ?? null,
        t?.status ?? null,
        t?.priority ?? null,
        t?.title ?? null,
        t?.responsible?.id ?? null,
        Array.isArray(t?.assigned_users) ? t.assigned_users.length : 0,
        Array.isArray(t?.attachments) ? t.attachments.length : 0,
        t?.start_date ?? null,
        t?.due_date ?? null,
      ]));
    } catch {
      return '';
    }
  }

  function buildTaskSignatureOne(t) {
    if (!t) return '';
    try {
      return JSON.stringify([
        t.id,
        t.updated_at ?? null,
        t.status ?? null,
        t.priority ?? null,
        t.title ?? null,
        t.responsible?.id ?? null,
        Array.isArray(t.assigned_users) ? t.assigned_users.map(u => u.id).join(',') : '',
        Array.isArray(t.attachments) ? t.attachments.length : 0,
        t.start_date ?? null,
        t.due_date ?? null,
      ]);
    } catch {
      return '';
    }
  }

  async function refreshTasksOnce() {
    if (isRefreshingTasks.current) return;
    isRefreshingTasks.current = true;
    try {
      const list = await Tasks.list();
      const next = Array.isArray(list) ? list : (Array.isArray(list?.data) ? list.data : []);
      const nextSig = buildTasksSignature(next);
      if (nextSig !== lastTasksSigRef.current) {
        setTasks(next);
        lastTasksSigRef.current = nextSig;
      }

      const currentSelected = selectedTaskRef.current;
      if (showDetailModalRef.current && currentSelected?.id) {
        const inList = next.find(t => t.id === currentSelected.id);
        let freshTask = inList;
        if (!freshTask) {
          try {
            const t = await Tasks.get(currentSelected.id);
            freshTask = t.task || t;
          } catch (err) {
            console.warn('Task history operation failed:', err.message);
          }
        }
        if (freshTask) {
          const nextSelSig = buildTaskSignatureOne(freshTask);
          const prevSelSig = lastSelectedSigRef.current;
          const comboboxOpen = showAssigneeDropdownDetail === true;
          if (nextSelSig !== prevSelSig) {
            if (!comboboxOpen) {
              setSelectedTask(freshTask);
              lastSelectedSigRef.current = nextSelSig;
              try {
                const h = await Tasks.getHistory(currentSelected.id);
                setTaskHistory(Array.isArray(h) ? h : []);
              } catch (err) {
                console.warn('Task history refresh failed:', err.message);
              }
              try {
                const v = await TaskViews.getLast(currentSelected.id);
                setTaskLastViews(Array.isArray(v) ? v : []);
              } catch (err) {
                console.warn('Task last views refresh failed:', err.message);
              }
            } else {
              // intentionally left blank
            }
          }
        }
      }
    } catch (error) {
      console.warn('Task refresh failed:', error);
    } finally {
      isRefreshingTasks.current = false;
    }
  }

  useEffect(() => {
    if (!user?.id) return;
    refreshTasksOnce();

    taskRefreshTimer.current = setInterval(() => {
      refreshTasksOnce();
    }, 3000);

    const onFocus = () => refreshTasksOnce();
    const onVisibility = () => { if (document.visibilityState === 'visible') refreshTasksOnce(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (taskRefreshTimer.current) clearInterval(taskRefreshTimer.current);
      taskRefreshTimer.current = null;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user?.id, refreshTasksOnce]);

  async function loadUsers() {
    try {
      const usersList = await getUsers();
      setUsers(usersList);
    } catch (err) {
      console.error('Users load error:', err);
      setUsers([]);
    }
  }

  // Load task settings only after authentication
  useEffect(() => {
    if (user?.id) {
      loadTaskSettings();
    }
  }, [user?.id]);

  // Ensure users refresh when the panel is opened (avoids stale state race)
  useEffect(() => {
    if (showUserPanel && ['admin', 'team_leader', 'observer'].includes(user?.role)) {
      loadUsers();
    }
  }, [showUserPanel, user?.role]);

  // Kullanıcı giriş yaptıktan sonra (observer değilse) users boşsa otomatik yükle
  useEffect(() => {
    if (user?.id && user.role !== 'observer' && (!users || users.length === 0)) {
      loadUsers();
    }
  }, [user?.id, user?.role, users?.length]);

  async function loadPasswordResetRequests() {
    try {
      if (user?.role === 'admin') {
        const requests = await PasswordReset.getResetRequests();
        setPasswordResetRequests(requests);
      }
    } catch (err) {
      console.error('Load password reset requests error:', err);
      setPasswordResetRequests([]);
    }
  }

  async function loadNotifications() {
    try {
      const res = await Notifications.list();

      let list =
        Array.isArray(res) ? res :
          Array.isArray(res?.notifications) ? res.notifications :
            Array.isArray(res?.data) ? res.data :
              Array.isArray(res?.data?.notifications) ? res.data.notifications :
                [];

      list = list.map((n, i) => ({
        id: n.id ?? n.uuid ?? `srv_${i}`,
        message: n.data?.message ?? n.message ?? 'Bildirim mesajı bulunamadı',
        created_at: n.created_at ?? n.updated_at ?? n.timestamp ?? new Date().toISOString(),
        read_at: n.read_at ?? null,
        isFrontendNotification: false,
        raw: n,
        type: n.data?.type || n.type || null,
        action: n.data?.action || null,
        task_id: n.data?.task_id || null,
        task_title: n.data?.task_title || null,
        user_id: n.data?.user_id || null,
        user_email: n.data?.user_email || null,
        request_id: n.data?.request_id || null,
      }));

      // okundu bilgisi kullanılmıyor; tüm bildirimleri göster

      list = list.filter(n => {
        const message = n.message || '';
        return !message.includes('Şifreniz admin tarafından sıfırlandı');
      });

      setNotifications(list);

      if (user?.role === 'admin') {
        await loadPasswordResetRequests();
      }
    } catch (err) {
      console.error('Notifications load error:', err);
      if (err.response?.status === 401 ||
        (err.response?.status === 500 && err.response?.data?.error === 'Unauthenticated.')) {
        console.warn('Unauthorized notification access, clearing notifications');
        // Authentication sorunu - notifications'ı temizle ama sayfayı reload etme
      } else if (err.response?.status === 404) {
        console.warn('Notifications endpoint not found');
      } else {
        console.error('Unexpected notification error:', err.message);
      }
      setNotifications([]);
    }
  }
  async function markAllNotificationsAsRead() {
    if (markingAllNotifications) return;
    try {
      setMarkingAllNotifications(true);
      setNotifications(prev => Array.isArray(prev) ? prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })) : prev);
      await Notifications.markAllAsRead();
      await loadNotifications();
    } catch (err) {
      console.error('Mark all notifications error:', err);
      addNotification('Bildirimler okunamadı', 'error');
    } finally {
      setMarkingAllNotifications(false);
    }
  }



  async function doLogin() {
    try {
      setLoading(true);
      setError(null);

      const u = await login(loginForm.email, loginForm.password);
      setUser(u);

      addNotification('Başarıyla giriş yapıldı', 'success');
      const jobs = [loadTasks(), loadNotifications()];
      if (['admin', 'team_leader', 'observer'].includes(u?.role)) {
        jobs.push(loadUsers());
      }
      if (u?.role === 'admin') {
        jobs.push(loadPasswordResetRequests());
      }
      await Promise.all(jobs);
    } catch (err) {
      console.error('Login error:', err);

      if (err.response?.status === 422) {
        setError('Geçersiz kullanıcı bilgileri');
        addNotification('Giriş başarısız: Geçersiz kullanıcı bilgileri', 'error');
      } else if (err.response?.status === 404) {
        setError('API endpoint bulunamadı. Laravel API çalışıyor mu?');
        addNotification('API bağlantı hatası', 'error');
      } else if (err.code === 'ERR_NETWORK') {
        setError('Ağ bağlantısı hatası. Laravel API çalışıyor mu?');
        addNotification('Ağ bağlantısı hatası', 'error');
      } else {
        setError(`Giriş başarısız: ${err.response?.data?.message || err.message}`);
        addNotification('Giriş başarısız', 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  function addNotification(message, type = 'info') {
    const id = `frontend_${Date.now()}`;
    const notification = {
      id,
      message,
      type,
      created_at: new Date().toISOString(),
      timestamp: new Date(),
      read_at: null,
      isFrontendNotification: true
    };
    setNotifications(prev => {
      const currentNotifications = Array.isArray(prev) ? prev : [];
      return [notification, ...currentNotifications.slice(0, 4)];
    });

    setTimeout(() => {
      setNotifications(prev => {
        const currentNotifications = Array.isArray(prev) ? prev : [];
        return currentNotifications.filter(n => n.id !== id);
      });
    }, 5000);
  }

  function handleLogout() {
    localStorage.removeItem('jwt');
    setShowWeeklyOverview(false);
    setWeeklyOverview({ week_start: '', items: [] });
    setWeeklyOverviewError(null);
    setWeeklyOverviewWeekStart('');
    setWeeklyOverviewLoading(false);
    setUser(null);
    setTasks([]);
    setError(null);
    setSelectedTask(null);
  }

  // validateDates fonksiyonu kaldırıldı - tarih validasyonu yapılmıyor

  // Görev ekleme fonksiyonu
  async function handleAddTask() {
    try {
      setAddingTask(true);
      setError(null);

      // Tarih validasyonu kaldırıldı - kullanıcı istediği tarihi girebilir

      const responsibleId = newTask.responsible_id ? parseInt(newTask.responsible_id) : user.id;

      // Eğer sorumlu bir takım lideri ise, ekibini otomatik olarak atananlara ekle
      // Ancak manuel olarak kaldırılan kullanıcıları tekrar ekleme
      let assignedUsers = [...newTask.assigned_users];
      if (responsibleId && users) {
        const responsibleUser = users.find(u => u.id === responsibleId);
        if (responsibleUser && responsibleUser.role === 'team_leader') {
          // Takım liderinin ekibini bul
          const teamMembers = users.filter(u => u.leader_id === responsibleId);
          const teamMemberIds = teamMembers.map(m => m.id);
          // Manuel olarak kaldırılan kullanıcıları filtrele
          const removedUsers = manuallyRemovedUsersRef.current;
          const filteredTeamMemberIds = teamMemberIds.filter(id => !removedUsers.has(id));
          // Ekibi assigned_users'a ekle (duplikasyon olmaması için)
          assignedUsers = [...new Set([...assignedUsers, ...filteredTeamMemberIds])];
        }
      }

      // Renk bilgilerini al
      const taskTypeColor = getTaskTypeColor(newTask.task_type);
      const statusColor = getStatusColor(newTask.status);

      const taskData = {
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        status: newTask.status,
        task_type: newTask.task_type,
        task_type_color: taskTypeColor,
        status_color: statusColor,
        responsible_id: responsibleId,
        assigned_users: assignedUsers,
        start_date: newTask.start_date || null,
        due_date: newTask.due_date || null,
      };



      let response;
      if (newTask.attachments.length > 0) {
        setUploadProgress({ percent: 0, label: 'Dosyalar yükleniyor' });
        const form = new FormData();
        Object.keys(taskData).forEach(key => {
          if (taskData[key] !== null && taskData[key] !== undefined) {
            if (key === 'assigned_users') {
              taskData[key].forEach(userId => form.append('assigned_users[]', userId));
            } else {
              form.append(key, taskData[key]);
            }
          }
        });

        newTask.attachments.forEach(file => {
          form.append('attachments[]', file);
        });

        response = await api.post('/tasks', form, {
          // Content-Type header'ı interceptor tarafından otomatik olarak kaldırılacak
          timeout: 0, // large files: disable per-request timeout
          onUploadProgress: (e) => {
            try {
              const total = e.total || 0;
              const percent = total ? Math.min(100, Math.round((e.loaded * 100) / total)) : null;
              setUploadProgress({ percent, label: 'Dosyalar yükleniyor' });
            } catch (error) {
              console.warn('Upload progress error:', error);
              setUploadProgress({ percent: null, label: 'Dosyalar yükleniyor' });
            }
          }
        });
      } else {
        response = await Tasks.create(taskData);
      }


      let createdTask;
      if (response && response.data) {
        createdTask = response.data.task || response.data;
      } else if (response && response.task) {
        createdTask = response.task;
      } else {
        createdTask = response;
      }


      setTasks(prevTasks => {
        const currentTasks = Array.isArray(prevTasks) ? prevTasks : [];
        return [...currentTasks, createdTask];
      });

      addNotification('Görev başarıyla eklendi', 'success');

      setError(null);

      await loadNotifications();

      resetNewTask();
      setShowAddForm(false);
    } catch (err) {
      console.error('Add task error:', err);
      setError('Görev eklenemedi');
      addNotification('Görev eklenemedi', 'error');
    } finally {
      setUploadProgress(null);
      setAddingTask(false);
    }
  }

  async function handleUpdateTask(taskId, updates) {
    try {
      setLoading(true);
      setError(null);

      // Tarih validasyonu handleDateChange'de yapılıyor, burada tekrar yapmaya gerek yok

      const response = await Tasks.update(taskId, updates);
      const updatedTask = response.task;

      if (!updatedTask) {
        console.error('No task data in update response:', response);
        throw new Error('Görev güncelleme yanıtında görev verisi bulunamadı');
      }

      setTasks(prevTasks => {
        const currentTasks = Array.isArray(prevTasks) ? prevTasks : [];
        return currentTasks.map(task =>
          task.id === taskId ? updatedTask : task
        );
      });

      if (selectedTask && selectedTask.id === taskId) {
        // Tarih güncellemesi için selectedTask'ı güncelle
        const isDateUpdate = Object.keys(updates).some(key =>
          key === 'start_date' || key === 'due_date' || key === 'end_date'
        );

        if (isDateUpdate) {
          // Tarih güncellemesi için sadece ilgili alanı güncelle
          setSelectedTask(prev => ({
            ...prev,
            ...updates
          }));
        } else {
          setSelectedTask(updatedTask);
        }

        try {
          const history = await Tasks.getHistory(taskId);
          setTaskHistory(Array.isArray(history) ? history : []);
        } catch (err) {
          console.error('Task history refresh error:', err);
        }
      }

      try {
        const history = await Tasks.getHistory(taskId);
        setTaskHistories(prev => ({
          ...prev,
          [taskId]: Array.isArray(history) ? history : []
        }));
      } catch (err) {
        console.error('Task histories update error:', err);
        // Geçmiş güncelleme hatası ana işlemi etkilememeli
      }

      addNotification('Görev başarıyla güncellendi', 'success');
      return response;
    } catch (err) {
      console.error('Update task error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);

      const errorMessage = err.response?.data?.message || err.message || 'Görev güncellenemedi';
      setError(errorMessage);
      addNotification(errorMessage, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }


  // Check if user can delete a specific task
  async function canDeleteTask(taskId) {
    try {
      const response = await api.get(`/tasks/${taskId}/can-delete`);
      return response.data;
    } catch (err) {
      console.error('Check delete permission error:', err);
      return { can_delete: false, reason: 'Yetki kontrolü yapılamadı' };
    }
  }

  async function handlePermanentDelete(taskId) {
    // First check if user can delete this task
    const permissionCheck = await canDeleteTask(taskId);

    if (!permissionCheck.can_delete) {
      addNotification(permissionCheck.reason || 'Bu görevi silme yetkiniz yok', 'error');
      return;
    }

    const task = tasks.find(t => t.id === taskId);
    const statusText = task?.status === 'cancelled' ? 'iptal edilen' :
      task?.status === 'completed' ? 'tamamlanan' : 'bu durumdaki';

    if (!window.confirm(`Bu ${statusText} görevi kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve tüm ekleri de silinecektir!`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await Tasks.delete(taskId);

      setTasks(prevTasks => {
        const currentTasks = Array.isArray(prevTasks) ? prevTasks : [];
        return currentTasks.filter(task => task.id !== taskId);
      });

      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(null);
        setShowDetailModal(false);
        setEditingDates({ start_date: '', due_date: '' });
      }

      const message = response.data?.message || 'Görev kalıcı olarak silindi';
      addNotification(message, 'success');

      // Show additional info if some files failed to delete
      if (response.data?.failed_files > 0) {
        addNotification(`${response.data.failed_files} dosya silinemedi, loglara bakın`, 'warning');
      }
    } catch (err) {
      console.error('Permanent delete task error:', err);
      const errorMessage = err.response?.data?.message || 'Görev silinemedi';
      setError(errorMessage);
      addNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }

  // handleStatusChange removed: status is drafted and saved on modal close

  async function handleDateChange(taskId, field, newDate) {
    // Sadece local draft'ı güncelle; kayıt modal kapanınca yapılacak
    setEditingDates(prev => ({
      ...prev,
      [field]: newDate || ''
    }));
  }

  async function handleTaskClick(task) {
    setSelectedTask(task);
    setEditingDates({
      start_date: task.start_date ? task.start_date.slice(0, 10) : '',
      due_date: task.due_date ? task.due_date.slice(0, 10) : ''
    });
    setDetailDraft({
      status: task.status || 'waiting',
      priority: task.priority || 'medium',
      task_type: task.task_type || 'development',
      responsible_id: task.responsible?.id || '',
      assigned_user_ids: (task.assigned_users || []).map(x => (typeof x === 'object' ? x.id : x)),
      no: task.no || '',
    });
    setShowDetailModal(true);

    // Kaydı bağımsız çalıştır: geçmiş başarısız olsa bile görüntüleme/veriler yüklensin
    try { await Tasks.recordView(task.id); } catch (error) { console.warn('Task view record failed:', error); }

    // Geçmişi yükle (başarısız olabilir)
    try {
      const history = await Tasks.getHistory(task.id);
      setTaskHistory(Array.isArray(history) ? history : []);
    } catch (err) {
      console.error('Task history load error:', err);
      if (err?.response?.status === 404) {
        console.warn('Task history not found for task:', task.id);
      } else if (err?.response?.status === 403) {
        console.warn('Access denied to task history for task:', task.id);
      }
      setTaskHistory([]);
      setComments([]);
    }

    // Son görüntülemeleri yükle (her durumda dene)
    try {
      const v = await TaskViews.getLast(task.id);
      setTaskLastViews(Array.isArray(v) ? v : []);
    } catch (err) {
      console.warn('Task last views load error:', err?.message);
      setTaskLastViews([]);
    }
  }

  async function handleCloseModal() {
    try {
      if (selectedTask) {
        const updates = {};
        const isTeamLeader = user?.role === 'team_leader';
        const isAdmin = user?.role === 'admin';
        const isResponsible = user?.id === selectedTask.responsible?.id;

        // Takım lideri sadece bitiş tarihi ve durum değiştirebilir
        if (isTeamLeader && !isAdmin && !isResponsible) {
          // Sadece status ve due_date
          if (detailDraft) {
            if ((detailDraft.status || 'waiting') !== (selectedTask.status || 'waiting')) {
              updates.status = detailDraft.status || 'waiting';
            }
          }
          const curDue = selectedTask.due_date ? selectedTask.due_date.slice(0, 10) : '';
          if ((editingDates.due_date || '') !== curDue) {
            updates.due_date = editingDates.due_date || null;
          }
        } else {
          // Admin, Sorumlu veya diğer roller için tüm alanlar
          // Description (admin only in UI, but backend will validate anyway)
          if ((descDraft ?? '') !== (selectedTask.description ?? '')) {
            updates.description = descDraft ?? '';
          }

          // Drafted selectable fields
          if (detailDraft) {
            // NO alanı sadece Admin veya Sorumlu tarafından değiştirilebilir
            if (isAdmin || isResponsible) {
              if ((detailDraft.no || '') !== (selectedTask.no || '')) {
                updates.no = detailDraft.no || '';
              }
            }
            if ((detailDraft.status || 'waiting') !== (selectedTask.status || 'waiting')) {
              updates.status = detailDraft.status || 'waiting';
            }
            if ((detailDraft.priority || 'medium') !== (selectedTask.priority || 'medium')) {
              updates.priority = detailDraft.priority || 'medium';
            }
            if ((detailDraft.task_type || 'development') !== (selectedTask.task_type || 'development')) {
              updates.task_type = detailDraft.task_type || 'development';
            }
            const currentResponsibleId = selectedTask.responsible?.id || null;
            if ((detailDraft.responsible_id || null) !== currentResponsibleId) {
              updates.responsible_id = detailDraft.responsible_id || null;

              // Eğer sorumlu değiştiyse, önceki liderin ekibini kaldır ve yeni liderin ekibini ekle
              const newResponsibleId = detailDraft.responsible_id || null;
              const beforeIds = (selectedTask.assigned_users || []).map(x => (typeof x === 'object' ? x.id : x));
              let cleanedAssignedUsers = beforeIds;

              // Önceki liderin ekibini kaldır
              if (previousResponsibleIdDetailRef.current && users) {
                const prevResponsibleUser = users.find(u => u.id === previousResponsibleIdDetailRef.current);
                if (prevResponsibleUser && prevResponsibleUser.role === 'team_leader') {
                  const prevTeamMembers = users.filter(u => u.leader_id === previousResponsibleIdDetailRef.current);
                  const prevTeamMemberIds = prevTeamMembers.map(m => m.id);
                  cleanedAssignedUsers = cleanedAssignedUsers.filter(id => !prevTeamMemberIds.includes(id));
                }
              }

              // Yeni lider takım lideriyse, ekibini ekle
              if (newResponsibleId && users) {
                const newResponsibleUser = users.find(u => u.id === newResponsibleId);
                if (newResponsibleUser && newResponsibleUser.role === 'team_leader') {
                  // Takım liderinin ekibini bul
                  const teamMembers = users.filter(u => u.leader_id === newResponsibleId);
                  const teamMemberIds = teamMembers.map(m => m.id);
                  // Ekibi ekle (duplikasyon olmaması için)
                  const combinedIds = [...new Set([...cleanedAssignedUsers, ...teamMemberIds])];
                  updates.assigned_users = combinedIds;
                } else {
                  // Takım lideri değilse, sadece temizlenmiş listeyi kullan
                  updates.assigned_users = cleanedAssignedUsers;
                }
              } else {
                updates.assigned_users = cleanedAssignedUsers;
              }

              // Önceki sorumluyu güncelle
              previousResponsibleIdDetailRef.current = newResponsibleId;
            }

            // Eğer sorumlu değişmediyse, sadece atananları kontrol et
            if (!updates.assigned_users) {
              const beforeIds = (selectedTask.assigned_users || []).map(x => (typeof x === 'object' ? x.id : x));
              const afterIds = Array.isArray(detailDraft.assigned_user_ids) ? detailDraft.assigned_user_ids : beforeIds;
              const sameLength = beforeIds.length === afterIds.length;
              const sameSet = sameLength && beforeIds.every(id => afterIds.includes(id));
              if (!sameSet) {
                updates.assigned_users = afterIds;
              }
            }
          }

          // Dates (from editingDates)
          const curStart = selectedTask.start_date ? selectedTask.start_date.slice(0, 10) : '';
          const curDue = selectedTask.due_date ? selectedTask.due_date.slice(0, 10) : '';
          if ((editingDates.start_date || '') !== curStart) {
            updates.start_date = editingDates.start_date || null;
          }
          if ((editingDates.due_date || '') !== curDue) {
            updates.due_date = editingDates.due_date || null;
          }
        }

        if (Object.keys(updates).length > 0) {
          await handleUpdateTask(selectedTask.id, updates);
          addNotification('Değişiklikler kaydedildi', 'success');
        }
      }
    } catch (error) {
      console.error('Save-on-close error:', error);
      addNotification('Değişiklikler kaydedilemedi', 'error');
    } finally {
      setShowDetailModal(false);
      setSelectedTask(null);
      setNewComment('');
      setHistoryDeleteMode(false);
      setEditingDates({ start_date: '', due_date: '' });
      setDetailDraft(null);
    }
  }



  async function handleAddComment() {
    const text = newComment.trim();
    if (!text || !selectedTask) return;

    try {
      await Tasks.comment(selectedTask.id, text);
      try {
        const h = await Tasks.getHistory(selectedTask.id);
        setTaskHistory(Array.isArray(h) ? h : []);

        setTaskHistories(prev => ({
          ...prev,
          [selectedTask.id]: Array.isArray(h) ? h : []
        }));
      } catch (err) {
        console.warn('Task history operation failed:', err.message);
      }
      setNewComment('');
      addNotification('Yorum eklendi', 'success');
    } catch (e) {
      console.error('Comment error:', e);
      console.error('Error response:', e.response?.data);
      const errorMessage = e.response?.data?.message || 'Yorum eklenemedi';
      addNotification(errorMessage, 'error');
    }
  }




  function getPriorityColor(priority) {
    switch (priority) {
      case 'low': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      case 'critical': return '#dc2626';
      default: return '#6b7280';
    }
  }

  function getPriorityText(priority) {
    switch (priority) {
      case 'low': return 'Düşük';
      case 'medium': return 'Orta';
      case 'high': return 'Yüksek';
      case 'critical': return 'Kritik';
      default: return 'Orta';
    }
  }

  function getTaskTypeText(taskType, task = null) {
    // Eğer task nesnesi varsa ve task_type_text alanı varsa, onu kullan
    if (task && task.task_type_text) {
      return task.task_type_text;
    }

    // Tüm türleri al ve eşleştir
    const allTypes = getAllTaskTypes();
    const foundType = allTypes.find(type =>
      type.value === taskType || type.id === taskType || type.key === taskType
    );
    return foundType ? foundType.label : 'Geliştirme';
  }

  function getTaskTypeColor(taskType, task = null) {
    // Eğer task nesnesi varsa ve task_type_color alanı varsa, onu kullan
    if (task && task.task_type_color) {
      return task.task_type_color;
    }

    // Tüm türleri al ve eşleştir
    const allTypes = getAllTaskTypes();
    const foundType = allTypes.find(type =>
      type.value === taskType || type.id === taskType || type.key === taskType
    );
    return foundType ? foundType.color : '#f59e0b';
  }

  function getStatusText(status, task = null) {
    // Eğer task nesnesi varsa ve status_text alanı varsa, onu kullan
    if (task && task.status_text) {
      return task.status_text;
    }

    // Sistem durumları
    const systemStatuses = [
      { value: 'waiting', label: 'Bekliyor' },
      { value: 'completed', label: 'Tamamlandı' },
      { value: 'cancelled', label: 'İptal' }
    ];

    const foundStatus = systemStatuses.find(s => s.value === status);
    if (foundStatus) return foundStatus.label;

    // Özel durumları kontrol et
    for (const taskType in customTaskStatuses) {
      const customStatus = customTaskStatuses[taskType].find(s =>
        (s.id || s.key || s.value) === status
      );
      if (customStatus) return customStatus.name || customStatus.label;
    }

    return status || 'Bekliyor';
  }

  function getStatusColor(status, task = null) {
    // Eğer task nesnesi varsa ve status_color alanı varsa, onu kullan
    if (task && task.status_color) {
      return task.status_color;
    }

    // Sistem durumları
    const systemStatuses = [
      { value: 'waiting', color: '#6b7280' },
      { value: 'completed', color: '#10b981' },
      { value: 'cancelled', color: '#ef4444' }
    ];

    const foundStatus = systemStatuses.find(s => s.value === status);
    if (foundStatus) {
      return foundStatus.color;
    }

    // Özel durumları kontrol et
    for (const taskType in customTaskStatuses) {
      const customStatus = customTaskStatuses[taskType].find(s =>
        (s.id || s.key || s.value) === status
      );
      if (customStatus) {
        return customStatus.color;
      }
    }

    return '#6b7280';
  }

  const handleAddTaskType = async () => {
    if (!newTaskTypeName.trim()) {
      addNotification('Tür adı boş olamaz', 'error');
      return;
    }

    const trimmedName = newTaskTypeName.trim();

    // Sistem türü isimlerini kontrol et
    const systemNames = getSystemTaskTypeNames();
    if (systemNames.includes(trimmedName)) {
      addNotification('Bu isim sistem türü olarak kullanılıyor, farklı bir isim seçin', 'error');
      return;
    }

    // Mevcut custom türlerde aynı isim var mı kontrol et
    const existingCustomTypes = customTaskTypes.map(type => type.name || type.label);
    if (existingCustomTypes.includes(trimmedName)) {
      addNotification('Bu isimde bir tür zaten mevcut, farklı bir isim seçin', 'error');
      return;
    }

    try {
      const newType = await TaskTypes.create({
        name: trimmedName,
        color: newTaskTypeColor
      });

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
  }; const handleAddTaskStatus = async () => {
    if (!newStatusName.trim()) {
      addNotification('Durum adı boş olamaz', 'error');
      return;
    }

    try {
      // Sistem türü için ID'yi bul (eğer string ise)
      let taskTypeId = selectedTaskTypeForStatuses;

      // Eğer selectedTaskTypeForStatuses string ise (örneğin 'development'), 
      // backend'e string olarak gönder (backend sistem türünü bulup/oluşturacak)
      if (typeof selectedTaskTypeForStatuses === 'string' && selectedTaskTypeForStatuses === 'development') {
        // Backend'e string olarak gönder - backend sistem türünü bulup/oluşturacak
        taskTypeId = 'development';
      } else {
        // Diğer durumlarda integer ID kullan
        taskTypeId = selectedTaskTypeForStatuses;
      }

      const newStatus = await TaskStatuses.create({
        task_type_id: taskTypeId,
        name: newStatusName.trim(),
        color: newStatusColor
      });

      // Backend'den dönen response'taki task_type_id'yi kullan (gerçek integer ID)
      const actualTaskTypeId = newStatus.task_type_id || taskTypeId;

      // Hem integer ID hem de string ID için güncelle (sistem türü için)
      setCustomTaskStatuses(prev => {
        const updated = { ...prev };

        // Integer ID ile güncelle (backend'den dönen gerçek ID)
        if (!updated[actualTaskTypeId]) {
          updated[actualTaskTypeId] = [];
        }
        updated[actualTaskTypeId] = [
          ...updated[actualTaskTypeId],
          {
            id: newStatus.id,
            key: newStatus.id,
            name: newStatus.name,
            label: newStatus.name,
            color: newStatus.color,
            isCustom: true
          }
        ];

        // Sistem türü için string ID ile de güncelle (dropdown ile eşleşmesi için)
        if (selectedTaskTypeForStatuses === 'development') {
          if (!updated['development']) {
            updated['development'] = [];
          }
          // Zaten eklenmiş mi kontrol et
          const exists = updated['development'].some(s => s.id === newStatus.id);
          if (!exists) {
            updated['development'] = [
              ...updated['development'],
              {
                id: newStatus.id,
                key: newStatus.id,
                name: newStatus.name,
                label: newStatus.name,
                color: newStatus.color,
                isCustom: true
              }
            ];
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
  }; const handleDeleteTaskType = async (typeId) => {
    try {
      await TaskTypes.delete(typeId);

      // Task type'ı custom types'dan kaldır
      setCustomTaskTypes(prev => prev.filter(type => (type.id || type.key) !== typeId));

      // O türe ait statuses'ları da customTaskStatuses'dan kaldır
      setCustomTaskStatuses(prev => {
        const updated = { ...prev };
        delete updated[typeId];
        return updated;
      });

      // Eğer silinen tür seçili tür ise, seçimi sıfırla
      if (selectedTaskTypeForStatuses === typeId) {
        setSelectedTaskTypeForStatuses('development'); // Default olarak development'a geç
      }

      addNotification('Tür silindi', 'success');
    } catch (error) {
      console.error('Error deleting task type:', error);
      addNotification('Tür silinemedi', 'error');
    }
  };

  const handleEditTaskType = (taskType) => {
    setEditingTaskTypeId(taskType.id || taskType.value);
    setEditingTaskTypeName(taskType.label || taskType.name);
    setEditingTaskTypeColor(taskType.color);
  };

  const handleSaveTaskType = async () => {
    if (!editingTaskTypeName.trim()) {
      addNotification('Tür adı boş olamaz', 'error');
      return;
    }

    const trimmedName = editingTaskTypeName.trim();

    // Sistem türü isimlerini kontrol et
    const systemNames = getSystemTaskTypeNames();
    if (systemNames.includes(trimmedName)) {
      addNotification('Bu isim sistem türü olarak kullanılıyor, farklı bir isim seçin', 'error');
      return;
    }

    // Mevcut custom türlerde aynı isim var mı kontrol et (kendisi hariç)
    const existingCustomTypes = customTaskTypes
      .filter(type => (type.id || type.key) !== editingTaskTypeId)
      .map(type => type.name || type.label);
    if (existingCustomTypes.includes(trimmedName)) {
      addNotification('Bu isimde bir tür zaten mevcut, farklı bir isim seçin', 'error');
      return;
    }

    try {
      await TaskTypes.update(editingTaskTypeId, {
        name: trimmedName,
        color: editingTaskTypeColor
      });

      const updatedTypes = customTaskTypes.map(type =>
        (type.id || type.key) === editingTaskTypeId
          ? { ...type, name: trimmedName, label: trimmedName, color: editingTaskTypeColor }
          : type
      );

      setCustomTaskTypes(updatedTypes);

      setEditingTaskTypeId(null);
      setEditingTaskTypeName('');
      setEditingTaskTypeColor('');
      addNotification('Tür güncellendi', 'success');
    } catch (error) {
      console.error('Error updating task type:', error);
      addNotification('Tür güncellenemedi', 'error');
    }
  };

  const handleCancelEditTaskType = () => {
    setEditingTaskTypeId(null);
    setEditingTaskTypeName('');
    setEditingTaskTypeColor('');
  };

  const handleDeleteTaskStatus = async (statusId) => {
    try {
      await TaskStatuses.delete(statusId);
      setCustomTaskStatuses(prev => ({
        ...prev,
        [selectedTaskTypeForStatuses]: prev[selectedTaskTypeForStatuses]?.filter(status => (status.id || status.key) !== statusId) || []
      }));
      addNotification('Durum silindi', 'success');
    } catch (error) {
      console.error('Error deleting task status:', error);
      addNotification('Durum silinemedi', 'error');
    }
  };

  const handleEditTaskStatus = (status) => {
    setEditingTaskStatusId(status.id || status.key);
    setEditingTaskStatusName(status.name || status.label);
    setEditingTaskStatusColor(status.color);
  };

  const handleSaveTaskStatus = async () => {
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
  };

  const handleCancelEditTaskStatus = () => {
    setEditingTaskStatusId(null);
    setEditingTaskStatusName('');
    setEditingTaskStatusColor('');
  };

  const getSystemTaskTypeNames = () => {
    return ['Geliştirme']; // Sistem türü isimleri
  };

  // Duplicate türleri temizle

  const getAllTaskTypes = () => {
    // Sadece Geliştirme türü sabit kalacak
    const systemTypes = [
      {
        id: 'development',
        value: 'development',
        label: 'Geliştirme',
        color: '#f59e0b',
        isCustom: false,
        isPermanent: true
      }
    ];

    // Özel türleri ID bazlı formata çevir
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
  };

  const getAllTaskStatuses = (taskType) => {
    // Sadece özel durumlar (türe göre) - ID bazlı sistem
    const customStatuses = (customTaskStatuses[taskType] || []).map((status, index) => ({
      id: status.id || `custom_status_${index}`,
      value: String(status.id || status.key || status.value || `custom_status_${index}`),
      label: status.name || status.label,
      color: status.color || '#6b7280',
      isSystem: false
    }));

    return customStatuses;
  };

  const getSystemTaskStatuses = () => {
    return [
      { id: 'waiting', value: 'waiting', label: 'Bekliyor', color: '#6b7280', isSystem: true },
      { id: 'completed', value: 'completed', label: 'Tamamlandı', color: '#10b981', isSystem: true },
      { id: 'cancelled', value: 'cancelled', label: 'İptal', color: '#ef4444', isSystem: true }
    ];
  };


  const loadTaskSettings = async () => {
    try {
      const [taskTypes, taskStatuses] = await Promise.all([
        TaskTypes.list(),
        TaskStatuses.list()
      ]);

      // Tüm task types'ı (sistem + custom) kaydet
      setAllTaskTypesFromAPI(taskTypes);

      // Task types'ı formatla
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

      // Task statuses'ı formatla
      const statusesByType = {};
      taskStatuses.forEach(status => {
        const taskTypeId = status.task_type_id;

        // Integer ID ile kaydet
        if (!statusesByType[taskTypeId]) {
          statusesByType[taskTypeId] = [];
        }
        statusesByType[taskTypeId].push({
          id: status.id,
          key: status.id,
          name: status.name,
          label: status.name,
          color: status.color,
          isCustom: !status.is_system
        });

        // Sistem türü için string ID ile de kaydet (dropdown ile eşleşmesi için)
        const taskType = taskTypes.find(t => t.id === taskTypeId && t.is_system);
        if (taskType && taskType.name === 'Geliştirme') {
          const stringKey = 'development';
          if (!statusesByType[stringKey]) {
            statusesByType[stringKey] = [];
          }
          statusesByType[stringKey].push({
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
      // Fallback to localStorage if API fails
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
  };

  // localStorage otomatik kaydetme kaldırıldı - artık API kullanıyoruz

  function formatDate(dateLike) {
    if (!dateLike) return '-';
    const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
    if (Number.isNaN(d.getTime())) return '-';
    try {
      const opts = { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
      return new Intl.DateTimeFormat('tr-TR', opts).format(d);
    } catch {
      const pad = (n) => n.toString().padStart(2, '0');
      return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
  }

  function formatDateOnly(dateLike) {
    if (!dateLike) return '-';
    const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
    if (Number.isNaN(d.getTime())) return '-';
    try {
      const opts = { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' };
      return new Intl.DateTimeFormat('tr-TR', opts).format(d);
    } catch {
      const pad = (n) => n.toString().padStart(2, '0');
      return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
    }
  }

  function getLastAddedDescription(taskHistory) {
    if (!Array.isArray(taskHistory) || taskHistory.length === 0) {
      return 'Henüz açıklama eklenmemiş';
    }

    const comments = taskHistory.filter(h => h.field === 'comment' && h.new_value && h.new_value.trim().length > 0);

    if (comments.length > 0) {
      const sortedComments = comments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return sortedComments[0].new_value;
    }

    return 'Henüz açıklama eklenmemiş';
  }

  async function loadTaskHistoryForTooltip(taskId) {
    if (taskHistories[taskId]) {
      return;
    }

    try {
      const history = await Tasks.getHistory(taskId);

      setTaskHistories(prev => ({
        ...prev,
        [taskId]: Array.isArray(history) ? history : []
      }));
    } catch (err) {
      console.warn('Failed to load task history for tooltip:', err);
      setTaskHistories(prev => ({
        ...prev,
        [taskId]: []
      }));
    }
  }


  function lowerSafe(v) {
    return (v ?? '').toString().toLowerCase();
  }

  function resolveUserName(userId) {
    if (userId === null || userId === undefined || userId === '') return '-';
    const idNum = typeof userId === 'string' ? parseInt(userId) : userId;
    const u = Array.isArray(users) ? users.find(x => x.id === idNum) : null;
    return u?.name ?? String(userId);
  }

  function renderHistoryValue(field, value) {
    if (field === 'status') {
      // Status için özel kontrol - custom statuses'ları doğru bul
      const systemStatuses = [
        { value: 'waiting', label: 'Bekliyor' },
        { value: 'completed', label: 'Tamamlandı' },
        { value: 'cancelled', label: 'İptal' }
      ];

      const foundStatus = systemStatuses.find(s => s.value === value);
      if (foundStatus) {
        return foundStatus.label;
      }

      // Özel durumları kontrol et - tüm task types'larda ara
      for (const taskType in customTaskStatuses) {
        const customStatus = customTaskStatuses[taskType].find(s =>
          (s.id || s.key || s.value) == value || s.id == value || s.key == value
        );
        if (customStatus) {
          return customStatus.name || customStatus.label;
        }
      }

      // Eğer hala bulunamadıysa, value'yu string olarak döndür
      return value || 'Bekliyor';
    }
    if (field === 'priority') return getPriorityText(value);
    if (field === 'task_type') {
      // Task type için özel kontrol - custom types'ları doğru bul
      const systemTypes = [
        { value: 'development', label: 'Geliştirme' }
      ];

      const foundType = systemTypes.find(t => t.value === value);
      if (foundType) {
        return foundType.label;
      }

      // Özel türleri kontrol et - daha kapsamlı arama
      const allTypes = getAllTaskTypes();
      const customType = allTypes.find(t =>
        (t.id || t.key || t.value) == value || t.id == value || t.key == value
      );
      if (customType) {
        return customType.label || customType.name;
      }

      // Eğer hala bulunamadıysa, value'yu string olarak döndür
      return value || 'Geliştirme';
    }
    if (field === 'comment') return value ?? '';
    if (field === 'responsible_id' || field === 'created_by') return resolveUserName(value);
    if (field === 'start_date' || field === 'due_date' || field === 'end_date') return formatDateOnly(value);
    if (field === 'assigned_users') {
      try {
        const userIds = typeof value === 'string' ? JSON.parse(value) : value;
        if (Array.isArray(userIds)) {
          return userIds.map(id => resolveUserName(id)).join(', ');
        }
      } catch (e) {
        console.error('Error parsing assigned_users:', e);
      }
      return value ?? 'boş';
    }
    return value ?? 'boş';
  }

  function renderFieldLabel(field) {
    switch (field) {
      case 'title':
        return 'başlığı';
      case 'description':
        return 'açıklamayı';
      case 'status':
        return 'durumu';
      case 'priority':
        return 'önceliği';
      case 'task_type':
        return 'görev türünü';
      case 'responsible_id':
        return 'sorumluyu';
      case 'created_by':
        return 'oluşturanı';
      case 'start_date':
        return 'başlangıç tarihini';
      case 'due_date':
        return 'bitiş tarihini';
      case 'end_date':
        return 'bitiş tarihini';
      case 'assigned_users':
        return 'atanan kullanıcıları';
      case 'attachments':
        return 'dosyaları';
      case 'comment':
        return 'yorumu';
      case 'task_response':
        return 'görev yanıtını';
      case 'task_type_color':
      case 'status_color':
        return null; // Renk değişikliklerini gizle
      default:
        return field;
    }
  }

  function getRoleText(role) {
    switch (role) {
      case 'admin':
        return 'Yönetici';
      case 'team_leader':
        return 'Takım Lideri';
      case 'team_member':
        return 'Takım Üyesi';
      case 'observer':
        return 'Gözlemci';
      default:
        return String(role || '-');
    }
  }

  function getEligibleResponsibleUsers() {
    if (!users || !user) return [];

    return users.filter(u => {
      if (u.role === 'observer') return false;
      return true;
    });
  }

  function getEligibleAssignedUsers(responsibleId = null) {
    if (!users || !user) return [];

    return users.filter(u => {
      if (u.role === 'observer') return false;
      if (responsibleId && u.id === parseInt(responsibleId)) return false;
      return true;
    });
  }

  function parseExcelUsers(file) {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          // Only .xlsx reliably supported by exceljs
          const ext = (file.name || '').split('.').pop()?.toLowerCase();
          if (ext === 'xls') {
            throw new Error('Eski .xls formatı desteklenmiyor. Lütfen .xlsx yükleyin.');
          }

          const buffer = await file.arrayBuffer();
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);

          const worksheet = workbook.worksheets[0];
          if (!worksheet) {
            throw new Error('Excel dosyasında çalışma sayfası bulunamadı');
          }

          const jsonRows = [];
          worksheet.eachRow((row) => {
            const rowData = [];
            row.eachCell((cell, colNumber) => {
              let v = cell.value;
              if (v && typeof v === 'object' && 'text' in v) v = v.text; // handle rich text
              rowData[colNumber - 1] = v;
            });
            jsonRows.push(rowData);
          });

          // Accept at least Name + Email; Role and Password optional
          const userRows = jsonRows.slice(1).filter(row => (row?.[0] && row?.[1]));

          const validRoles = ['admin', 'team_leader', 'team_member', 'observer'];
          const users = userRows.map((row, index) => {
            const name = row[0];
            const email = row[1];
            const role = row[2];
            const password = row[3];
            const leaderEmail = row[4]; // E2: Takım Lideri E-posta

            const roleStr = (role ?? '').toString().trim().toLowerCase();
            const validatedRole = validRoles.includes(roleStr) ? roleStr : 'team_member';

            return {
              name: (name ?? '').toString().trim(),
              email: (email ?? '').toString().trim(),
              role: validatedRole,
              password: (password ?? '').toString().trim() || '123456',
              leaderEmail: (leaderEmail ?? '').toString().trim(),
              rowIndex: index + 2,
            };
          }).filter(u => u.name && u.email);

          resolve(users);
        } catch (err) {
          reject(new Error('Excel dosyası okunamadı: ' + (err?.message || String(err))));
        }
      })();
    });
  }

  async function handleBulkUserImport(file) {
    try {
      setLoading(true);
      const users = await parseExcelUsers(file);

      if (users.length === 0) {
        addNotification('Excel dosyasında geçerli kullanıcı verisi bulunamadı', 'error');
        return;
      }

      // Mevcut kullanıcıları al
      const existingUsers = await getUsers();

      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      const processedUsers = new Map(); // Email -> user ID mapping

      // Önce takım liderlerini ve adminleri ekle
      const leadersAndAdmins = users.filter(u => u.role === 'team_leader' || u.role === 'admin');
      const members = users.filter(u => u.role !== 'team_leader' && u.role !== 'admin');

      // 1. Adım: Takım liderlerini ve adminleri ekle
      for (const userData of leadersAndAdmins) {
        try {
          const result = await registerUser({
            name: userData.name,
            email: userData.email,
            password: userData.password,
            password_confirmation: userData.password,
            role: userData.role,
            leader_id: null // Liderler ve adminlerin lideri olmaz
          });

          // Yeni eklenen kullanıcının ID'sini kaydet
          if (result && result.user && result.user.id) {
            processedUsers.set(userData.email.toLowerCase(), result.user.id);
          }
          successCount++;
        } catch (error) {
          errorCount++;
          errors.push(`Satır ${userData.rowIndex}: ${userData.name} - ${error.response?.data?.message || 'Bilinmeyen hata'}`);
        }
      }

      // 2. Adım: Diğer kullanıcıları ekle
      for (const userData of members) {
        try {
          let leaderId = null;

          if (userData.leaderEmail) {
            const leaderEmail = userData.leaderEmail.toLowerCase();

            // Önce yeni eklenen liderlerden ara
            if (processedUsers.has(leaderEmail)) {
              leaderId = processedUsers.get(leaderEmail);
            } else {
              // Mevcut kullanıcılardan ara
              const existingLeader = existingUsers.find(u =>
                u.email.toLowerCase() === leaderEmail &&
                (u.role === 'team_leader' || u.role === 'admin')
              );
              if (existingLeader) {
                leaderId = existingLeader.id;
              } else {
                errors.push(`Satır ${userData.rowIndex}: Takım lideri bulunamadı "${userData.leaderEmail}"`);
                errorCount++;
                continue;
              }
            }
          }

          const result = await registerUser({
            name: userData.name,
            email: userData.email,
            password: userData.password,
            password_confirmation: userData.password,
            role: userData.role,
            leader_id: leaderId
          });

          // Yeni eklenen kullanıcının ID'sini kaydet
          if (result && result.user && result.user.id) {
            processedUsers.set(userData.email.toLowerCase(), result.user.id);
          }
          successCount++;
        } catch (error) {
          errorCount++;
          errors.push(`Satır ${userData.rowIndex}: ${userData.name} - ${error.response?.data?.message || 'Bilinmeyen hata'}`);
        }
      }

      if (successCount > 0) {
        addNotification(`${successCount} kullanıcı başarıyla eklendi`, 'success');
      }
      if (errorCount > 0) {
        addNotification(`${errorCount} kullanıcı eklenemedi. Detaylar konsola bakın.`, 'error');
        console.error('Toplu kullanıcı ekleme hataları:', errors);
      }

      await loadUsers();

    } catch (error) {
      console.error('Excel import error:', error);
      addNotification('Excel dosyası işlenemedi: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function PasswordChangeInline({ onDone }) {
    const [form, setForm] = useState({ current: '', next: '', again: '' });
    const can = form.current && form.next && form.again && form.next === form.again;

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!can) return;
      try {
        await changePassword(form.current, form.next);
        onDone?.();
        setForm({ current: '', next: '', again: '' });
      } catch (err) {
        console.error('Password change error:', err);
        addNotification('Şifre güncellenemedi', 'error');
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-3">
        <input type="text" name="username" autoComplete="username" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }} tabIndex="-1" aria-hidden="true" />
        <input type="password" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 !text-[32px] text-white placeholder-gray-400" style={{ marginTop: '5px' }} placeholder="Mevcut şifre" value={form.current} onChange={e => setForm({ ...form, current: e.target.value })} autoComplete="current-password" autoCorrect="off" autoCapitalize="off" spellCheck="false" data-lpignore="true" name="current-password" />
        <input type="password" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 !text-[32px] text-white placeholder-gray-400" style={{ marginTop: '5px' }} placeholder="Yeni şifre" value={form.next} onChange={e => setForm({ ...form, next: e.target.value })} autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck="false" data-lpignore="true" name="new-password" />
        <input type="password" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 !text-[32px] text-white placeholder-gray-400" style={{ marginTop: '5px' }} placeholder="Yeni şifre (tekrar)" value={form.again} onChange={e => setForm({ ...form, again: e.target.value })} autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck="false" data-lpignore="true" name="confirm-password" />
        <button type="submit" disabled={!can} className="w-full rounded-lg px-4 py-3 bg-green-600 hover:bg-green-700 !text-[20px]" style={{ marginTop: '10px', marginLeft: '5px', marginBottom: '10px' }}>Güncelle</button>
      </form>
    );
  }

  function PasswordChangeForm({ onDone, currentTheme }) {
    const [form, setForm] = useState({ current: '', next: '', again: '' });
    const [loading, setLoading] = useState(false);
    const can = form.current && form.next && form.again && form.next === form.again;

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!can || loading) return;
      try {
        setLoading(true);
        await changePassword(form.current, form.next);
        onDone?.();
        setForm({ current: '', next: '', again: '' });
        addNotification('Şifre başarıyla güncellendi', 'success');
      } catch (err) {
        console.error('Password change error:', err);
        addNotification(err.response?.data?.message || 'Şifre güncellenemedi', 'error');
      } finally {
        setLoading(false);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-10" style={{ padding: '18px', paddingBottom: '32px' }}>
        {/* Hidden username field for accessibility */}
        <input
          type="text"
          name="username"
          autoComplete="username"
          style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
          tabIndex="-1"
          aria-hidden="true"
        />
        <div className="space-y-6">
          <input
            type="password"
            className="w-full rounded-lg focus:outline-none transition-all px-6 py-4"
            placeholder="Mevcut şifrenizi girin"
            value={form.current}
            onChange={e => setForm({ ...form, current: e.target.value })}
            autoComplete="current-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-lpignore="true"
            data-form-type="password"
            name="current-password"
            style={{
              height: '40px',
              fontSize: '16px',
              backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
              color: currentTheme.text,
              borderColor: currentTheme.border,
              borderWidth: '1px',
              borderStyle: 'solid'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = currentTheme.accent;
              e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = currentTheme.border;
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        <div className="space-y-6">
          <input
            type="password"
            className="w-full rounded-2xl focus:outline-none transition-all px-6 py-4"
            placeholder="Yeni şifrenizi girin"
            value={form.next}
            onChange={e => setForm({ ...form, next: e.target.value })}
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-lpignore="true"
            data-form-type="password"
            name="new-password"
            style={{
              height: '40px',
              fontSize: '16px',
              backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
              color: currentTheme.text,
              borderColor: currentTheme.border,
              borderWidth: '1px',
              borderStyle: 'solid'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = currentTheme.accent;
              e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = currentTheme.border;
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        <div className="space-y-6">
          <input
            type="password"
            className="w-full rounded-2xl focus:outline-none transition-all px-6 py-4"
            placeholder="Yeni şifrenizi tekrar girin"
            value={form.again}
            onChange={e => setForm({ ...form, again: e.target.value })}
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-lpignore="true"
            data-form-type="password"
            name="confirm-password"
            style={{
              height: '40px',
              fontSize: '16px',
              backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
              color: currentTheme.text,
              borderColor: currentTheme.border,
              borderWidth: '1px',
              borderStyle: 'solid'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = currentTheme.accent;
              e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = currentTheme.border;
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        <div className="pt-8" style={{ paddingTop: '10px' }}>
          <button
            type="submit"
            disabled={!can || loading}
            className="w-full rounded-2xl transition-all shadow-lg hover:shadow-xl px-8 py-4 font-semibold"
            style={{
              height: '48px',
              backgroundColor: (!can || loading) ? `${currentTheme.border}60` : currentTheme.accent,
              color: '#ffffff'
            }}
            onMouseEnter={(e) => {
              if (!(!can || loading)) {
                const hex = currentTheme.accent.replace('#', '');
                const r = parseInt(hex.substr(0, 2), 16);
                const g = parseInt(hex.substr(2, 2), 16);
                const b = parseInt(hex.substr(4, 2), 16);
                e.target.style.backgroundColor = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
              }
            }}
            onMouseLeave={(e) => {
              if (!(!can || loading)) {
                e.target.style.backgroundColor = currentTheme.accent;
              }
            }}
          >
            {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
          </button>
        </div>
      </form>
    );
  }

  function AdminCreateUser() {
    const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '', role: 'team_member', leader_id: null });

    return (
      <div className="space-y-6">
        <div className="border-b pb-4" style={{ paddingBottom: '30px', borderColor: currentTheme.border }}>
          <div className="space-y-4">

            <input
              className="w-full rounded px-3 py-3 !text-[24px] focus:outline-none"
              placeholder="İsim"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              style={{
                marginBottom: '10px',
                backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                color: currentTheme.text,
                borderColor: currentTheme.border,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = currentTheme.accent;
                e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = currentTheme.border;
                e.target.style.boxShadow = 'none';
              }}
            />

            <input
              type="email"
              className="w-full rounded px-3 py-3 !text-[24px] focus:outline-none"
              placeholder="E-posta"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              style={{
                marginBottom: '10px',
                backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                color: currentTheme.text,
                borderColor: currentTheme.border,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = currentTheme.accent;
                e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = currentTheme.border;
                e.target.style.boxShadow = 'none';
              }}
            />

            <input
              type="password"
              className="w-full rounded px-3 py-3 !text-[24px] focus:outline-none"
              placeholder="Şifre"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              style={{
                marginBottom: '10px',
                backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                color: currentTheme.text,
                borderColor: currentTheme.border,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = currentTheme.accent;
                e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = currentTheme.border;
                e.target.style.boxShadow = 'none';
              }}
            />

            <input
              type="password"
              className="w-full rounded px-3 py-3 !text-[24px] focus:outline-none"
              placeholder="Şifre (tekrar)"
              value={form.password_confirmation}
              onChange={e => setForm({ ...form, password_confirmation: e.target.value })}
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              style={{
                marginBottom: '10px',
                backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                color: currentTheme.text,
                borderColor: currentTheme.border,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = currentTheme.accent;
                e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = currentTheme.border;
                e.target.style.boxShadow = 'none';
              }}
            />

            <select
              className="w-[101%] h-[35px] rounded px-3 py-3 !text-[24px] focus:outline-none"
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}
              style={{
                marginBottom: '10px',
                backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                color: currentTheme.text,
                borderColor: currentTheme.border,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = currentTheme.accent;
                e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = currentTheme.border;
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="admin">Yönetici</option>
              <option value="team_leader">Takım Lideri</option>
              <option value="team_member">Takım Üyesi</option>
              <option value="observer">Gözlemci</option>
            </select>

            {/* Opsiyonel ekip lideri seçimi */}
            <select
              className="w-[101%] h-[35px] rounded px-3 py-3 !text-[24px] focus:outline-none"
              value={form.leader_id ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                setForm({ ...form, leader_id: v === '' ? null : Number(v) });
              }}
              style={{
                marginBottom: '10px',
                backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                color: currentTheme.text,
                borderColor: currentTheme.border,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = currentTheme.accent;
                e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = currentTheme.border;
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="">Takım Lideri (opsiyonel)</option>
              {(users || [])
                .filter(u => u.role === 'team_leader' || u.role === 'admin')
                .map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email} {u.role === 'admin' ? '(Yönetici)' : '(Takım Lideri)'}
                  </option>
                ))}
            </select>

            <button
              className="w-[101%] rounded px-4 py-3 !text-[20px] transition-colors"
              style={{
                marginBottom: '10px',
                backgroundColor: currentTheme.accent,
                color: '#ffffff'
              }}
              onMouseEnter={(e) => {
                const hex = currentTheme.accent.replace('#', '');
                const r = parseInt(hex.substr(0, 2), 16);
                const g = parseInt(hex.substr(2, 2), 16);
                const b = parseInt(hex.substr(4, 2), 16);
                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                e.target.style.backgroundColor = brightness > 128
                  ? `rgba(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)}, 1)`
                  : `rgba(${Math.min(255, r + 20)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 20)}, 1)`;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = currentTheme.accent;
              }}
              onClick={async () => {
                if (!form.name.trim() || !form.email.trim() || !form.password || !form.password_confirmation) {
                  addNotification('Lütfen tüm alanları doldurun', 'error');
                  return;
                }
                if (form.password !== form.password_confirmation) {
                  addNotification('Şifreler eşleşmiyor', 'error');
                  return;
                }
                try {
                  // Eğer rol admin veya takım lideri ise leader_id'yi null'a sabitle (opsiyonel alan sadece üye için anlamlı)
                  const payload = {
                    ...form,
                    leader_id: (form.role === 'team_member') ? (form.leader_id ?? null) : null,
                  };
                  await registerUser(payload);
                  addNotification('Kullanıcı eklendi', 'success');
                  setForm({ name: '', email: '', password: '', password_confirmation: '', role: 'team_member', leader_id: null });
                  await loadUsers();
                } catch (err) {
                  console.error('User registration error:', err);
                  addNotification(err.response?.data?.message || 'Kullanıcı eklenemedi', 'error');
                }
              }}
            >
              Kullanıcı Ekle
            </button>

          </div>
        </div>

        <div className="pb-4" style={{ borderColor: currentTheme.border }}>
          <h2 className="mb-4" style={{ color: currentTheme.text }}>Excel'den Toplu Kullanıcı Ekle</h2>
          <div className="space-y-4 !text-[16px]">
            <div className="rounded-lg p-4" style={{ backgroundColor: currentTheme.accent + '20', borderColor: currentTheme.accent, borderWidth: '1px', borderStyle: 'solid' }}>
              <div className="space-y-1" style={{ color: currentTheme.text }}>
                <div className="mt-3" style={{ color: currentTheme.accent }}>
                  İlk satır başlık olarak kabul edilir, veriler 2. satırdan başlar.
                </div>
                <div>• A2: Kullanıcı Adı Soyadı</div>
                <div>• B2: E-posta Adresi</div>
                <div>• C2: Rol (admin/team_leader/team_member/observer)</div>
                <div>• D2: Şifre (boşsa varsayılan: 123456)</div>
                <div>• E2: Takım Lideri E-posta (opsiyonel)</div>
              </div>
            </div>
            <div className="!text-[24px]" style={{ marginTop: '10px', color: currentTheme.textSecondary || currentTheme.text }}>
              Excel dosyası seçin (.xlsx önerilir)
            </div>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  handleBulkUserImport(file);
                  e.target.value = '';
                }
              }}
              className="!text-[18px] file:w-[30%] file:h-[30px] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-medium file:cursor-pointer file:transition-colors"
              style={{
                color: currentTheme.text
              }}
            />
            <style>{`
              input[type="file"]::file-selector-button {
                background-color: ${currentTheme.accent} !important;
                color: #ffffff !important;
              }
              input[type="file"]::file-selector-button:hover {
                background-color: ${currentTheme.accent}dd !important;
              }
            `}</style>
          </div>
        </div>
      </div>
    );
  }

  const filteredTasks = useMemo(() => {
    if (!Array.isArray(tasks)) return [];

    const query = lowerSafe(searchTerm);
    const filtered = tasks.filter(task => {
      if (activeTab === 'active' && (task.status === 'completed' || task.status === 'cancelled')) {
        return false;
      }
      if (activeTab === 'completed' && task.status !== 'completed') {
        return false;
      }
      if (activeTab === 'deleted' && task.status !== 'cancelled') {
        return false;
      }
      if (selectedTaskType !== 'all' && task.task_type !== selectedTaskType) {
        return false;
      }
      if (!query) return true;
      const title = lowerSafe(task?.title);
      const desc = lowerSafe(task?.description);
      return title.includes(query) || desc.includes(query);
    });

    if (!sortConfig?.key) {
      return filtered;
    }

    const key = sortConfig.key;
    const dir = sortConfig.dir === 'asc' ? 1 : -1;

    return [...filtered].sort((a, b) => {
      let av = a?.[key];
      let bv = b?.[key];
      if (key === 'id') {
        const at = Number(a?.id) || 0;
        const bt = Number(b?.id) || 0;
        if (at === bt) return 0;
        return at > bt ? dir : -dir;
      }
      if (key === 'start_date' || key === 'due_date' || key === 'end_date') {
        const at = av ? new Date(av).getTime() : 0;
        const bt = bv ? new Date(bv).getTime() : 0;
        if (at === bt) return 0;
        return at > bt ? dir : -dir;
      }
      if (key === 'priority') {
        const map = { low: 1, medium: 2, high: 3, critical: 4 };
        const at = map[a?.priority] ?? 0;
        const bt = map[b?.priority] ?? 0;
        if (at === bt) return 0;
        return at > bt ? dir : -dir;
      }
      if (key === 'status') {
        const order = { waiting: 1, completed: 2, cancelled: 3 };
        const at = order[a?.status] ?? 0;
        const bt = order[b?.status] ?? 0;
        if (at === bt) return 0;
        return at > bt ? dir : -dir;
      }
      if (key === 'responsible_name') {
        av = a?.responsible?.name || '';
        bv = b?.responsible?.name || '';
      } else if (key === 'creator_name') {
        av = a?.creator?.name || '';
        bv = b?.creator?.name || '';
      } else if (key === 'assigned_count') {
        const at = Array.isArray(a?.assigned_users) ? a.assigned_users.length : 0;
        const bt = Array.isArray(b?.assigned_users) ? b.assigned_users.length : 0;
        if (at === bt) return 0;
        return at > bt ? dir : -dir;
      } else if (key === 'attachments_count') {
        const at = Array.isArray(a?.attachments) ? a.attachments.length : 0;
        const bt = Array.isArray(b?.attachments) ? b.attachments.length : 0;
        if (at === bt) return 0;
        return at > bt ? dir : -dir;
      }
      av = (av ?? '').toString();
      bv = (bv ?? '').toString();
      return av.localeCompare(bv) * dir;
    });
  }, [tasks, activeTab, selectedTaskType, searchTerm, sortConfig]);

  const [weeklyOverviewSort, setWeeklyOverviewSort] = useState({ key: null, dir: 'asc' });


  const defaultWeekStart = fmtYMD(getMonday());
  const effectiveWeeklyOverviewWeekStart = weeklyOverviewWeekStart || weeklyOverview.week_start || defaultWeekStart;

  const sortedWeeklyOverview = useMemo(() => {
    const items = Array.isArray(weeklyOverview.items) ? [...weeklyOverview.items] : [];
    const { key, dir } = weeklyOverviewSort;
    if (!key) return items;

    const direction = dir === 'desc' ? -1 : 1;
    return items.sort((a, b) => {
      let av = a?.[key];
      let bv = b?.[key];

      const numericKeys = new Set(['total_target_minutes', 'total_actual_minutes', 'unplanned_minutes', 'planned_score', 'unplanned_bonus', 'final_score']);

      if (numericKeys.has(key)) {
        const numA = Number(av || 0);
        const numB = Number(bv || 0);
        if (numA === numB) return 0;
        return numA > numB ? direction : -direction;
      }

      av = (av ?? '').toString().toLowerCase();
      bv = (bv ?? '').toString().toLowerCase();
      if (av === bv) return 0;
      return av > bv ? direction : -direction;
    });
  }, [weeklyOverview.items, weeklyOverviewSort]);

  function toggleWeeklyOverviewSort(key) {
    setWeeklyOverviewSort(prev => {
      if (prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      if (prev.dir === 'desc') return { key: null, dir: 'asc' };
      return { key, dir: 'asc' };
    });
  }

  function toggleSort(key) {
    setSortConfig(prev => {
      if (prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      if (prev.dir === 'desc') return { key: null, dir: 'desc' };
      return { key, dir: 'asc' };
    });
  }

  if (!user && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 z-[999800]" style={{ backgroundColor: currentTheme.background }}>
        <div className="rounded-3xl p-8 shadow-2xl w-full max-w-md" style={{
          minWidth: '400px',
          maxWidth: '400px',
          backgroundColor: 'transparent',
        }}>
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <img src={currentLogo || logo} alt="Logo" className="w-16 h-16" onError={(e) => { e.target.src = logo; }} />
            </div>
            <h2 className="text-4xl font-bold tracking-wider" style={{ color: currentTheme.text }}>Görev Takip Sistemi</h2>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-2xl mb-6" style={{
              backgroundColor: `${currentTheme.accent}20`,
              borderColor: currentTheme.accent,
              borderWidth: '1px',
              borderStyle: 'solid',
              color: currentTheme.text
            }}>
              {error}
            </div>
          )}
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (showForgotPassword) {
              try {
                setLoading(true);
                await PasswordReset.requestReset(loginForm.email);
                setError(null);
                setShowForgotPassword(false);
                addNotification('Şifre sıfırlama talebi admin\'lere gönderildi', 'success');
              } catch (err) {
                console.error('Forgot password error:', err);
                setError(err.response?.data?.message || 'Bir hata oluştu');
              } finally {
                setLoading(false);
              }
            } else {
              doLogin();
            }
          }} className="space-y-6">
            <div>
              <label className="block text-[24px] font-medium mb-3 items-left flex" style={{ color: currentTheme.text }}>
                E-mail
              </label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className="w-full border-0 rounded-2xl px-4 py-4 focus:outline-none focus:ring-0 text-base text-[24px]"
                placeholder="Mail Adresinizi Giriniz"
                required
                style={{
                  height: '40px',
                  backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                  color: currentTheme.text,
                  borderColor: currentTheme.border,
                  borderWidth: '1px',
                  borderStyle: 'solid'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = currentTheme.accent;
                  e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = currentTheme.border;
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            <br />
            {!showForgotPassword && (
              <div>
                <label className="block text-[24px] font-medium mb-3 items-left flex" style={{ color: currentTheme.text }}>
                  Şifre
                </label>
                <div className="w-full relative">
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full border-0 rounded-2xl px-4 py-4 pr-12 focus:outline-none focus:ring-0 text-base text-[24px]"
                    placeholder="Şifrenizi Giriniz"
                    required
                    autoComplete="current-password"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    style={{
                      height: '40px',
                      backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                      color: currentTheme.text,
                      borderColor: currentTheme.border,
                      borderWidth: '1px',
                      borderStyle: 'solid'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = currentTheme.accent;
                      e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = currentTheme.border;
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                <br />
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full font-semibold py-4 px-6 rounded-2xl transition-all duration-200 text-lg shadow-lg hover:shadow-xl"
              style={{
                backgroundColor: loading ? `${currentTheme.border}60` : currentTheme.accent,
                color: '#ffffff',
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  const hex = currentTheme.accent.replace('#', '');
                  const r = parseInt(hex.substr(0, 2), 16);
                  const g = parseInt(hex.substr(2, 2), 16);
                  const b = parseInt(hex.substr(4, 2), 16);
                  e.target.style.backgroundColor = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = currentTheme.accent;
                }
              }}
            >
              {loading
                ? (showForgotPassword ? 'Talep Gönderiliyor...' : 'Giriş yapılıyor...')
                : (showForgotPassword ? 'Talep Gönder' : 'Giriş Yap')
              }
            </button>
          </form>
          <div className="mt-4 text-center" style={{ paddingTop: '5px' }}>
            <button
              type="button"
              onClick={() => {
                if (showForgotPassword) {
                  setShowForgotPassword(false);
                  setError(null);
                } else {
                  setShowForgotPassword(true);
                  setError(null);
                }
              }}
              className="w-full font-semibold py-4 px-6 rounded-2xl transition-all duration-200 text-lg shadow-lg hover:shadow-xl"
              style={{
                backgroundColor: currentTheme.accent,
                color: '#ffffff'
              }}
              onMouseEnter={(e) => {
                const hex = currentTheme.accent.replace('#', '');
                const r = parseInt(hex.substr(0, 2), 16);
                const g = parseInt(hex.substr(2, 2), 16);
                const b = parseInt(hex.substr(4, 2), 16);
                e.target.style.backgroundColor = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = currentTheme.accent;
              }}
            >
              {showForgotPassword ? 'Geri' : 'Şifremi Unuttum'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell overflow-hidden no-scrollbar" style={{ backgroundColor: currentTheme.background }}>
      <main className="main-content">
        <div className="shadow-lg w-full" style={{ backgroundColor: currentTheme.background }}>
          <div className="shadow-lg w-full AppContent" style={{ backgroundColor: currentTheme.background }}>
            <div className="flex justify-between w-full max-w-7xl mx-auto px-4" style={{ maxWidth: '1440px' }}>
              <img
                src={currentLogo || logo}
                alt="Vaden Logo"
                style={{ width: '300px', height: '100px' }}
                className="!w-8 !h-8 xs:!w-10 xs:!h-10 sm:!w-12 sm:!h-12"
                onError={(e) => {
                  e.target.src = logo; // Fallback to default logo
                }}
              />
              <h2 className="text-[42px] font-semibold text-gray-900">
                Görev Takip Sistemi
              </h2>
              <div className="flex items-center">

                {/* Görev Ekleme Butonu */}
                {user?.role !== 'observer' && (
                  <button
                    onClick={() => {
                      resetNewTask();
                      setShowAddForm(!showAddForm);
                    }}
                    className="add-task-button rounded-lg transition-all duration-200 shadow-md"
                    style={{
                      marginRight: '5px',
                      backgroundColor: currentTheme.accent,
                      color: '#ffffff',
                      border: `1px solid ${currentTheme.border}`,
                      cursor: 'pointer'
                    }}
                  >
                    <span className="add-icon" style={{ color: '#ffffff' }}>➕</span>
                  </button>
                )}

                {/* Kullanıcı Butonu */}
                <div className="relative profile-menu">
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="profile-icon text-xs sm:text-sm font-medium rounded-lg flex items-center space-x-2 shadow-md"
                    title={user?.email || ''}
                    style={{
                      marginRight: '5px',
                      backgroundColor: currentTheme.accent,
                      color: '#ffffff',
                      border: `1px solid ${currentTheme.border}`,
                      cursor: 'pointer'
                    }}
                  >
                    <span className="user-icon" style={{ color: '#ffffff' }}>👤</span>
                    <span className="hidden xs:inline text-xs xs:text-sm" style={{ color: '#ffffff' }}>{user?.name || 'Kullanıcı'}</span>
                    <span className="text-xs hidden sm:inline" style={{ color: '#ffffff' }}>▼</span>
                  </button>

                  {showProfileMenu && (
                    <div
                      className="absolute right-0 top-full mt-2 w-48 rounded-lg shadow-xl py-1 z-[9999]"
                      style={{
                        display: 'block',
                        padding: '5px',
                        backgroundColor: currentTheme.tableBackground || currentTheme.background,
                        borderColor: currentTheme.border,
                        borderWidth: '1px',
                        borderStyle: 'solid'
                      }}
                    >
                      {/* Profil yönetimi */}
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          setShowUserProfile(true);
                        }}
                        className="w-full text-left px-4 py-2 text-sm flex items-center space-x-2 transition-colors"
                        style={{
                          padding: '10px',
                          color: currentTheme.text,
                          backgroundColor: 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = `${currentTheme.border}30`;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'transparent';
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <span>👤</span>
                          <span>Profil</span>
                        </span>
                      </button>

                      {/* Tema Ayarları */}
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          setShowThemePanel(true);
                        }}
                        className="w-full text-left px-4 py-2 text-sm flex items-center space-x-2 transition-colors"
                        style={{
                          padding: '10px',
                          color: currentTheme.text,
                          backgroundColor: 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = `${currentTheme.border}30`;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'transparent';
                        }}
                      >
                        <span className="flex items-center gap-2 whitespace-nowrap">
                          <span>🎨</span>
                          <span>Tema Ayarları</span>
                        </span>
                      </button>

                      {/* Görev Ayarları */}
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            setShowTaskSettings(true);
                          }}
                          className="w-full text-left px-4 py-2 text-sm flex items-center space-x-2 transition-colors"
                          style={{
                            padding: '10px',
                            color: currentTheme.text,
                            backgroundColor: 'transparent'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = `${currentTheme.border}30`;
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                          }}
                        >
                          <span className="flex items-center gap-2">
                            <span>📋</span>
                            <span>Görev Ayarları</span>
                          </span>
                        </button>
                      )}

                      {/* Takım Yönetim */}
                      {user?.role === 'team_leader' && (
                        <button
                          onClick={async () => {
                            setShowProfileMenu(false);
                            await loadTeamMembers(user?.id);
                            setShowTeamModal(true);
                          }}
                          className="w-full text-left px-4 py-2 text-sm flex items-center space-x-2 transition-colors"
                          style={{
                            padding: '10px',
                            color: currentTheme.text,
                            backgroundColor: 'transparent'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = `${currentTheme.border}30`;
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                          }}
                        >
                          <span className="flex items-center gap-2 whitespace-nowrap">
                            <span>👥</span>
                            <span>Takım</span>
                          </span>
                        </button>
                      )}

                      {/* Kullanıcı Yönetim */}
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            setShowUserPanel(true);
                          }}
                          className="w-full text-left px-4 py-2 text-sm flex items-center space-x-2 transition-colors"
                          style={{
                            padding: '10px',
                            color: currentTheme.text,
                            backgroundColor: 'transparent'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = `${currentTheme.border}30`;
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                          }}
                        >
                          <span className="flex items-center gap-2 whitespace-nowrap">
                            <span>⚙️</span>
                            <span>Kullanıcı Yönetimi</span>
                          </span>
                        </button>
                      )}

                      {/* Çıkış Butonu */}
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-sm flex items-center space-x-2 transition-colors"
                        style={{
                          padding: '10px',
                          color: currentTheme.text,
                          backgroundColor: 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = `${currentTheme.border}30`;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'transparent';
                        }}
                      >
                        <span className="flex items-center gap-2 whitespace-nowrap">
                          <span>🚪</span>
                          <span>Çıkış Yap</span>
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Bildirimler Butonu */}
                <button
                  ref={bellRef}
                  onClick={async () => {
                    const next = !showNotifications;
                    if (next) await loadNotifications();
                    setShowNotifications(next);
                  }}
                  className="notification-bell relative rounded-lg overflow-visible"
                  aria-label="Bildirimler"
                  style={{
                    marginRight: '5px',
                    backgroundColor: currentTheme.accent,
                    color: '#ffffff',
                    border: `1px solid ${currentTheme.border}`,
                    cursor: 'pointer'
                  }}
                >
                  {badgeCount > 0 && (
                    <span className="notification-badge">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}

                  <span style={{ color: '#ffffff' }}>🔔</span>
                </button>

                {/* Güncelleme Notları Butonu */}
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      if (!updatesContent) {
                        try {
                          const response = await fetch('/UPDATES.md');
                          const text = await response.text();
                          setUpdatesContent(text);
                        } catch (err) {
                          console.error('Failed to load updates:', err);
                          setUpdatesContent('# Güncelleme Notları\n\nGüncelleme notları yüklenemedi.');
                        }
                      }
                      setShowUpdatesModal(true);
                    } catch (err) {
                      console.error('Error opening updates modal:', err);
                    }
                  }}
                  className="add-task-button rounded-lg overflow-visible"
                  aria-label="Güncelleme Notları"
                  title="Güncelleme Notları"
                  style={{
                    marginRight: '5px',
                    backgroundColor: currentTheme.accent || '#3b82f6',
                    color: '#ffffff',
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                    border: `1px solid ${currentTheme.border}`
                  }}
                >
                  <span style={{ color: '#ffffff' }}>📋</span>
                </button>
                {showNotifications && createPortal(
                  <>
                    <div className="fixed inset-0 z-[999992]"
                      onClick={() => setShowNotifications(false)} style={{ pointerEvents: 'auto', backgroundColor: `${currentTheme.background}CC` }} />

                    <div
                      ref={notifPanelRef}
                      className="fixed z-[99999] p-3"
                      style={{
                        top: `${notifPos.top}px`,
                        right: `${notifPos.right}px`,
                        opacity: 1,
                        backdropFilter: 'none',
                        WebkitBackdropFilter: 'none',
                      }}
                    >
                      <div
                        className="w-[500px] max-h-[600px] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
                        style={{
                          pointerEvents: 'auto',
                          backgroundColor: currentTheme.tableBackground || currentTheme.background,
                          borderColor: currentTheme.border,
                          borderWidth: '1px',
                          borderStyle: 'solid'
                        }}
                      >
                        {/* İçerik Alanı - Sadece Bildirimler */}
                        <div
                          className="overflow-y-auto no-scrollbar flex-1 min-h-0"
                          style={{ padding: '10px' }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold" style={{ color: currentTheme.text }}>Bildirimler</h3>
                            <button
                              onClick={markAllNotificationsAsRead}
                              disabled={markingAllNotifications || !Array.isArray(notifications) || notifications.length === 0}
                              className="text-xs px-3 py-1 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              style={{
                                backgroundColor: `${currentTheme.border}40`,
                                color: currentTheme.text,
                                borderColor: currentTheme.border
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = `${currentTheme.border}60`}
                              onMouseLeave={(e) => e.target.style.backgroundColor = `${currentTheme.border}40`}
                            >
                              Tümünü Oku
                            </button>
                          </div>
                          {(!Array.isArray(notifications) || notifications.length === 0) ? (
                            <div className="p-4 text-center" style={{ color: currentTheme.textSecondary }}>Bildirim bulunmuyor</div>
                          ) : (
                            notifications.map(n => (
                              <div
                                key={n.id}
                                className={`p-3 last:border-b-0 transition-colors cursor-pointer`}
                                style={{
                                  borderBottom: `1px solid ${currentTheme.border}`,
                                  backgroundColor: n.read_at ? `${currentTheme.border}20` : `${currentTheme.accent}20`
                                }}
                                onClick={() => handleNotificationClick(n)}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${currentTheme.border}30`}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = n.read_at ? `${currentTheme.border}20` : `${currentTheme.accent}20`}
                              >
                                <div className="flex items-start">
                                  <div className="flex-1">
                                    <p className="text-sm" style={{ color: currentTheme.text }}>{n.message}</p>
                                    <p className="text-xs mt-1" style={{ color: currentTheme.textSecondary }}>{formatDate(n.created_at)}</p>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                      </div>

                    </div>
                  </>,
                  document.body
                )}
                {showUpdatesModal && createPortal(
                  <>
                    <div className="fixed inset-0 z-[999992]"
                      onClick={() => setShowUpdatesModal(false)} style={{ pointerEvents: 'auto', backgroundColor: `${currentTheme.background}CC` }} />

                    <div className="fixed z-[99999] p-3 update-screen shadow-[0_25px_80px_rgba(0,0,0,.6)]">
                      <div
                        className="max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
                        style={{
                          backgroundColor: currentTheme.tableBackground || currentTheme.background,
                          borderColor: currentTheme.border,
                          borderWidth: '1px',
                          borderStyle: 'solid'
                        }}
                      >
                        {/* Başlık */}
                        <div className="flex items-center justify-between p-4"
                          style={{
                            borderBottom: `1px solid ${currentTheme.border}`,
                            backgroundColor: `${currentTheme.accent}20`
                          }}>
                          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: currentTheme.text }}>
                            <span>📋</span>
                            Güncelleme Notları
                          </h2>
                          <button
                            onClick={() => setShowUpdatesModal(false)}
                            className="text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                            style={{ color: currentTheme.textSecondary, backgroundColor: 'transparent' }}
                            onMouseEnter={(e) => {
                              e.target.style.color = currentTheme.text;
                              e.target.style.backgroundColor = `${currentTheme.border}30`;
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.color = currentTheme.textSecondary;
                              e.target.style.backgroundColor = 'transparent';
                            }}
                            aria-label="Kapat"
                          >
                            ✕
                          </button>
                        </div>

                        {/* İçerik Alanı */}
                        <div
                          className="overflow-y-auto flex-1 p-6 no-scrollbar update-screen__inner"
                          style={{
                            backgroundColor: currentTheme.background,
                            color: currentTheme.text,
                            fontFamily: 'system-ui, -apple-system, sans-serif'
                          }}
                        >
                          {!updatesContent ? (
                            <p style={{ color: currentTheme.textSecondary || currentTheme.text }}>
                              Güncelleme notları yükleniyor...
                            </p>
                          ) : (
                            <div className="markdown-body">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeSanitize]}
                                components={{
                                  a: ({ ...props }) => <a {...props} target="_blank" rel="noreferrer noopener" style={{ color: currentTheme.accent }} />,
                                  h1: ({ ...props }) => <h1 {...props} style={{ color: currentTheme.accent, fontSize: '1.75rem', fontWeight: 'bold', marginTop: '2rem', marginBottom: '1rem', borderBottom: `2px solid ${currentTheme.accent}`, paddingBottom: '0.5rem' }} />,
                                  h2: ({ ...props }) => <h2 {...props} style={{ color: currentTheme.accent, fontSize: '1.5rem', fontWeight: 'bold', marginTop: '1.5rem', marginBottom: '0.75rem' }} />,
                                  h3: ({ ...props }) => <h3 {...props} style={{ color: currentTheme.accent, fontSize: '1.25rem', fontWeight: 'bold', marginTop: '1rem', marginBottom: '0.5rem' }} />,
                                  hr: ({ ...props }) => <hr {...props} style={{ border: 'none', borderTop: `1px solid ${currentTheme.border}`, margin: '2rem 0' }} />,
                                  strong: ({ ...props }) => <strong {...props} style={{ color: currentTheme.accent, fontWeight: 'bold' }} />,
                                  p: ({ ...props }) => <p {...props} style={{ color: currentTheme.text, marginBottom: '1rem' }} />,
                                  ul: ({ ...props }) => <ul {...props} style={{ margin: '1rem 0', paddingLeft: '1.5rem', listStyleType: 'disc', color: currentTheme.text }} />,
                                  ol: ({ ...props }) => <ol {...props} style={{ margin: '1rem 0', paddingLeft: '1.5rem', color: currentTheme.text }} />,
                                  li: ({ ...props }) => <li {...props} style={{ marginBottom: '0.5rem', color: currentTheme.text, lineHeight: '1.6' }} />,
                                }}
                              >
                                {updatesContent}
                              </ReactMarkdown>
                              <style>{`
                                .markdown-body {
                                  color: ${currentTheme.text};
                                  line-height: 1.6;
                                }
                                .markdown-body ul ul {
                                  margin: 0.5rem 0;
                                  padding-left: 2rem;
                                  list-style-type: circle;
                                }
                                .markdown-body ul ul ul {
                                  list-style-type: square;
                                }
                                .markdown-body code {
                                  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                                  font-size: 0.95em;
                                  background-color: ${currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background};
                                  padding: 2px 6px;
                                  border-radius: 4px;
                                }
                                .markdown-body pre {
                                  padding: 12px;
                                  overflow: auto;
                                  border-radius: 10px;
                                  background: ${currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background};
                                  color: ${currentTheme.text};
                                }
                                .markdown-body table {
                                  border-collapse: collapse;
                                  width: 100%;
                                  margin: 1rem 0;
                                }
                                .markdown-body th, .markdown-body td {
                                  border: 1px solid ${currentTheme.border};
                                  padding: 6px 8px;
                                  text-align: left;
                                }
                                .markdown-body blockquote {
                                  border-left: 4px solid ${currentTheme.accent};
                                  padding-left: 12px;
                                  color: ${currentTheme.textSecondary || currentTheme.text};
                                  margin-left: 0;
                                }
                              `}</style>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>,
                  document.body
                )}

                {/* Tema Ayarları Modal */}
                {showThemePanel && createPortal(
                  <div className="fixed inset-0 z-[999980]" style={{ pointerEvents: 'auto' }}>
                    <div className="absolute inset-0" onClick={() => {
                      setShowThemePanel(false);
                      // Tema kaydetme işleminin tamamlanması için kısa bir delay
                      setTimeout(() => {
                        window.location.reload();
                      }, 300);
                    }} style={{ pointerEvents: 'auto', backgroundColor: `${currentTheme.background}CC` }} />
                    <div className="relative z-10 flex min-h-full items-center justify-center p-4" style={{ pointerEvents: 'auto' }}>
                      <div className="fixed z-[100210] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[900px] max-h-[85vh] rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,.6)] overflow-hidden" style={{
                        pointerEvents: 'auto',
                        backgroundColor: currentTheme.tableBackground || currentTheme.background,
                        borderColor: currentTheme.border,
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        color: currentTheme.text
                      }} onClick={(e) => e.stopPropagation()}>
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3"
                          style={{
                            borderBottom: `1px solid ${currentTheme.border}`,
                            backgroundColor: currentTheme.background
                          }}>
                          <div></div>
                          <h2 className="font-semibold text-center" style={{ color: currentTheme.text }}>Tema Ayarları</h2>
                          <div className="justify-self-end">
                            <button onClick={() => {
                              setShowThemePanel(false);
                              // Tema kaydetme işleminin tamamlanması için kısa bir delay
                              setTimeout(() => {
                                window.location.reload();
                              }, 300);
                            }}
                              className="rounded-lg px-2 py-1 transition-colors"
                              style={{ color: currentTheme.textSecondary, backgroundColor: 'transparent' }}
                              onMouseEnter={(e) => {
                                e.target.style.color = currentTheme.text;
                                e.target.style.backgroundColor = `${currentTheme.border}30`;
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.color = currentTheme.textSecondary;
                                e.target.style.backgroundColor = 'transparent';
                              }}>✕</button>
                          </div>
                        </div>

                        <div className="p-4 xs:p-6 sm:p-8 space-y-6 overflow-y-auto no-scrollbar" style={{ maxHeight: 'calc(85vh - 80px)', backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
                          {/* Hazır Temalar */}
                          <div className="rounded-2xl p-6" style={{ backgroundColor: `${currentTheme.border}20`, borderColor: currentTheme.border, borderWidth: '1px', borderStyle: 'solid' }}>
                            <h3 className="text-xl font-semibold mb-4" style={{ color: currentTheme.text }}>Hazır Temalar</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                              {Object.entries(predefinedThemes).map(([key, theme]) => {
                                // Daha doygun buton arkaplanları
                                let buttonBg = theme.background;
                                if (key === 'blue') buttonBg = '#1e3a8a'; // Daha doygun mavi
                                else if (key === 'purple') buttonBg = '#6b21a8'; // Daha doygun mor
                                else if (key === 'green') buttonBg = '#166534'; // Daha doygun yeşil
                                else if (key === 'orange') buttonBg = '#7c2d12'; // Daha doygun turuncu
                                else if (key === 'dark') buttonBg = '#0f172a'; // Koyu tema
                                else if (key === 'light') buttonBg = '#f8fafc'; // Açık tema

                                return (
                                  <button
                                    key={key}
                                    onClick={() => {
                                      // Hazır tema seçildiğinde customTheme'i o temanın değerleriyle doldur
                                      setCustomTheme({
                                        ...theme,
                                        logoType: key === 'light' ? 'dark' : 'light', // Light temada dark logo, diğerlerinde light logo
                                        socialIconColor: theme.socialIconColor || theme.textSecondary,
                                        tableHeader: theme.tableHeader || theme.border
                                      });
                                      setCurrentThemeName(key);
                                      setThemeSaveState('idle'); // Tema değişti, kaydet durumunu sıfırla
                                    }}
                                    className="p-4 rounded-xl border-2 transition-all hover:opacity-90"
                                    style={{
                                      backgroundColor: buttonBg,
                                      color: theme.text,
                                      borderColor: currentTheme.border
                                    }}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-medium">{theme.name}</span>
                                      {currentThemeName === key && <span style={{ color: currentTheme.accent }}>✓</span>}
                                    </div>
                                    <div className="flex gap-1 mt-2">
                                      <div className="flex-1 h-8 rounded-lg" style={{ backgroundColor: theme.background }}></div>
                                      <div className="flex-1 h-8 rounded-lg" style={{ backgroundColor: theme.tableBackground || theme.background }}></div>
                                      <div className="flex-1 h-8 rounded-lg" style={{ backgroundColor: theme.accent }}></div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Tema Özelleştirme */}
                          <div className="rounded-2xl p-6" style={{ backgroundColor: `${currentTheme.border}20`, borderColor: currentTheme.border, borderWidth: '1px', borderStyle: 'solid' }}>
                            <h3 className="text-xl font-semibold mb-4" style={{ color: currentTheme.text }}>
                              Tema Özelleştirme
                            </h3>
                            <div className="space-y-4">
                              {/* Renk Seçimleri - 2 Sütunlu Düzen (Sol 5, Sağ 5) */}
                              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                {/* Sol Sütun - İlk 5 */}
                                {/* Arkaplan Rengi */}
                                <div className="flex items-center gap-6">
                                  <input
                                    type="color"
                                    value={customTheme.background}
                                    onChange={(e) => {
                                      const newTheme = { ...customTheme, background: e.target.value };
                                      setCustomTheme(newTheme);
                                      setCurrentThemeName('custom');
                                      setThemeSaveState('idle');
                                    }}
                                    className="rounded-full cursor-pointer transition-all hover:scale-110"
                                    style={{
                                      width: '48px',
                                      height: '48px',
                                      minWidth: '48px',
                                      minHeight: '48px',
                                      backgroundColor: customTheme.background,
                                      border: 'none',
                                      padding: '0',
                                      outline: 'none',
                                      appearance: 'none',
                                      WebkitAppearance: 'none',
                                      MozAppearance: 'none'
                                    }}
                                    title="Arkaplan rengi"
                                  />
                                  <span className="text-lg font-medium min-w-[140px]" style={{ color: currentTheme.text }}>Arkaplan</span>
                                  <input
                                    type="text"
                                    value={customTheme.background}
                                    onChange={(e) => {
                                      const newTheme = { ...customTheme, background: e.target.value };
                                      setCustomTheme(newTheme);
                                      setCurrentThemeName('custom');
                                      setThemeSaveState('idle');
                                    }}
                                    className="px-3 py-2 rounded-xl text-base focus:outline-none"
                                    style={{
                                      backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                      color: currentTheme.text,
                                      borderColor: currentTheme.border,
                                      borderWidth: '1px',
                                      borderStyle: 'solid',
                                      minWidth: '100px'
                                    }}
                                    onFocus={(e) => {
                                      e.target.style.borderColor = currentTheme.accent;
                                      e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                    }}
                                    onBlur={(e) => {
                                      e.target.style.borderColor = currentTheme.border;
                                      e.target.style.boxShadow = 'none';
                                    }}
                                    placeholder="#000000"
                                  />
                                </div>

                                {/* Tablo Arkaplan */}
                                <div className="flex items-center gap-6">
                                  <input
                                    type="color"
                                    value={customTheme.tableBackground || customTheme.background}
                                    onChange={(e) => {
                                      const newTheme = { ...customTheme, tableBackground: e.target.value };
                                      setCustomTheme(newTheme);
                                      setCurrentThemeName('custom');
                                      setThemeSaveState('idle');
                                    }}
                                    className="rounded-full cursor-pointer transition-all hover:scale-110"
                                    style={{
                                      width: '48px',
                                      height: '48px',
                                      minWidth: '48px',
                                      minHeight: '48px',
                                      backgroundColor: customTheme.tableBackground || customTheme.background,
                                      border: 'none',
                                      padding: '0',
                                      outline: 'none',
                                      appearance: 'none',
                                      WebkitAppearance: 'none',
                                      MozAppearance: 'none'
                                    }}
                                    title="Tablo arkaplan rengi"
                                  />
                                  <span className="text-lg font-medium min-w-[140px]" style={{ color: currentTheme.text }}>Tablo Arkaplan</span>
                                  <input
                                    type="text"
                                    value={customTheme.tableBackground || customTheme.background}
                                    onChange={(e) => {
                                      const newTheme = { ...customTheme, tableBackground: e.target.value };
                                      setCustomTheme(newTheme);
                                      setCurrentThemeName('custom');
                                      setThemeSaveState('idle');
                                    }}
                                    className="px-3 py-2 rounded-xl text-base focus:outline-none"
                                    style={{
                                      backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                      color: currentTheme.text,
                                      borderColor: currentTheme.border,
                                      borderWidth: '1px',
                                      borderStyle: 'solid',
                                      minWidth: '100px'
                                    }}
                                    onFocus={(e) => {
                                      e.target.style.borderColor = currentTheme.accent;
                                      e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                    }}
                                    onBlur={(e) => {
                                      e.target.style.borderColor = currentTheme.border;
                                      e.target.style.boxShadow = 'none';
                                    }}
                                    placeholder="#000000"
                                  />
                                </div>

                                {/* Tablo Satır Alternatif */}
                                <div className="flex items-center gap-6">
                                  <input
                                    type="color"
                                    value={customTheme.tableRowAlt || customTheme.background}
                                    onChange={(e) => {
                                      const newTheme = { ...customTheme, tableRowAlt: e.target.value };
                                      setCustomTheme(newTheme);
                                      setCurrentThemeName('custom');
                                      setThemeSaveState('idle');
                                    }}
                                    className="rounded-full cursor-pointer transition-all hover:scale-110"
                                    style={{
                                      width: '48px',
                                      height: '48px',
                                      minWidth: '48px',
                                      minHeight: '48px',
                                      backgroundColor: customTheme.tableRowAlt || customTheme.background,
                                      border: 'none',
                                      padding: '0',
                                      outline: 'none',
                                      appearance: 'none',
                                      WebkitAppearance: 'none',
                                      MozAppearance: 'none'
                                    }}
                                    title="Tablo satır alternatif rengi"
                                  />
                                  <span className="text-lg font-medium min-w-[140px]" style={{ color: currentTheme.text }}>Tablo Satır Alt</span>
                                  <input
                                    type="text"
                                    value={customTheme.tableRowAlt || customTheme.background}
                                    onChange={(e) => {
                                      const newTheme = { ...customTheme, tableRowAlt: e.target.value };
                                      setCustomTheme(newTheme);
                                      setCurrentThemeName('custom');
                                      setThemeSaveState('idle');
                                    }}
                                    className="px-3 py-2 rounded-xl text-base focus:outline-none"
                                    style={{
                                      backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                      color: currentTheme.text,
                                      borderColor: currentTheme.border,
                                      borderWidth: '1px',
                                      borderStyle: 'solid',
                                      minWidth: '100px'
                                    }}
                                    onFocus={(e) => {
                                      e.target.style.borderColor = currentTheme.accent;
                                      e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                    }}
                                    onBlur={(e) => {
                                      e.target.style.borderColor = currentTheme.border;
                                      e.target.style.boxShadow = 'none';
                                    }}
                                    placeholder="#000000"
                                  />
                                </div>

                                {/* Tablo Başlığı */}
                                <div className="flex items-center gap-6">
                                  <input
                                    type="color"
                                    value={customTheme.tableHeader || customTheme.border}
                                    onChange={(e) => {
                                      const newTheme = { ...customTheme, tableHeader: e.target.value };
                                      setCustomTheme(newTheme);
                                      setCurrentThemeName('custom');
                                      setThemeSaveState('idle');
                                    }}
                                    className="rounded-full cursor-pointer transition-all hover:scale-110"
                                    style={{
                                      width: '48px',
                                      height: '48px',
                                      minWidth: '48px',
                                      minHeight: '48px',
                                      backgroundColor: customTheme.tableHeader || customTheme.border,
                                      border: 'none',
                                      padding: '0',
                                      outline: 'none',
                                      appearance: 'none',
                                      WebkitAppearance: 'none',
                                      MozAppearance: 'none'
                                    }}
                                    title="Tablo başlığı rengi"
                                  />
                                  <span className="text-lg font-medium min-w-[140px]" style={{ color: currentTheme.text }}>Tablo Başlığı</span>
                                  <input
                                    type="text"
                                    value={customTheme.tableHeader || customTheme.border}
                                    onChange={(e) => {
                                      const newTheme = { ...customTheme, tableHeader: e.target.value };
                                      setCustomTheme(newTheme);
                                      setCurrentThemeName('custom');
                                      setThemeSaveState('idle');
                                    }}
                                    className="px-3 py-2 rounded-xl text-base focus:outline-none"
                                    style={{
                                      backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                      color: currentTheme.text,
                                      borderColor: currentTheme.border,
                                      borderWidth: '1px',
                                      borderStyle: 'solid',
                                      minWidth: '100px'
                                    }}
                                    onFocus={(e) => {
                                      e.target.style.borderColor = currentTheme.accent;
                                      e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                    }}
                                    onBlur={(e) => {
                                      e.target.style.borderColor = currentTheme.border;
                                      e.target.style.boxShadow = 'none';
                                    }}
                                    placeholder="#000000"
                                  />
                                </div>

                                {/* Yazı Rengi */}
                                <div className="flex items-center gap-6">
                                  <input
                                    type="color"
                                    value={customTheme.text}
                                    onChange={(e) => {
                                      const newTheme = { ...customTheme, text: e.target.value };
                                      setCustomTheme(newTheme);
                                      setCurrentThemeName('custom');
                                      setThemeSaveState('idle');
                                    }}
                                    className="rounded-full cursor-pointer transition-all hover:scale-110"
                                    style={{
                                      width: '48px',
                                      height: '48px',
                                      minWidth: '48px',
                                      minHeight: '48px',
                                      backgroundColor: customTheme.text,
                                      border: 'none',
                                      padding: '0',
                                      outline: 'none',
                                      appearance: 'none',
                                      WebkitAppearance: 'none',
                                      MozAppearance: 'none'
                                    }}
                                    title="Yazı rengi"
                                  />
                                  <span className="text-lg font-medium min-w-[140px]" style={{ color: currentTheme.text }}>Yazı</span>
                                  <input
                                    type="text"
                                    value={customTheme.text}
                                    onChange={(e) => {
                                      const newTheme = { ...customTheme, text: e.target.value };
                                      setCustomTheme(newTheme);
                                      setCurrentThemeName('custom');
                                      setThemeSaveState('idle');
                                    }}
                                    className="px-3 py-2 rounded-xl text-base focus:outline-none"
                                    style={{
                                      backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                      color: currentTheme.text,
                                      borderColor: currentTheme.border,
                                      borderWidth: '1px',
                                      borderStyle: 'solid',
                                      minWidth: '100px'
                                    }}
                                    onFocus={(e) => {
                                      e.target.style.borderColor = currentTheme.accent;
                                      e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                    }}
                                    onBlur={(e) => {
                                      e.target.style.borderColor = currentTheme.border;
                                      e.target.style.boxShadow = 'none';
                                    }}
                                    placeholder="#ffffff"
                                  />
                                </div>

                                {/* Sağ Sütun - Son 5 */}
                                {/* İkincil Yazı */}
                                <div className="flex items-center gap-6">
                                  <input
                                    type="color"
                                    value={customTheme.textSecondary}
                                    onChange={(e) => {
                                      const newTheme = { ...customTheme, textSecondary: e.target.value };
                                      setCustomTheme(newTheme);
                                      setCurrentThemeName('custom');
                                      setThemeSaveState('idle');
                                    }}
                                    className="rounded-full cursor-pointer transition-all hover:scale-110"
                                    style={{
                                      width: '48px',
                                      height: '48px',
                                      minWidth: '48px',
                                      minHeight: '48px',
                                      backgroundColor: customTheme.textSecondary,
                                      border: 'none',
                                      padding: '0',
                                      outline: 'none',
                                      appearance: 'none',
                                      WebkitAppearance: 'none',
                                      MozAppearance: 'none'
                                    }}
                                    title="İkincil yazı rengi"
                                  />
                                  <span className="text-lg font-medium min-w-[140px]" style={{ color: currentTheme.text }}>İkincil Yazı</span>
                                  <input
                                    type="text"
                                    value={customTheme.textSecondary}
                                    onChange={(e) => {
                                      const newTheme = { ...customTheme, textSecondary: e.target.value };
                                      setCustomTheme(newTheme);
                                      setCurrentThemeName('custom');
                                      setThemeSaveState('idle');
                                    }}
                                    className="px-3 py-2 rounded-xl text-base focus:outline-none"
                                    style={{
                                      backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                      color: currentTheme.text,
                                      borderColor: currentTheme.border,
                                      borderWidth: '1px',
                                      borderStyle: 'solid',
                                      minWidth: '100px'
                                    }}
                                    onFocus={(e) => {
                                      e.target.style.borderColor = currentTheme.accent;
                                      e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                    }}
                                    onBlur={(e) => {
                                      e.target.style.borderColor = currentTheme.border;
                                      e.target.style.boxShadow = 'none';
                                    }}
                                    placeholder="#cccccc"
                                  />
                                </div>

                                {/* Vurgu Rengi */}
                                <div className="flex items-center gap-6">
                                  <input
                                    type="color"
                                    value={customTheme.accent}
                                    onChange={(e) => {
                                      const newTheme = { ...customTheme, accent: e.target.value };
                                      setCustomTheme(newTheme);
                                      setCurrentThemeName('custom');
                                      setThemeSaveState('idle');
                                    }}
                                    className="rounded-full cursor-pointer transition-all hover:scale-110"
                                    style={{
                                      width: '48px',
                                      height: '48px',
                                      minWidth: '48px',
                                      minHeight: '48px',
                                      backgroundColor: customTheme.accent,
                                      border: 'none',
                                      padding: '0',
                                      outline: 'none',
                                      appearance: 'none',
                                      WebkitAppearance: 'none',
                                      MozAppearance: 'none'
                                    }}
                                    title="Vurgu rengi"
                                  />
                                  <span className="text-lg font-medium min-w-[140px]" style={{ color: currentTheme.text }}>Vurgu</span>
                                  <input
                                    type="text"
                                    value={customTheme.accent}
                                    onChange={(e) => {
                                      const newTheme = { ...customTheme, accent: e.target.value };
                                      setCustomTheme(newTheme);
                                      setCurrentThemeName('custom');
                                      setThemeSaveState('idle');
                                    }}
                                    className="px-3 py-2 rounded-xl text-base focus:outline-none"
                                    style={{
                                      backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                      color: currentTheme.text,
                                      borderColor: currentTheme.border,
                                      borderWidth: '1px',
                                      borderStyle: 'solid',
                                      minWidth: '100px'
                                    }}
                                    onFocus={(e) => {
                                      e.target.style.borderColor = currentTheme.accent;
                                      e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                    }}
                                    onBlur={(e) => {
                                      e.target.style.borderColor = currentTheme.border;
                                      e.target.style.boxShadow = 'none';
                                    }}
                                    placeholder="#3b82f6"
                                  />
                                </div>

                                {/* Kenarlık */}
                                <div className="flex items-center gap-6">
                                  <input
                                    type="color"
                                    value={customTheme.border}
                                    onChange={(e) => {
                                      const newTheme = { ...customTheme, border: e.target.value };
                                      setCustomTheme(newTheme);
                                      setCurrentThemeName('custom');
                                      setThemeSaveState('idle');
                                    }}
                                    className="rounded-full cursor-pointer transition-all hover:scale-110"
                                    style={{
                                      width: '48px',
                                      height: '48px',
                                      minWidth: '48px',
                                      minHeight: '48px',
                                      backgroundColor: customTheme.border,
                                      border: 'none',
                                      padding: '0',
                                      outline: 'none',
                                      appearance: 'none',
                                      WebkitAppearance: 'none',
                                      MozAppearance: 'none'
                                    }}
                                    title="Kenarlık rengi"
                                  />
                                  <span className="text-lg font-medium min-w-[140px]" style={{ color: currentTheme.text }}>Kenarlık</span>
                                  <input
                                    type="text"
                                    value={customTheme.border}
                                    onChange={(e) => {
                                      const newTheme = { ...customTheme, border: e.target.value };
                                      setCustomTheme(newTheme);
                                      setCurrentThemeName('custom');
                                      setThemeSaveState('idle');
                                    }}
                                    className="px-3 py-2 rounded-xl text-base focus:outline-none"
                                    style={{
                                      backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                      color: currentTheme.text,
                                      borderColor: currentTheme.border,
                                      borderWidth: '1px',
                                      borderStyle: 'solid',
                                      minWidth: '100px'
                                    }}
                                    onFocus={(e) => {
                                      e.target.style.borderColor = currentTheme.accent;
                                      e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                    }}
                                    onBlur={(e) => {
                                      e.target.style.borderColor = currentTheme.border;
                                      e.target.style.boxShadow = 'none';
                                    }}
                                    placeholder="#334155"
                                  />
                                </div>

                                {/* Sosyal Medya İkon Rengi */}
                                <div className="flex items-center gap-6">
                                  <input
                                    type="color"
                                    value={customTheme.socialIconColor || customTheme.textSecondary}
                                    onChange={(e) => {
                                      const newTheme = { ...customTheme, socialIconColor: e.target.value };
                                      setCustomTheme(newTheme);
                                      setCurrentThemeName('custom');
                                      setThemeSaveState('idle');
                                    }}
                                    className="rounded-full cursor-pointer transition-all hover:scale-110"
                                    style={{
                                      width: '48px',
                                      height: '48px',
                                      minWidth: '48px',
                                      minHeight: '48px',
                                      backgroundColor: customTheme.socialIconColor || customTheme.textSecondary,
                                      border: 'none',
                                      padding: '0',
                                      outline: 'none',
                                      appearance: 'none',
                                      WebkitAppearance: 'none',
                                      MozAppearance: 'none'
                                    }}
                                    title="Sosyal medya ikon rengi"
                                  />
                                  <span className="text-lg font-medium min-w-[140px]" style={{ color: currentTheme.text }}>Sosyal Medya İkon</span>
                                  <input
                                    type="text"
                                    value={customTheme.socialIconColor || customTheme.textSecondary}
                                    onChange={(e) => {
                                      const newTheme = { ...customTheme, socialIconColor: e.target.value };
                                      setCustomTheme(newTheme);
                                      setCurrentThemeName('custom');
                                      setThemeSaveState('idle');
                                    }}
                                    className="px-3 py-2 rounded-xl text-base focus:outline-none"
                                    style={{
                                      backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                      color: currentTheme.text,
                                      borderColor: currentTheme.border,
                                      borderWidth: '1px',
                                      borderStyle: 'solid',
                                      minWidth: '100px'
                                    }}
                                    onFocus={(e) => {
                                      e.target.style.borderColor = currentTheme.accent;
                                      e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                    }}
                                    onBlur={(e) => {
                                      e.target.style.borderColor = currentTheme.border;
                                      e.target.style.boxShadow = 'none';
                                    }}
                                    placeholder="#94a3b8"
                                  />
                                </div>

                                {/* Logo Tipi */}
                                <div className="flex items-center gap-6">
                                  <button
                                    onClick={() => {
                                      // Eğer custom tema kullanılıyorsa, sadece logoType'ı değiştir
                                      if (currentThemeName === 'custom') {
                                        const newTheme = { ...customTheme, logoType: customTheme.logoType === 'dark' ? 'light' : 'dark' };
                                        setCustomTheme(newTheme);
                                      } else {
                                        // Eğer önceden tanımlı bir tema kullanılıyorsa, o temanın ayarlarını customTheme'a kopyala
                                        const baseTheme = predefinedThemes[currentThemeName] || predefinedThemes.dark;
                                        // Mevcut logoType'ı belirle (varsa customTheme'dan, yoksa varsayılan 'dark')
                                        const currentLogoType = customTheme.logoType || 'dark';
                                        const newTheme = {
                                          ...baseTheme,
                                          logoType: currentLogoType === 'dark' ? 'light' : 'dark'
                                        };
                                        setCustomTheme(newTheme);
                                        setCurrentThemeName('custom');
                                      }
                                      setThemeSaveState('idle');
                                    }}
                                    className="rounded-full transition-all cursor-pointer flex items-center justify-center"
                                    style={{
                                      width: '48px',
                                      height: '48px',
                                      minWidth: '48px',
                                      minHeight: '48px',
                                      backgroundColor: (currentTheme.logoType || customTheme.logoType || 'dark') === 'dark' ? '#000000' : '#ffffff',
                                      border: 'none',
                                      padding: '4px',
                                      position: 'relative',
                                      outline: 'none',
                                      appearance: 'none',
                                      WebkitAppearance: 'none',
                                      MozAppearance: 'none'
                                    }}
                                    title="Koyu logo: koyu arkaplanlar için, Açık logo: açık arkaplanlar için"
                                    onMouseEnter={(e) => {
                                      e.target.style.borderColor = currentTheme.accent;
                                      e.target.style.transform = 'scale(1.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.borderColor = currentTheme.border;
                                      e.target.style.transform = 'scale(1)';
                                    }}
                                  >
                                    <span style={{
                                      color: '#ffffff',
                                      fontSize: '10px',
                                      fontWeight: 'bold',
                                      position: 'absolute',
                                      top: '50%',
                                      left: '50%',
                                      transform: 'translate(-50%, -50%)',
                                      whiteSpace: 'nowrap',
                                      lineHeight: '1.2',
                                      textAlign: 'center',
                                      padding: '2px'
                                    }}>
                                    </span>
                                  </button>
                                  <span className="text-lg font-medium min-w-[140px]" style={{ color: currentTheme.text }}>Logo Tipi</span>
                                  <div
                                    className="flex items-center justify-center rounded-xl"
                                    style={{
                                      minWidth: '100px',
                                      height: '48px',
                                      backgroundColor: (currentTheme.logoType || customTheme.logoType || 'dark') === 'dark' ? '#ffffff' : '#000000',
                                      border: `1px solid ${currentTheme.border}`,
                                      padding: '8px'
                                    }}
                                  >
                                    <img
                                      src={(currentTheme.logoType || customTheme.logoType || 'dark') === 'dark' ? darkLogo : lightLogo}
                                      alt="Logo Preview"
                                      style={{
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        objectFit: 'contain'
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Kaydet Butonu - Scroll container dışında */}
                        <div className="px-4 xs:px-6 sm:px-8 py-4 border-t" style={{
                          borderTop: `1px solid ${currentTheme.border}`,
                          backgroundColor: currentTheme.tableBackground || currentTheme.background
                        }}>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (themeSaveState === 'saving') {
                                return;
                              }
                              setThemeSaveState('saving');
                              try {
                                await saveTheme(currentThemeName, currentThemeName === 'custom' ? customTheme : null);
                                setThemeSaveState('saved');
                              } catch (error) {
                                console.error('Failed to save theme:', error);
                                setThemeSaveState('idle');
                                addNotification('Tema kaydedilemedi', 'error');
                              }
                            }}
                            disabled={themeSaveState === 'saving'}
                            className="w-full rounded-xl px-4 py-3 text-lg font-semibold transition-colors"
                            style={{
                              backgroundColor: themeSaveState === 'saving' ? `${currentTheme.border}60` : currentTheme.accent,
                              color: '#ffffff',
                              cursor: themeSaveState === 'saving' ? 'not-allowed' : 'pointer',
                              opacity: themeSaveState === 'saving' ? 0.7 : 1
                            }}
                            onMouseEnter={(e) => {
                              if (themeSaveState !== 'saving') {
                                const hex = currentTheme.accent.replace('#', '');
                                const r = parseInt(hex.substr(0, 2), 16);
                                const g = parseInt(hex.substr(2, 2), 16);
                                const b = parseInt(hex.substr(4, 2), 16);
                                e.target.style.backgroundColor = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (themeSaveState !== 'saving') {
                                e.target.style.backgroundColor = currentTheme.accent;
                              }
                            }}
                          >
                            {themeSaveState === 'saving' ? 'Kaydediliyor...' : themeSaveState === 'saved' ? 'Kaydedildi' : 'Kaydet'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>,
                  document.body
                )}
              </div>
            </div>
          </div>

          {showAddForm && (
            <div className="fixed inset-0 z-[999999]" style={{ pointerEvents: 'auto' }}>
              <div
                className="absolute inset-0"
                style={{ backgroundColor: `${currentTheme.background}CC`, pointerEvents: 'auto' }}
                onClick={() => {
                  setShowAddForm(false);
                  resetNewTask();
                }}
              />
              <div className="relative z-10 flex items-center justify-center p-2 sm:p-4 min-h-full" style={{ pointerEvents: 'auto' }}>
                <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[1440px] max-h-[100vh] rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,.6)] overflow-hidden" style={{
                  pointerEvents: 'auto',
                  paddingRight: '5px',
                  backgroundColor: currentTheme.tableBackground || currentTheme.background,
                  borderColor: currentTheme.border,
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  color: currentTheme.text
                }} onClick={(e) => e.stopPropagation()}>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3"
                    style={{
                      borderBottom: `1px solid ${currentTheme.border}`,
                      backgroundColor: currentTheme.background
                    }}>
                    <div></div>
                    <h2 className="font-semibold text-center" style={{ color: currentTheme.text }}>Yeni Görev</h2>
                    <div className="justify-self-end">
                      <button onClick={() => {
                        setShowAddForm(false);
                        resetNewTask();
                      }} className="rounded px-2 py-1 transition-colors font-bold"
                        style={{
                          color: currentTheme.text,
                          backgroundColor: 'transparent',
                          fontSize: '20px',
                          lineHeight: '1'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.color = '#ffffff';
                          e.target.style.backgroundColor = currentTheme.accent;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.color = currentTheme.text;
                          e.target.style.backgroundColor = 'transparent';
                        }}>✕</button>
                    </div>
                  </div>
                  <div className="overflow-y-auto no-scrollbar flex flex-col gap-4 sm:gap-6" style={{ height: 'auto', maxHeight: 'calc(95vh - 80px)', padding: '20px 20px 20px 20px' }}>
                    {error && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-2xl mb-4">
                        {error}
                      </div>
                    )}
                    <br />
                    <div className="grid grid-cols-[200px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                      <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>Başlık</label>
                      <input
                        type="text"
                        placeholder="Görev başlığını girin..."
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        className="rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] focus:outline-none focus:ring-2 shadow-sm"
                        style={{
                          minHeight: '48px',
                          backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                          color: currentTheme.text,
                          borderColor: currentTheme.border,
                          borderWidth: '1px',
                          borderStyle: 'solid'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = currentTheme.accent;
                          e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = currentTheme.border;
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                    <br />
                    <div className="grid grid-cols-[200px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                      <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>Görev Türü</label>
                      <select
                        value={newTask.task_type}
                        onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value })}
                        className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] focus:outline-none focus:ring-2"
                        style={{
                          minHeight: '48px',
                          backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                          color: currentTheme.text,
                          borderColor: currentTheme.border,
                          borderWidth: '1px',
                          borderStyle: 'solid'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = currentTheme.accent;
                          e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = currentTheme.border;
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        {getAllTaskTypes().map(taskType => (
                          <option key={taskType.value} value={taskType.value}>
                            {taskType.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <br />
                    <div className="grid grid-cols-[200px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                      <PriorityLabelWithTooltip htmlFor="new-task-priority" currentTheme={currentTheme} />
                      <select
                        id="new-task-priority"
                        value={newTask.priority}
                        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                        className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] focus:outline-none focus:ring-2"
                        style={{
                          minHeight: '48px',
                          backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                          color: currentTheme.text,
                          borderColor: currentTheme.border,
                          borderWidth: '1px',
                          borderStyle: 'solid'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = currentTheme.accent;
                          e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = currentTheme.border;
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        <option value="low">Düşük</option>
                        <option value="medium">Orta</option>
                        <option value="high">Yüksek</option>
                        <option value="critical">Kritik</option>
                      </select>
                    </div>
                    <br />
                    <div className="grid grid-cols-[200px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                      <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>Sorumlu</label>
                      <select
                        value={newTask.responsible_id || ''}
                        onChange={(e) => setNewTask({ ...newTask, responsible_id: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] focus:outline-none focus:ring-2"
                        style={{
                          minHeight: '48px',
                          backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                          color: currentTheme.text,
                          borderColor: currentTheme.border,
                          borderWidth: '1px',
                          borderStyle: 'solid'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = currentTheme.accent;
                          e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = currentTheme.border;
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        <option value="">Sorumlu Seçin</option>
                        {getEligibleResponsibleUsers().length > 0 ? (
                          getEligibleResponsibleUsers().map(u => <option key={u.id} value={u.id}>{u.name}</option>)
                        ) : (
                          <option value="" disabled>Uygun kullanıcı bulunamadı</option>
                        )}
                      </select>
                    </div>
                    <br />
                    <div className="grid grid-cols-[200px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                      <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>Atananlar</label>
                      <div className="rounded-lg p-3 sm:p-4" style={{
                        minHeight: '48px',
                        height: 'fit-content',
                      }}>
                        {newTask.assigned_users.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {newTask.assigned_users.map((userId) => {
                              const user = users.find(u => u.id === userId);
                              return (
                                <span
                                  key={userId}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm transition-colors"
                                  style={{
                                    backgroundColor: currentTheme.accent + '20',
                                    color: currentTheme.text
                                  }}
                                >
                                  <span className="truncate max-w-[200px]">{user?.name || 'Bilinmeyen Kullanıcı'}</span>
                                  <button
                                    type="button"
                                    aria-label="Atananı kaldır"
                                    onClick={() => {
                                      // Manuel olarak kaldırılan kullanıcıyı ref'e ekle
                                      manuallyRemovedUsersRef.current.add(userId);
                                      setNewTask({
                                        ...newTask,
                                        assigned_users: newTask.assigned_users.filter(id => id !== userId)
                                      });
                                    }}
                                    className="flex items-center justify-center rounded-full transition-colors focus:outline-none"
                                    style={{
                                      width: '16px',
                                      height: '16px',
                                      minWidth: '16px',
                                      minHeight: '16px',
                                      backgroundColor: 'transparent',
                                      color: currentTheme.textSecondary || currentTheme.text,
                                      fontSize: '12px',
                                      lineHeight: '1',
                                      padding: '0',
                                      marginLeft: '2px'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.target.style.backgroundColor = currentTheme.accent;
                                      e.target.style.color = '#ffffff';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.backgroundColor = 'transparent';
                                      e.target.style.color = currentTheme.textSecondary || currentTheme.text;
                                    }}
                                  >
                                    ✕
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}

                        <div className="relative assignee-dropdown-container">
                          <input
                            type="text"
                            placeholder="Kullanıcı atayın..."
                            value={assigneeSearch}
                            className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] focus:outline-none focus:ring-2"
                            style={{
                              minHeight: '48px',
                              backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                              color: currentTheme.text,
                              borderColor: currentTheme.border,
                              borderWidth: '1px',
                              borderStyle: 'solid'
                            }}
                            onChange={(e) => {
                              setAssigneeSearch(e.target.value);
                              setShowAssigneeDropdown(true);
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = currentTheme.accent;
                              e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                              if ((!users || users.length === 0) && user?.role !== 'observer') {
                                loadUsers();
                              }
                              setShowAssigneeDropdown(true);
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = currentTheme.border;
                              e.target.style.boxShadow = 'none';
                              setTimeout(() => setShowAssigneeDropdown(false), 200);
                            }}
                          />

                          {showAssigneeDropdown && users && users.length > 0 && (
                            <div
                              className="absolute w-full mt-1 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                              style={{
                                backgroundColor: currentTheme.tableBackground || currentTheme.background,
                                opacity: 1,
                                zIndex: 2147483647,
                                filter: 'none',
                                backdropFilter: 'none',
                                WebkitBackdropFilter: 'none',
                                mixBlendMode: 'normal',
                                isolation: 'isolate',
                                pointerEvents: 'auto',
                                border: `1px solid ${currentTheme.border}`
                              }}
                            >
                              {getEligibleAssignedUsers(newTask.responsible_id)
                                .filter(u =>
                                  u.name.toLowerCase().includes(assigneeSearch.toLowerCase()) &&
                                  !newTask.assigned_users.includes(u.id)
                                )
                                .map(u => (
                                  <div
                                    key={u.id}
                                    className="px-3 sm:px-4 py-2 sm:py-3 cursor-pointer text-[24px] sm:text-[24px] last:border-b-0 text-left"
                                    style={{
                                      backgroundColor: currentTheme.tableBackground || currentTheme.background,
                                      color: currentTheme.text,
                                      borderBottom: `1px solid ${currentTheme.border}`
                                    }}
                                    onMouseEnter={(e) => {
                                      e.target.style.backgroundColor = currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background;
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.backgroundColor = currentTheme.tableBackground || currentTheme.background;
                                    }}
                                    onClick={() => {
                                      // Eklenecek kullanıcı listesi
                                      let usersToAdd = [u.id];

                                      // Eğer seçilen kullanıcı takım lideriyse, ekibini de ekle (sorumlu hariç)
                                      if (u.role === 'team_leader') {
                                        const teamMembers = users.filter(tm =>
                                          Number(tm.leader_id) === Number(u.id) &&
                                          tm.id !== newTask.responsible_id
                                        );
                                        const teamMemberIds = teamMembers.map(tm => tm.id);
                                        console.log(`Takım lideri ${u.name} seçildi. Ekip: `, teamMembers.map(tm => tm.name));
                                        usersToAdd = [...usersToAdd, ...teamMemberIds];
                                      }

                                      // Manuel olarak eklenen kullanıcıları removedUsers'tan çıkar
                                      usersToAdd.forEach(userId => {
                                        manuallyRemovedUsersRef.current.delete(userId);
                                      });

                                      // Mevcut atananlarla birleştir ve tekrarları temizle
                                      const combinedUsers = [...new Set([...newTask.assigned_users, ...usersToAdd])];

                                      setNewTask({
                                        ...newTask,
                                        assigned_users: combinedUsers
                                      });
                                      setAssigneeSearch('');
                                      setShowAssigneeDropdown(false);
                                    }}
                                  >
                                    {u.name}
                                  </div>
                                ))}
                              {getEligibleAssignedUsers(newTask.responsible_id).filter(u =>
                                u.name.toLowerCase().includes(assigneeSearch.toLowerCase()) &&
                                !newTask.assigned_users.includes(u.id)
                              ).length === 0 && (
                                  <div
                                    className="px-3 sm:px-4 py-2 sm:py-3 text-[16px] sm:text-[24px] border-b"
                                    style={{
                                      backgroundColor: currentTheme.tableBackground || currentTheme.background,
                                      color: currentTheme.textSecondary || currentTheme.text,
                                      borderColor: currentTheme.border
                                    }}
                                  >
                                    Kullanıcı bulunamadı
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <br />
                    <div className="grid grid-cols-[200px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                      <label className="!text-[24px] sm:!text-[24px] font-medium text-left" style={{ color: currentTheme.text }}>Tarihler</label>
                      <div className="flex flex-row gap-2 sm:gap-4">
                        <div className="flex-1">
                          <label className="block !text-[24px] sm:!text-[20px] !leading-[1.1] !font-medium text-left mb-1" style={{ color: currentTheme.text }}>Başlangıç</label>
                          <input
                            type="date"
                            value={newTask.start_date}
                            onChange={(e) => setNewTask({ ...newTask, start_date: e.target.value })}
                            className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] focus:outline-none focus:ring-2"
                            style={{
                              minHeight: '48px',
                              backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                              color: currentTheme.text,
                              borderColor: currentTheme.border,
                              borderWidth: '1px',
                              borderStyle: 'solid'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = currentTheme.accent;
                              e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = currentTheme.border;
                              e.target.style.boxShadow = 'none';
                            }}
                          />
                        </div>
                        <span className="w-[20px]"></span>
                        <div className="flex-1">
                          <label className="block !text-[24px] sm:!text-[20px] !leading-[1.1] !font-medium text-left mb-1" style={{ color: currentTheme.text }}>Bitiş</label>
                          <input
                            type="date"
                            value={newTask.due_date}
                            onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                            className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] focus:outline-none focus:ring-2"
                            style={{
                              minHeight: '48px',
                              backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                              color: currentTheme.text,
                              borderColor: currentTheme.border,
                              borderWidth: '1px',
                              borderStyle: 'solid'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = currentTheme.accent;
                              e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = currentTheme.border;
                              e.target.style.boxShadow = 'none';
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <br />
                    <div className="grid grid-cols-[200px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-start">
                      <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>Dosyalar</label>
                      <div className="w-full rounded-lg p-3 sm:p-4" style={{
                        minHeight: '24px',
                        paddingTop: '10px',
                        paddingBottom: '10px',
                        paddingLeft: '5px',
                        backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                        borderColor: currentTheme.border,
                        borderWidth: '1px',
                        borderStyle: 'solid'
                      }}>
                        <input
                          type="file"
                          multiple
                          accept={[
                            'image/*',
                            '.pdf',
                            '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
                            '.zip', '.rar', '.7z',
                            '.sldprt', '.sldasm', '.slddrw',
                            '.step', '.stp', '.iges', '.igs',
                            '.x_t', '.x_b', '.stl', '.3mf',
                            '.dwg', '.dxf', '.eprt', '.easm', '.edrw'
                          ].join(',')}
                          onChange={(e) => {
                            const files = Array.from(e.target.files);
                            setNewTask({
                              ...newTask,
                              attachments: [...newTask.attachments, ...files]
                            });
                          }}
                          className="w-full !text-[24px] sm:!text-[24px] text-gray-600"
                        />
                        {newTask.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <p className="!text-[24px] font-medium text-gray-700 text-left">Seçilen Dosyalar:</p>
                            {newTask.attachments.map((file, index) => (
                              <div key={index} className="!flex !items-center !justify-between !px-2 !py-2 !bg-gray-50 !rounded !border !border-gray-200">
                                <div className="flex-1 min-w-0">
                                  <div className="!text-[24px] sm:!text-[20px] text-gray-700 text-left truncate">
                                    {file.name || 'Dosya'}
                                  </div>
                                  {file.size && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => setNewTask({
                                    ...newTask,
                                    attachments: newTask.attachments.filter((_, i) => i !== index)
                                  })}
                                  className="text-red-600 hover:text-red-800 ml-2 px-2 py-1 rounded hover:bg-red-50"
                                  title="Dosyayı kaldır"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <br />
                    <div className="grid grid-cols-[200px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-start">
                      <label className="!text-[24px] font-medium text-left" style={{ color: currentTheme.text }}>Görev Açıklaması</label>
                      <textarea
                        placeholder="Görev açıklamasını girin..."
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] focus:outline-none focus:ring-2 min-h-[120px] sm:min-h-[180px] max-h-[30vh] sm:max-h-[40vh]"
                        style={{
                          backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                          color: currentTheme.text,
                          borderColor: currentTheme.border,
                          borderWidth: '1px',
                          borderStyle: 'solid'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = currentTheme.accent;
                          e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = currentTheme.border;
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                    <br />
                    <div className="mt-4 sm:mt-6 mb-4">
                      {uploadProgress && (
                        <div className="mb-4 bg-gray-200 rounded-full h-8 overflow-hidden">
                          <div className="flex items-center justify-center h-full bg-blue-600 text-white text-sm font-medium transition-all duration-300"
                            style={{ width: `${Math.max(0, Math.min(100, uploadProgress.percent ?? 10))}%` }}
                          >
                            {typeof uploadProgress.percent === 'number' ? `${uploadProgress.percent}%` : '...'}
                          </div>
                        </div>
                      )}
                      <button
                        onClick={handleAddTask}
                        disabled={addingTask || !newTask.title}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors !text-[16px] sm:!text-[24px] font-medium"
                        style={{
                          backgroundColor: (addingTask || !newTask.title) ? `${currentTheme.border}50` : currentTheme.accent,
                          color: '#ffffff',
                          cursor: (addingTask || !newTask.title) ? 'not-allowed' : 'pointer',
                          opacity: (addingTask || !newTask.title) ? 0.6 : 1
                        }}
                        onMouseEnter={(e) => {
                          if (!addingTask && newTask.title) {
                            const hex = currentTheme.accent.replace('#', '');
                            const r = parseInt(hex.substr(0, 2), 16);
                            const g = parseInt(hex.substr(2, 2), 16);
                            const b = parseInt(hex.substr(4, 2), 16);
                            e.target.style.backgroundColor = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!addingTask && newTask.title) {
                            e.target.style.backgroundColor = currentTheme.accent;
                          }
                        }}
                      >
                        {addingTask ? (uploadProgress ? `Yükleniyor... ${uploadProgress.percent ?? 0}%` : 'Ekleniyor...') : 'Ekle'}
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          )}

          {showWeeklyGoals && createPortal(
            <div className="fixed inset-0 z-[999998]" style={{ pointerEvents: 'auto' }}>
              <div className="absolute inset-0 bg-black/60" onClick={() => setShowWeeklyGoals(false)} style={{ pointerEvents: 'auto' }} />
              <div className="relative z-10 flex min-h-full items-center justify-center p-4" style={{ pointerEvents: 'auto' }}>
                <div className="fixed z-[100260] weekly-goals-modal left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[1440px] max-h-[90vh] rounded-2xl border shadow-[0_25px_80px_rgba(0,0,0,.6)] overflow-hidden"
                  style={{
                    paddingBottom: '10px',
                    pointerEvents: 'auto',
                    backgroundColor: currentTheme.tableBackground || currentTheme.background,
                    borderColor: currentTheme.border,
                    color: currentTheme.text
                  }} onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between px-5 py-3 border-b relative"
                    style={{
                      backgroundColor: currentTheme.tableHeader || currentTheme.border,
                      borderColor: currentTheme.border
                    }}>
                    <div className="flex-1">
                      {weeklyUserId && Array.isArray(users) ? (
                        <div className="text-sm" style={{ paddingLeft: '10px', color: currentTheme.text }}>
                          {(() => {
                            const targetUser = users.find(u => u.id === weeklyUserId);
                            return targetUser ? (
                              <>
                                {targetUser.name} <br /> {targetUser.email}
                              </>
                            ) : (
                              'Bilinmeyen Kullanıcı'
                            )
                          })()}
                        </div>
                      ) : (
                        <div className="text-sm" style={{ paddingLeft: '10px', color: currentTheme.text }}>
                          {user?.name} <br /> {user?.email}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-center">
                      <h3 className="!text-[24px] font-semibold" style={{ color: currentTheme.text }}>Haftalık Hedefler</h3>
                    </div>
                    <div className="flex-1 flex justify-end">
                      <div className="ml-auto flex items-center gap-4 text-sm text-[24px]" style={{ paddingRight: '20px', color: currentTheme.text }}>
                        <span>{combinedLocks.targets_locked ? 'Hedef kilitli' : 'Hedef açık'} • {combinedLocks.actuals_locked ? 'Gerçekleşme kilitli' : 'Gerçekleşme açık'}</span>
                        <span
                          className="inline-flex items-center justify-center w-6 h-6 rounded-full cursor-default ml-2 transition-colors"
                          style={{
                            backgroundColor: `${currentTheme.border}30`,
                            color: currentTheme.text
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = `${currentTheme.border}50`}
                          onMouseLeave={(e) => e.target.style.backgroundColor = `${currentTheme.border}30`}
                          title={
                            'Kural: \nGelecek haftalar tamamen açık. Geçmiş haftalar tamamen kapalı. \nHer hafta Pazartesi 13:30\'a kadar içinde bulunulan haftanın hedefleri açık, 13:30\'dan sonra hedefler kapalı. \nGerçekleşme alanı sürekli açık.'
                          }
                        >
                          ℹ️
                        </span>
                      </div>
                      <button onClick={() => setShowWeeklyGoals(false)} className="rounded px-2 py-1 transition-colors"
                        style={{
                          color: currentTheme.text,
                          backgroundColor: 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = `${currentTheme.border}30`;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'transparent';
                        }}>
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="p-6 space-y-5 overflow-y-auto no-scrollbar" style={{ maxHeight: 'calc(90vh - 80px)', paddingTop: '10px' }}>
                    <div className="flex items-center gap-3 flex-wrap" style={{ paddingBottom: '10px' }}>
                      <span className="w-[10px]"></span>
                      <button className="rounded px-3 py-1 transition-colors"
                        style={{
                          backgroundColor: currentTheme.accent,
                          color: '#ffffff'
                        }}
                        onMouseEnter={(e) => {
                          const hex = currentTheme.accent.replace('#', '');
                          const r = parseInt(hex.substr(0, 2), 16);
                          const g = parseInt(hex.substr(2, 2), 16);
                          const b = parseInt(hex.substr(4, 2), 16);
                          e.target.style.backgroundColor = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = currentTheme.accent;
                        }}
                        onClick={() => {
                          const base = weeklyWeekStart ? new Date(weeklyWeekStart) : getMonday(); base.setDate(base.getDate() - 7);
                          loadWeeklyGoals(fmtYMD(getMonday(base)));
                        }}>◀ Önceki</button><span className="w-[10px]"></span>
                      <div>
                        <input type="date" className="ml-2 rounded px-2 py-1 text-[24px]"
                          style={{
                            backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                            color: currentTheme.text,
                            borderColor: currentTheme.border,
                            borderWidth: '1px',
                            borderStyle: 'solid'
                          }}
                          value={weeklyWeekStart} onChange={(e) => loadWeeklyGoals(e.target.value)} />
                      </div>
                      <span className="w-[10px]"></span>
                      <button className="rounded px-3 py-1 transition-colors"
                        style={{
                          backgroundColor: currentTheme.accent,
                          color: '#ffffff'
                        }}
                        onMouseEnter={(e) => {
                          const hex = currentTheme.accent.replace('#', '');
                          const r = parseInt(hex.substr(0, 2), 16);
                          const g = parseInt(hex.substr(2, 2), 16);
                          const b = parseInt(hex.substr(4, 2), 16);
                          e.target.style.backgroundColor = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = currentTheme.accent;
                        }}
                        onClick={() => { const base = weeklyWeekStart ? new Date(weeklyWeekStart) : getMonday(); base.setDate(base.getDate() + 7); loadWeeklyGoals(fmtYMD(getMonday(base))); }}>Sonraki ▶</button>
                      <div className="text-sm text-[24px]" style={{ paddingLeft: '30px', color: currentTheme.text }}>
                        {(() => { const cur = weeklyWeekStart ? new Date(weeklyWeekStart) : getMonday(); const next = new Date(cur); next.setDate(next.getDate() + 7); return `Bu hafta: ${isoWeekNumber(cur)} • Gelecek hafta: ${isoWeekNumber(next)}`; })()}
                      </div>
                      <div className="ml-auto flex items-center gap-4 text-sm text-[24px]" style={{ color: currentTheme.text }}>
                        <label className="whitespace-nowrap text-[24px]" style={{ color: currentTheme.text }}>İzin (dk)</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          step="5"
                          min="0"
                          max={WEEKLY_BASE_MINUTES}
                          value={weeklyLeaveMinutesInput}
                          onChange={handleWeeklyLeaveMinutesChange}
                          disabled={user?.role === 'observer'}
                          className="w-28 text-center rounded px-3 py-1 text-[22px]"
                          placeholder="0"
                          title="Planlanan hafta için izinli olacağınız toplam dakika"
                          style={{
                            width: '70px',
                            height: '40px',
                            textAlign: 'center',
                            marginLeft: '10px',
                            backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                            color: currentTheme.text,
                            borderColor: currentTheme.border,
                            borderWidth: '1px',
                            borderStyle: 'solid'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = currentTheme.accent;
                            e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = currentTheme.border;
                            e.target.style.boxShadow = 'none';
                            handleWeeklyLeaveMinutesBlur(e);
                          }}
                        />
                        <label className="whitespace-nowrap text-[24px]" style={{ marginLeft: '20px', color: currentTheme.text }}>Mesai (dk)</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          step="5"
                          min="0"
                          value={weeklyOvertimeMinutesInput}
                          onChange={handleWeeklyOvertimeMinutesChange}
                          disabled={user?.role === 'observer'}
                          className="w-28 text-center rounded px-3 py-1 text-[22px]"
                          placeholder="0"
                          title="Mesaiye kalma durumunda 2700 dakikayı aşmak için mesai süresi"
                          style={{
                            width: '70px',
                            height: '40px',
                            textAlign: 'center',
                            marginLeft: '10px',
                            backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                            color: currentTheme.text,
                            borderColor: currentTheme.border,
                            borderWidth: '1px',
                            borderStyle: 'solid'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = currentTheme.accent;
                            e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = currentTheme.border;
                            e.target.style.boxShadow = 'none';
                            handleWeeklyOvertimeMinutesBlur(e);
                          }}
                        />
                      </div>
                    </div>
                    <div className="mt-3 border-t" style={{ borderColor: currentTheme.border }} />
                    <div className="font-medium mb-2 text-[32px] text-center" style={{ color: currentTheme.text }}>Planlı İşler</div>
                    <div className="mt-3 border-t" style={{ borderColor: currentTheme.border }} />
                    <div className="rounded p-3" style={{ marginLeft: '2px', marginRight: '2px', backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: '8px 8px' }}>
                          <thead>
                            <tr style={{ backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
                              <th className="px-2 py-2 text-left text-[14px]" style={{ width: '20%', color: currentTheme.text }}>Başlık</th>
                              <th className="px-2 py-2 text-left text-[14px]" style={{ width: '30%', color: currentTheme.text }}>Aksiyon Planları</th>
                              <th className="px-2 py-2 text-center text-[14px]" style={{ width: '5%', color: currentTheme.text }}>Hedef(dk)</th>
                              <th className="px-2 py-2 text-center text-[14px]" style={{ width: '5%', color: currentTheme.text }}>Hedef(%)</th>
                              <th className="px-2 py-2 text-center text-[14px]" style={{ width: '5%', color: currentTheme.text }}>Gerçekleşme(dk)</th>
                              <th className="px-2 py-2 text-center text-[14px]" style={{ width: '10%', color: currentTheme.text }}>Gerçekleşme(%)</th>
                              <th className="px-2 py-2 text-center text-[14px]" style={{ width: '5%', color: currentTheme.text }}>Tamamlandı</th>
                              <th className="px-2 py-2 text-center text-[14px]" style={{ width: '10%', color: currentTheme.text }}>Açıklama</th>
                              <th className="px-2 py-2 text-center text-[14px]" style={{ width: '5%', color: currentTheme.text }}>Sil</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(weeklyGoals.items || []).filter(x => !x.is_unplanned).map((row, idx) => {
                              const lockedTargets = combinedLocks.targets_locked && user?.role !== 'admin';
                              const lockedActuals = combinedLocks.actuals_locked && user?.role !== 'admin';
                              const t = Math.max(0, Number(row.target_minutes || 0));
                              const a = Math.max(0, Number(row.actual_minutes || 0));
                              const capacity = Math.max(0, weeklyLive.availableMinutes || 0);
                              const w = capacity > 0 ? (t / capacity) * 100 : 0; // satır ağırlığı
                              const isCompleted = row.is_completed === true;

                              // Ceza hesaplaması ile verimlilik
                              let effectiveActual = a;
                              if (a === 0) {
                                // Hiç çalışılmamışsa verimlilik 0
                                effectiveActual = 0;
                              } else if (isCompleted) {
                                // İş bitmiş, ne harcanmışsa o geçerli
                                effectiveActual = a;
                              } else {
                                if (a > t) {
                                  // Ceza: (a - t) + 0.1*t
                                  const pen = (a - t) + (0.1 * t);
                                  effectiveActual = t + pen;
                                } else if (a === t) {
                                  // Ceza: 0.1*t
                                  effectiveActual = t + (0.1 * t);
                                } else {
                                  // a < t - eksik süre için ceza
                                  const shortage = Math.max(0, t - a);
                                  const pen = shortage + (0.1 * t);
                                  effectiveActual = t + pen;
                                }
                              }

                              const eff = effectiveActual > 0 ? (t / effectiveActual) : 0; // ceza ile verimlilik
                              const rate = (eff * w).toFixed(1); // satırın performans katkısı (%)
                              return (
                                <tr key={row.id || `p-${idx}`} style={{
                                  backgroundColor: currentTheme.tableBackground || currentTheme.background
                                }}>
                                  <td className="px-3 py-2 align-middle" style={{ verticalAlign: 'top' }}>
                                    <textarea
                                      disabled={lockedTargets || user?.role === 'observer'}
                                      defaultValue={row.title || ''}
                                      key={`title-${row.id || weeklyGoals.items.indexOf(row)}`}
                                      ref={(el) => {
                                        if (el) {
                                          const key = getTextInputKey(row, 'title');
                                          textInputRefs.current[key] = el;
                                        }
                                      }}
                                      onChange={() => {
                                        // Uncontrolled component - no state update, no re-render
                                      }}
                                      onBlur={e => {
                                        // Save to main state on blur
                                        saveTextInputToState(row, 'title', e.target.value);
                                        // Update border styles
                                        e.target.style.borderColor = currentTheme.border;
                                        e.target.style.boxShadow = 'none';
                                      }}
                                      className="w-full rounded px-3 py-2 h-[60px] text-[16px] resize-none"
                                      placeholder="Başlık girin..."
                                      style={{
                                        overflow: 'auto',
                                        wordWrap: 'break-word',
                                        backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                        color: currentTheme.text,
                                        borderColor: currentTheme.border,
                                        borderWidth: '1px',
                                        borderStyle: 'solid'
                                      }}
                                      onFocus={(e) => {
                                        e.target.style.borderColor = currentTheme.accent;
                                        e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                      }}
                                    />
                                  </td>
                                  <td className="px-3 py-2 align-middle" style={{ verticalAlign: 'top' }}>
                                    <textarea
                                      disabled={lockedTargets || user?.role === 'observer'}
                                      defaultValue={row.action_plan || ''}
                                      key={`action_plan-${row.id || weeklyGoals.items.indexOf(row)}`}
                                      ref={(el) => {
                                        if (el) {
                                          const key = getTextInputKey(row, 'action_plan');
                                          textInputRefs.current[key] = el;
                                        }
                                      }}
                                      onChange={() => {
                                        // Uncontrolled component - no state update, no re-render
                                      }}
                                      onBlur={e => {
                                        // Save to main state on blur
                                        saveTextInputToState(row, 'action_plan', e.target.value);
                                        // Update border styles
                                        e.target.style.borderColor = currentTheme.border;
                                        e.target.style.boxShadow = 'none';
                                      }}
                                      className="w-full rounded px-3 py-2 min-h-[60px] min-w-[250px] text-[16px] resize-y"
                                      placeholder="Aksiyon planı girin..."
                                      style={{
                                        backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                        color: currentTheme.text,
                                        borderColor: currentTheme.border,
                                        borderWidth: '1px',
                                        borderStyle: 'solid'
                                      }}
                                      onFocus={(e) => {
                                        e.target.style.borderColor = currentTheme.accent;
                                        e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                      }}
                                    />
                                  </td>
                                  <td className="px-3 py-2 align-middle text-center" style={{ verticalAlign: 'top', width: '10px' }}>
                                    <input type="number" inputMode="numeric" step="1" min="0" disabled={lockedTargets || user?.role === 'observer'} value={row.target_minutes || 0}
                                      onChange={e => {
                                        // Use debounce for number inputs to reduce re-renders
                                        updateNumberInput(row, 'target_minutes', e.target.value);
                                      }}
                                      className="w-24 text-center rounded px-2 py-2 h-10 text-[24px]"
                                      style={{
                                        width: '60px',
                                        height: '60px',
                                        textAlign: 'center',
                                        backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                        color: currentTheme.text,
                                        borderColor: currentTheme.border,
                                        borderWidth: '1px',
                                        borderStyle: 'solid'
                                      }}
                                      onFocus={(e) => {
                                        if (!lockedTargets && user?.role !== 'observer') {
                                          e.target.style.borderColor = currentTheme.accent;
                                          e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                        }
                                      }}
                                      onBlur={(e) => {
                                        e.target.style.borderColor = currentTheme.border;
                                        e.target.style.boxShadow = 'none';
                                      }}
                                    />
                                  </td>
                                  <td className="px-3 py-2 align-middle text-center" style={{ verticalAlign: 'top', width: '10px' }}>
                                    <input type="number" inputMode="numeric" step="1" min="0" disabled={true} value={capacity > 0 ? ((t / capacity) * 100).toFixed(1) : '0.0'}
                                      className="w-24 text-center rounded px-2 py-2 h-10 text-[24px]"
                                      style={{
                                        width: '60px',
                                        height: '60px',
                                        textAlign: 'center',
                                        backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                        color: currentTheme.text,
                                        borderColor: currentTheme.border,
                                        borderWidth: '1px',
                                        borderStyle: 'solid'
                                      }}
                                    />
                                  </td>
                                  <td className="px-3 py-2 align-middle text-center" style={{ verticalAlign: 'top', width: '10px' }}>
                                    <input type="number" inputMode="numeric" step="1" min="0" disabled={lockedActuals || user?.role === 'observer'} value={row.actual_minutes || 0}
                                      onChange={e => {
                                        // Use debounce for number inputs to reduce re-renders
                                        updateNumberInput(row, 'actual_minutes', e.target.value);
                                      }}
                                      className="w-24 text-center rounded px-2 py-2 h-10 text-[24px]"
                                      style={{
                                        width: '60px',
                                        height: '60px',
                                        textAlign: 'center',
                                        backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                        color: currentTheme.text,
                                        borderColor: currentTheme.border,
                                        borderWidth: '1px',
                                        borderStyle: 'solid'
                                      }}
                                      onFocus={(e) => {
                                        if (!lockedActuals && user?.role !== 'observer') {
                                          e.target.style.borderColor = currentTheme.accent;
                                          e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                        }
                                      }}
                                      onBlur={(e) => {
                                        e.target.style.borderColor = currentTheme.border;
                                        e.target.style.boxShadow = 'none';
                                      }}
                                    />
                                  </td>
                                  <td className="px-3 py-2 align-middle text-center" style={{ verticalAlign: 'top', width: '10px' }}>
                                    <input type="number" inputMode="numeric" step="1" min="0" disabled={true} value={rate}
                                      className="w-24 text-center rounded px-2 py-2 h-10 text-[24px]"
                                      style={{
                                        width: '60px',
                                        height: '60px',
                                        textAlign: 'center',
                                        backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                        color: currentTheme.text,
                                        borderColor: currentTheme.border,
                                        borderWidth: '1px',
                                        borderStyle: 'solid'
                                      }}
                                    />
                                  </td>
                                  <td className="px-3 py-2 align-middle text-center" style={{ verticalAlign: 'top' }}>
                                    <input
                                      type="checkbox"
                                      checked={!!row.is_completed}
                                      disabled={lockedActuals || user?.role === 'observer'}
                                      onChange={e => {
                                        const items = [...weeklyGoals.items];
                                        items.find((r, i) => i === weeklyGoals.items.indexOf(row)).is_completed = e.target.checked;
                                        setWeeklyGoals({ ...weeklyGoals, items });
                                      }}
                                      className="w-6 h-6 cursor-pointer"
                                      style={{ width: '60px', height: '60px', cursor: 'pointer' }}
                                      title="İş tamamlandı mı?"
                                    />
                                  </td>
                                  <td className="px-3 py-2 align-middle text-center align-middle">
                                    <button
                                      className="inline-flex items-center justify-center text-blue-300 hover:text-blue-200 text-[24px] transition-colors buttonHoverEffect"
                                      style={{
                                        backgroundColor: row.description?.trim() ? 'rgba(237, 241, 21, 0.62)' : 'rgba(8, 87, 234, 0.4)',
                                        width: '60px',
                                        height: '60px',
                                        borderRadius: '9999px'
                                      }}
                                      onClick={() => {
                                        const index = weeklyGoals.items.indexOf(row);
                                        setSelectedGoalIndex(index);
                                        setGoalDescription(row.description || '');
                                        setShowGoalDescription(true);
                                        // Set ref value after modal opens
                                        setTimeout(() => {
                                          if (goalDescriptionRef.current) {
                                            goalDescriptionRef.current.value = row.description || '';
                                          }
                                        }, 0);
                                      }}
                                      title="Açıklama Ekle/Düzenle"
                                    >
                                      🔍
                                    </button>
                                  </td>
                                  <td className="px-3 py-2 align-middle text-center align-middle">
                                    {(() => {
                                      const canDelete = (user?.role !== 'observer') && (!lockedTargets || user?.role === 'admin');
                                      return (
                                        <button
                                          disabled={!canDelete}
                                          className={`inline-flex items-center justify-center text-[24px] buttonHoverEffect ${canDelete ? 'text-blue-300 hover:text-blue-200' : 'text-gray-400'}`}
                                          style={{ width: '60px', height: '60px', borderRadius: '9999px', backgroundColor: canDelete ? 'rgba(241, 91, 21, 0.62)' : 'rgba(148,163,184,0.35)', cursor: canDelete ? 'pointer' : 'default', pointerEvents: canDelete ? 'auto' : 'none' }}
                                          onClick={() => {
                                            if (!canDelete) return;
                                            const items = weeklyGoals.items.filter(x => x !== row);
                                            setWeeklyGoals({ ...weeklyGoals, items });
                                          }}
                                        >
                                          🗑️
                                        </button>
                                      );
                                    })()}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {user?.role !== 'observer' && (
                        <div className="mt-2 flex gap-2" style={{ paddingBottom: '10px' }}>
                          <button className="flex-1 rounded px-4 py-2 text-[24px] transition-colors"
                            disabled={combinedLocks.targets_locked && user?.role !== 'admin'}
                            style={{
                              backgroundColor: (combinedLocks.targets_locked && user?.role !== 'admin') ? `${currentTheme.border}80` : currentTheme.accent,
                              color: (combinedLocks.targets_locked && user?.role !== 'admin') ? currentTheme.textSecondary || currentTheme.text : '#ffffff',
                              cursor: (combinedLocks.targets_locked && user?.role !== 'admin') ? 'not-allowed' : 'pointer'
                            }}
                            onMouseEnter={(e) => {
                              if (!(combinedLocks.targets_locked && user?.role !== 'admin')) {
                                const hex = currentTheme.accent.replace('#', '');
                                const r = parseInt(hex.substr(0, 2), 16);
                                const g = parseInt(hex.substr(2, 2), 16);
                                const b = parseInt(hex.substr(4, 2), 16);
                                e.target.style.backgroundColor = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!(combinedLocks.targets_locked && user?.role !== 'admin')) {
                                e.target.style.backgroundColor = currentTheme.accent;
                              } else {
                                e.target.style.backgroundColor = `${currentTheme.border}80`;
                              }
                            }}
                            onClick={() => { setWeeklyGoals({ ...weeklyGoals, items: [...weeklyGoals.items, { title: '', action_plan: '', target_minutes: 0, weight_percent: 0, actual_minutes: 0, is_unplanned: false, is_completed: false }] }); }}
                          >
                            Ekle</button>
                          <button
                            className="flex-1 rounded px-4 py-2 text-[24px] transition-colors"
                            disabled={(combinedLocks.targets_locked && user?.role !== 'admin') || transferButtonText === 'Aktarılıyor...'}
                            style={{
                              backgroundColor: ((combinedLocks.targets_locked && user?.role !== 'admin') || transferButtonText === 'Aktarılıyor...') ? `${currentTheme.border}80` : currentTheme.accent,
                              color: ((combinedLocks.targets_locked && user?.role !== 'admin') || transferButtonText === 'Aktarılıyor...') ? currentTheme.textSecondary || currentTheme.text : '#ffffff',
                              cursor: ((combinedLocks.targets_locked && user?.role !== 'admin') || transferButtonText === 'Aktarılıyor...') ? 'not-allowed' : 'pointer'
                            }}
                            onMouseEnter={(e) => {
                              if (!(combinedLocks.targets_locked && user?.role !== 'admin') && transferButtonText !== 'Aktarılıyor...') {
                                const hex = currentTheme.accent.replace('#', '');
                                const r = parseInt(hex.substr(0, 2), 16);
                                const g = parseInt(hex.substr(2, 2), 16);
                                const b = parseInt(hex.substr(4, 2), 16);
                                e.target.style.backgroundColor = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!(combinedLocks.targets_locked && user?.role !== 'admin') && transferButtonText !== 'Aktarılıyor...') {
                                e.target.style.backgroundColor = currentTheme.accent;
                              } else {
                                e.target.style.backgroundColor = `${currentTheme.border}80`;
                              }
                            }}
                            onClick={transferIncompleteTasksFromPreviousWeek}
                            title="Önceki haftadan tamamlanmamış (Tamamlandı olarak işaretlenmemiş) planlı işleri mevcut haftaya aktarır. Aktarılan işlerin gerçekleşme süreleri sıfırlanır ve tamamlanmamış olarak işaretlenir."
                          >
                            {transferButtonText}</button>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 border-t" style={{ borderColor: currentTheme.border }} />
                    <div className="font-medium mb-2 text-[32px] text-center" style={{ color: currentTheme.text }}>Plana Dahil Olmayan İşler</div>
                    <div className="mt-3 border-t" style={{ borderColor: currentTheme.border }} />
                    <div className="rounded p-3" style={{ marginLeft: '2px', marginRight: '2px', backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: '8px 6px' }}>
                          <thead>
                            <tr style={{ backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
                              <th className="px-2 py-2 text-left text-[14px]" colSpan="2" style={{ width: '30%', color: currentTheme.text }}>Başlık</th>
                              <th className="px-2 py-2 text-left text-[14px]" colSpan="3" style={{ width: '40%', color: currentTheme.text }}>İş Ayrıntısı</th>
                              <th className="px-2 py-2 text-center text-[14px]" style={{ width: '10%', color: currentTheme.text }}>Süre(dk)</th>
                              <th className="px-2 py-2 text-center text-[14px]" style={{ width: '5%', color: currentTheme.text }}>Ağırlık(%)</th>
                              <th className="px-2 py-2 text-center text-[14px]" style={{ width: '10%', color: currentTheme.text }}>Açıklama</th>
                              <th className="px-2 py-2 text-center text-[14px]" style={{ width: '5%', color: currentTheme.text }}>Sil</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(weeklyGoals.items || []).filter(x => x.is_unplanned).map((row, idx) => {
                              const capacity = Math.max(0, weeklyLive.availableMinutes || 0);
                              const a = Math.max(0, Number(row.actual_minutes || 0));
                              const weightPercent = capacity > 0 ? (a / capacity) * 100 : 0;
                              return (
                                <tr key={row.id || `u-${idx}`} style={{
                                  backgroundColor: currentTheme.tableBackground || currentTheme.background
                                }}>
                                  <td className="px-3 py-2 align-top" colSpan="2" style={{ verticalAlign: 'top' }}>
                                    <textarea
                                      disabled={(combinedLocks.actuals_locked && user?.role !== 'admin') || user?.role === 'observer'}
                                      defaultValue={row.title || ''}
                                      key={`title-unplanned-${row.id || weeklyGoals.items.indexOf(row)}`}
                                      ref={(el) => {
                                        if (el) {
                                          const key = getTextInputKey(row, 'title');
                                          textInputRefs.current[key] = el;
                                        }
                                      }}
                                      onChange={() => {
                                        // Uncontrolled component - no state update, no re-render
                                      }}
                                      onBlur={e => {
                                        // Save to main state on blur
                                        saveTextInputToState(row, 'title', e.target.value);
                                        // Update border styles
                                        e.target.style.borderColor = currentTheme.border;
                                        e.target.style.boxShadow = 'none';
                                      }}
                                      className="w-full rounded px-3 py-2 h-[60px] text-[16px] resize-none"
                                      style={{
                                        overflow: 'auto',
                                        wordWrap: 'break-word',
                                        backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                        color: currentTheme.text,
                                        borderColor: currentTheme.border,
                                        borderWidth: '1px',
                                        borderStyle: 'solid'
                                      }}
                                      placeholder="Başlık girin..."
                                      onFocus={(e) => {
                                        if (!(combinedLocks.actuals_locked && user?.role !== 'admin') && user?.role !== 'observer') {
                                          e.target.style.borderColor = currentTheme.accent;
                                          e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                        }
                                      }}
                                    />
                                  </td>
                                  <td className="px-3 py-2 align-top" colSpan="3" style={{ verticalAlign: 'top' }}>
                                    <textarea
                                      disabled={(combinedLocks.actuals_locked && user?.role !== 'admin') || user?.role === 'observer'}
                                      defaultValue={row.action_plan || ''}
                                      key={`action_plan-unplanned-${row.id || weeklyGoals.items.indexOf(row)}`}
                                      ref={(el) => {
                                        if (el) {
                                          const key = getTextInputKey(row, 'action_plan');
                                          textInputRefs.current[key] = el;
                                        }
                                      }}
                                      onChange={() => {
                                        // Uncontrolled component - no state update, no re-render
                                      }}
                                      onBlur={e => {
                                        // Save to main state on blur
                                        saveTextInputToState(row, 'action_plan', e.target.value);
                                        // Update border styles
                                        e.target.style.borderColor = currentTheme.border;
                                        e.target.style.boxShadow = 'none';
                                      }}
                                      className="w-full rounded px-3 py-2 h-[60px] text-[16px] resize-none"
                                      style={{
                                        overflow: 'auto',
                                        wordWrap: 'break-word',
                                        backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                        color: currentTheme.text,
                                        borderColor: currentTheme.border,
                                        borderWidth: '1px',
                                        borderStyle: 'solid'
                                      }}
                                      placeholder="İş ayrıntısı girin..."
                                      onFocus={(e) => {
                                        if (!(combinedLocks.actuals_locked && user?.role !== 'admin') && user?.role !== 'observer') {
                                          e.target.style.borderColor = currentTheme.accent;
                                          e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                        }
                                      }}
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-center align-top">
                                    <input type="number" disabled={(combinedLocks.actuals_locked && user?.role !== 'admin') || user?.role === 'observer'} value={row.actual_minutes || 0}
                                      onChange={e => {
                                        // Use debounce for number inputs to reduce re-renders
                                        updateNumberInput(row, 'actual_minutes', e.target.value);
                                      }}
                                      className="w-24 text-center rounded px-2 py-2 h-10 text-[24px]"
                                      style={{
                                        width: '60px',
                                        height: '60px',
                                        textAlign: 'center',
                                        backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                        color: currentTheme.text,
                                        borderColor: currentTheme.border,
                                        borderWidth: '1px',
                                        borderStyle: 'solid'
                                      }}
                                      onFocus={(e) => {
                                        if (!(combinedLocks.actuals_locked && user?.role !== 'admin') && user?.role !== 'observer') {
                                          e.target.style.borderColor = currentTheme.accent;
                                          e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                        }
                                      }}
                                      onBlur={(e) => {
                                        e.target.style.borderColor = currentTheme.border;
                                        e.target.style.boxShadow = 'none';
                                      }}
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-center align-top">
                                    <input type="number" inputMode="numeric" step="1" min="0" disabled={true} value={weightPercent.toFixed(1)}
                                      className="w-24 text-center rounded px-2 py-2 h-10 text-[24px]"
                                      style={{
                                        width: '60px',
                                        height: '60px',
                                        textAlign: 'center',
                                        backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                        color: currentTheme.text,
                                        borderColor: currentTheme.border,
                                        borderWidth: '1px',
                                        borderStyle: 'solid'
                                      }}
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-center align-top">
                                    <button
                                      className="inline-flex items-center justify-center text-blue-300 hover:text-blue-200 text-[18px] transition-colors buttonHoverEffect"
                                      style={{
                                        backgroundColor: row.description?.trim() ? 'rgba(237, 241, 21, 0.62)' : 'rgba(8, 87, 234, 0.4)',
                                        width: '60px',
                                        height: '60px',
                                        borderRadius: '9999px'
                                      }}
                                      onClick={() => {
                                        const index = weeklyGoals.items.indexOf(row);
                                        setSelectedGoalIndex(index);
                                        setGoalDescription(row.description || '');
                                        setShowGoalDescription(true);
                                        // Set ref value after modal opens
                                        setTimeout(() => {
                                          if (goalDescriptionRef.current) {
                                            goalDescriptionRef.current.value = row.description || '';
                                          }
                                        }, 0);
                                      }}
                                      title="Açıklama Ekle/Düzenle"
                                    >
                                      🔍
                                    </button>
                                  </td>
                                  <td className="px-3 py-2 text-center align-top">
                                    {(() => {
                                      const canDelete = (!combinedLocks.actuals_locked || user?.role === 'admin') && user?.role !== 'observer';
                                      return (
                                        <button
                                          disabled={!canDelete}
                                          className={`inline-flex items-center justify-center text-[24px] buttonHoverEffect ${canDelete ? 'text-blue-300 hover:text-blue-200' : 'text-gray-400'}`}
                                          style={{ width: '60px', height: '60px', borderRadius: '9999px', backgroundColor: canDelete ? 'rgba(241, 91, 21, 0.62)' : 'rgba(148,163,184,0.35)', cursor: canDelete ? 'pointer' : 'default', pointerEvents: canDelete ? 'auto' : 'none' }}
                                          onClick={() => { if (!canDelete) return; const items = weeklyGoals.items.filter(x => x !== row); setWeeklyGoals({ ...weeklyGoals, items }); }}>
                                          🗑️
                                        </button>
                                      );
                                    })()}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {user?.role !== 'observer' && (
                        <div className="mt-2" style={{ paddingBottom: '10px' }}>
                          <button className="w-full rounded px-4 py-2 text-[24px] transition-colors"
                            disabled={combinedLocks.actuals_locked && user?.role !== 'admin'}
                            style={{
                              backgroundColor: (combinedLocks.actuals_locked && user?.role !== 'admin') ? `${currentTheme.border}80` : currentTheme.accent,
                              color: (combinedLocks.actuals_locked && user?.role !== 'admin') ? currentTheme.textSecondary || currentTheme.text : '#ffffff',
                              cursor: (combinedLocks.actuals_locked && user?.role !== 'admin') ? 'not-allowed' : 'pointer'
                            }}
                            onMouseEnter={(e) => {
                              if (!(combinedLocks.actuals_locked && user?.role !== 'admin')) {
                                const hex = currentTheme.accent.replace('#', '');
                                const r = parseInt(hex.substr(0, 2), 16);
                                const g = parseInt(hex.substr(2, 2), 16);
                                const b = parseInt(hex.substr(4, 2), 16);
                                e.target.style.backgroundColor = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!(combinedLocks.actuals_locked && user?.role !== 'admin')) {
                                e.target.style.backgroundColor = currentTheme.accent;
                              } else {
                                e.target.style.backgroundColor = `${currentTheme.border}80`;
                              }
                            }}
                            onClick={() => { setWeeklyGoals({ ...weeklyGoals, items: [...weeklyGoals.items, { title: '', action_plan: '', actual_minutes: 0, is_unplanned: true, is_completed: false }] }); }}
                          >
                            Ekle</button>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 border-t" style={{ borderColor: currentTheme.border }} />
                    <div className="font-semibold text-[32px] text-center" style={{ color: currentTheme.text }}>Hedef Ayrıntısı</div>
                    <div className="mt-3 border-t" style={{ borderColor: currentTheme.border }} />
                    <div className="mt-6 rounded p-8" style={{ paddingLeft: '10px', paddingRight: '10px', backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
                      {(() => {
                        const items = Array.isArray(weeklyGoals.items) ? weeklyGoals.items : [];
                        const plannedItems = items.filter(x => !x.is_unplanned);
                        const unplannedItems = items.filter(x => x.is_unplanned);
                        const plannedCount = plannedItems.length;
                        const unplannedCount = unplannedItems.length;
                        const totalCount = items.length;
                        const remainingTime = Math.max(0, weeklyLive.availableMinutes - weeklyLive.totalActual);

                        const bd = weeklyLive.breakdown || {};
                        const p1 = Number(((bd.PenaltyP1 || 0) * 100).toFixed(2));
                        const peasa = Number(((bd.PenaltyEASA || 0) * 100).toFixed(2));
                        const bonus = Number(((bd.BonusB || 0) * 100).toFixed(2));
                        const incCap = Number(((bd.IncompleteCapPenaltyRaw || 0) * 100).toFixed(2));
                        const overtimeBonus = Number(weeklyLive.overtimeBonusPercent || 0);
                        const overtimeUsed = Number(weeklyLive.overtimeUsed || 0);

                        // Toplam cezalar ve bonuslar
                        const totalPenalties = p1 + peasa + incCap;
                        const totalBonuses = bonus + overtimeBonus;
                        const net = totalBonuses - totalPenalties;

                        const tip = `Kesinti/Bonus Detayı\n\n🔴 CEZALAR:\nAçık Cezası (P1): -${p1}%\nKullanılmayan Süre Cezası (EASA): -${peasa}%\nTamamlanmama Cezası: -${incCap}%\n\n🟢 BONUSLAR:\nHız/Tasarruf Bonusu: +${bonus}%\nMesai Bonusu: +${overtimeBonus}% (${overtimeUsed} dk mesai, 1.5x çarpan)\n\n📊 TOPLAM:\nCezalar: -${totalPenalties.toFixed(2)}%\nBonuslar: +${totalBonuses.toFixed(2)}%\nNet: ${net >= 0 ? '+' : ''}${net.toFixed(2)}%\n\nPerformans Sonucu: ${weeklyLive.finalScore}%`;

                        return (
                          <div className="grid grid-cols-[5%_13%_20%_13%_20%_13%_15%_5%] gap-x-8 gap-y-3 text-[20px] items-center">
                            <div className="flex flex-col gap-3"></div>
                            {/* İlk Sütun - Label'lar */}
                            <div className="flex flex-col gap-3">
                              <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>İzin Süresi:</div>
                              <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>Mesai Süresi:</div>
                              <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>Kullanılabilir Süre:</div>
                              <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>Planlı Süre:</div>
                              <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>Plandışı Süre:</div>
                            </div>

                            {/* İkinci Sütun - Değerler (sola yaslı) */}
                            <div className="flex flex-col gap-3">
                              <div className="font-semibold whitespace-nowrap text-left" style={{ color: currentTheme.text }}>{weeklyLive.leaveMinutes} dk</div>
                              <div className="font-semibold whitespace-nowrap text-left" style={{ color: currentTheme.text }}>{weeklyLive.overtimeMinutes} dk</div>
                              <div className="font-semibold whitespace-nowrap text-left" style={{ color: currentTheme.text }}>{weeklyLive.availableMinutes} dk</div>
                              <div className="font-semibold whitespace-nowrap text-left" style={{ color: currentTheme.text }}>{weeklyLive.totalTarget > 0 ? `${weeklyLive.totalTarget} dk` : '0 dk'}</div>
                              <div className="font-semibold whitespace-nowrap text-left" style={{ color: currentTheme.text }}>{weeklyLive.unplannedMinutes} dk</div>
                            </div>

                            {/* Üçüncü Sütun - Label'lar */}
                            <div className="flex flex-col gap-3 ml-4">
                              <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>Kullanılan Süre:</div>
                              <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>Kalan Süre:</div>
                              <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>Planlı İş:</div>
                              <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>Plandışı İş:</div>
                              <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>Toplam İş:</div>
                            </div>

                            {/* Dördüncü Sütun - Değerler (sola yaslı) */}
                            <div className="flex flex-col gap-3">
                              <div className="font-semibold whitespace-nowrap text-left" style={{ color: currentTheme.text }}>{weeklyLive.totalActual} dk</div>
                              <div className="font-semibold whitespace-nowrap text-left" style={{ color: currentTheme.text }}>{remainingTime} dk</div>
                              <div className="font-semibold whitespace-nowrap text-left" style={{ color: currentTheme.text }}>{plannedCount} Adet</div>
                              <div className="font-semibold whitespace-nowrap text-left" style={{ color: currentTheme.text }}>{unplannedCount} Adet</div>
                              <div className="font-semibold whitespace-nowrap text-left" style={{ color: currentTheme.text }}>{totalCount} Adet</div>
                            </div>

                            {/* Beşinci Sütun - Label'lar */}
                            <div className="flex flex-col gap-3 ml-4">
                              <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>Planlı Skor:</div>
                              <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>Plandışı Skor:</div>
                              <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }} title={tip}>Kesinti/Bonus:</div>
                              <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>Performans Skoru:</div>
                              <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>Değerlendirme:</div>
                            </div>

                            {/* Altıncı Sütun - Değerler (sağa yaslı) */}
                            <div className="flex flex-col gap-3">
                              <div className="font-semibold whitespace-nowrap text-left" style={{ color: currentTheme.text }}>{weeklyLive.plannedScore}%</div>
                              <div className="font-semibold whitespace-nowrap text-left" style={{ color: currentTheme.text }}>{Number(weeklyLive.unplannedPercent || 0)}%</div>
                              <div className="font-semibold whitespace-nowrap text-left" style={{ color: net >= 0 ? '#10b981' : '#ef4444' }} title={tip}>
                                {net >= 0 ? '+' : ''}{net.toFixed(2)}%
                              </div>
                              <div className="font-semibold whitespace-nowrap text-left" style={{ color: currentTheme.text }}>{weeklyLive.finalScore}%</div>
                              <div className="font-bold whitespace-nowrap text-left" style={{ color: getPerformanceGrade(weeklyLive.finalScore).color }}>
                                {getPerformanceGrade(weeklyLive.finalScore).description}
                              </div>
                            </div>
                            <div className="flex flex-col gap-3"></div>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="mt-3 border-t" style={{ borderColor: currentTheme.border }} />
                    <div className="flex items-center gap-3 w-[98%]" style={{ marginTop: '10px', marginLeft: '16px', marginRight: '16px', marginBottom: '12px' }}>
                      <button className="flex-1 rounded px-4 py-2 transition-colors"
                        style={{
                          backgroundColor: currentTheme.accent,
                          color: '#ffffff'
                        }}
                        onMouseEnter={(e) => {
                          const hex = currentTheme.accent.replace('#', '');
                          const r = parseInt(hex.substr(0, 2), 16);
                          const g = parseInt(hex.substr(2, 2), 16);
                          const b = parseInt(hex.substr(4, 2), 16);
                          e.target.style.backgroundColor = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = currentTheme.accent;
                        }}
                        onClick={() => loadWeeklyGoals(weeklyWeekStart)}>Yenile</button>
                      <span className="w-[10px]"></span>
                      {user?.role !== 'observer' && (!combinedLocks.targets_locked || user?.role === 'admin' || user?.role === 'team_member' || user?.role === 'team_leader') && (
                        <button
                          className="flex-1 rounded px-4 py-2 transition-colors disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: weeklySaveState === 'saving'
                              ? currentTheme.accent
                              : weeklySaveState === 'saved'
                                ? '#10b981'
                                : '#10b981',
                            color: '#ffffff',
                            opacity: (weeklySaveState === 'saving' || (user?.role !== 'admin' && weeklyLive.overActualCapacity)) ? 0.6 : 1
                          }}
                          disabled={
                            // Kaydetme işlemi devam ediyorsa butonu devre dışı bırak
                            weeklySaveState === 'saving' ||
                            // Admin için kapasite kontrollerini bypass et
                            // İzin ve mesai alanları her zaman kaydedilebilir (kısıtlama yok)
                            // Planlı süre kontrolü yok - sadece gerçekleşen süre kontrolü var
                            (user?.role !== 'admin' && weeklyLive.overActualCapacity)
                          }
                          onMouseEnter={(e) => {
                            if (!(weeklySaveState === 'saving' || (user?.role !== 'admin' && weeklyLive.overActualCapacity))) {
                              e.target.style.backgroundColor = weeklySaveState === 'saved' ? '#059669' : '#059669';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!(weeklySaveState === 'saving' || (user?.role !== 'admin' && weeklyLive.overActualCapacity))) {
                              e.target.style.backgroundColor = weeklySaveState === 'saved' ? '#10b981' : '#10b981';
                            }
                          }}
                          onClick={saveWeeklyGoals}
                        >
                          {weeklySaveState === 'saving' ? 'Kaydediliyor...' : weeklySaveState === 'saved' ? 'Kaydedildi ✓' : 'Kaydet'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

          {showGoalDescription && createPortal(
            <div className="fixed inset-0 z-[999998]" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'auto'
            }}>
              <div className="absolute inset-0" onClick={() => setShowGoalDescription(false)} style={{ pointerEvents: 'auto', backgroundColor: `${currentTheme.background}CC` }} />
              <div className="relative z-10 w-[30vw] max-w-4xl rounded-2xl border shadow-[0_25px_80px_rgba(0,0,0,.6)] overflow-hidden"
                style={{
                  maxHeight: '80vh',
                  transform: 'translate(0, 0)',
                  margin: 'auto',
                  paddingRight: '5px',
                  pointerEvents: 'auto',
                  backgroundColor: currentTheme.tableBackground || currentTheme.background,
                  borderColor: currentTheme.border,
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  color: currentTheme.text
                }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center px-6 py-4 border-b" style={{ paddingRight: '10px', paddingLeft: '10px', backgroundColor: currentTheme.background, borderColor: currentTheme.border }}>
                  <div className="flex-1"></div>
                  <div className="flex-1 text-center">
                    <h3 className="text-xl font-semibold" style={{ color: currentTheme.text }}>Ek Açıklama</h3>
                  </div>
                  <div className="flex-1 flex justify-end">
                    <button
                      onClick={() => setShowGoalDescription(false)}
                      className="rounded px-2 py-1 transition-colors"
                      style={{
                        color: currentTheme.textSecondary || currentTheme.text,
                        backgroundColor: 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.color = currentTheme.text;
                        e.target.style.backgroundColor = `${currentTheme.border}30`;
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = currentTheme.textSecondary || currentTheme.text;
                        e.target.style.backgroundColor = 'transparent';
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="p-8" style={{ maxHeight: 'calc(80vh - 80px)', paddingLeft: '10px', paddingRight: '10px', paddingBottom: '10px', backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
                  <div className="flex-1 gap-3 mb-6 p-6 rounded-lg" style={{ backgroundColor: currentTheme.tableBackground }}>
                    {weeklyGoals.items[selectedGoalIndex].title && (
                      <h3 className="text-xl font-medium mb-3" style={{ color: currentTheme.text }}>Hedef: {weeklyGoals.items[selectedGoalIndex].title || 'Başlık belirtilmemiş'}</h3>
                    )}
                    {weeklyGoals.items[selectedGoalIndex].action_plan && (
                      <h3 className="text-xl font-medium mb-3" style={{ color: currentTheme.text }}>Aksiyon Planı: {weeklyGoals.items[selectedGoalIndex].action_plan}</h3>
                    )}
                  </div>
                  <div className="mb-6">
                    <h3 className="text-xl font-medium mb-3" style={{ color: currentTheme.text }}>Açıklama:</h3>
                    <textarea
                      defaultValue={goalDescription}
                      key={`goal-description-${selectedGoalIndex}`}
                      ref={(el) => {
                        goalDescriptionRef.current = el;
                        if (el && selectedGoalIndex !== null) {
                          const row = weeklyGoals.items[selectedGoalIndex];
                          if (row && el.value !== (row.description || '')) {
                            el.value = row.description || '';
                          }
                        }
                      }}
                      onChange={() => {
                        // Uncontrolled component - no state update, no re-render
                      }}
                      className="w-full !h-[200px] rounded px-4 py-3 text-[24px] resize-none text-base focus:outline-none"
                      style={{
                        backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                        color: currentTheme.text,
                        borderColor: currentTheme.border,
                        borderWidth: '1px',
                        borderStyle: 'solid'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = currentTheme.accent;
                        e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = currentTheme.border;
                        e.target.style.boxShadow = 'none';
                      }}
                      placeholder="Ek açıklamalarınızı buraya yazabilirsiniz..."
                      disabled={user && user.role === 'observer'}
                    />
                    <style>{`
                      textarea::placeholder {
                        color: var(--theme-placeholder) !important;
                        opacity: 0.7 !important;
                      }
                    `}</style>
                  </div>
                  <div className="flex justify-end gap-4 pt-4">
                    <button
                      onClick={() => setShowGoalDescription(false)}
                      className="w-full px-6 py-3 rounded transition-colors text-lg font-medium"
                      style={{
                        backgroundColor: currentTheme.border,
                        color: currentTheme.text
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = currentTheme.accent;
                        e.target.style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = currentTheme.border;
                        e.target.style.color = currentTheme.text;
                      }}
                    >
                      İptal
                    </button>
                    <span className="w-[20px]"></span>
                    {(!user || !user.role || user.role !== 'observer') && (
                      <button
                        onClick={async () => {
                          if (selectedGoalIndex !== null) {
                            const items = [...weeklyGoals.items];
                            // Get value from ref instead of state
                            const descriptionValue = goalDescriptionRef.current?.value || '';
                            items[selectedGoalIndex].description = descriptionValue;
                            setWeeklyGoals({ ...weeklyGoals, items });
                            setGoalDescription(descriptionValue); // Update state for next time modal opens
                            setShowGoalDescription(false);

                            // Backend'e kaydet (arka planda)
                            try {
                              await saveWeeklyGoals();
                              addNotification('Açıklama başarıyla kaydedildi.', 'success');
                            } catch (error) {
                              console.warn('Goal description save failed:', error);
                              addNotification('Açıklama kaydedilemedi ama yerel olarak saklandı.', 'warning');
                            }
                          }
                        }}
                        className="w-full px-6 py-3 rounded transition-colors text-lg font-medium"
                        style={{
                          backgroundColor: currentTheme.accent,
                          color: '#ffffff'
                        }}
                        onMouseEnter={(e) => {
                          const hex = currentTheme.accent.replace('#', '');
                          const r = parseInt(hex.substr(0, 2), 16);
                          const g = parseInt(hex.substr(2, 2), 16);
                          const b = parseInt(hex.substr(4, 2), 16);
                          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                          e.target.style.backgroundColor = brightness > 128
                            ? `rgba(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)}, 1)`
                            : `rgba(${Math.min(255, r + 20)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 20)}, 1)`;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = currentTheme.accent;
                        }}
                      >
                        Kaydet
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}
          <div style={{ backgroundColor: currentTheme.background }}>
            {showWeeklyOverview ? (
              <div className="flex justify-center">
                <div className="px-2 xs:px-3 sm:px-4 lg:px-6" style={{ width: '1440px' }}>
                  <div className="space-y-4" style={{ minWidth: '1440px', paddingTop: '10px', paddingBottom: '10px' }}>
                    <div className="flex flex-wrap items-center gap-3 border-b pb-3 overflow-x-auto" style={{ paddingBottom: '10px', borderColor: currentTheme.border }}>
                      <button
                        onClick={() => {
                          setShowWeeklyOverview(false);
                          setWeeklyOverviewError(null);
                        }}
                        className="px-4 xs:px-5 sm:px-6 py-2.5 text-xs xs:text-sm font-medium rounded-lg transition-colors whitespace-nowrap border"
                        style={{
                          backgroundColor: currentTheme.tableBackground || currentTheme.background,
                          color: currentTheme.text,
                          borderColor: currentTheme.border
                        }}
                      >
                        Görev Listesine Dön
                      </button>
                      <span className="w-[10px]"></span>
                      <button
                        className="rounded px-3 py-1 border text-sm transition-colors"
                        style={{
                          backgroundColor: currentTheme.tableBackground || currentTheme.background,
                          color: currentTheme.text,
                          borderColor: currentTheme.border
                        }}
                        onClick={() => {
                          const base = effectiveWeeklyOverviewWeekStart ? new Date(effectiveWeeklyOverviewWeekStart) : getMonday();
                          base.setDate(base.getDate() - 7);
                          loadWeeklyOverview(fmtYMD(getMonday(base)));
                        }}
                      >
                        ◀ Önceki
                      </button>
                      <span className="w-[10px]"></span>
                      <input
                        type="date"
                        className="rounded border px-3 py-1 text-[24px] focus:outline-none focus:ring-2"
                        style={{
                          backgroundColor: currentTheme.tableBackground || currentTheme.background,
                          color: currentTheme.text,
                          borderColor: currentTheme.border
                        }}
                        value={effectiveWeeklyOverviewWeekStart}
                        onChange={(e) => loadWeeklyOverview(e.target.value)}
                      />
                      <span className="w-[10px]"></span>
                      <button
                        className="rounded px-3 py-1 border text-sm transition-colors"
                        style={{
                          backgroundColor: currentTheme.tableBackground || currentTheme.background,
                          color: currentTheme.text,
                          borderColor: currentTheme.border
                        }}
                        onClick={() => {
                          const base = effectiveWeeklyOverviewWeekStart ? new Date(effectiveWeeklyOverviewWeekStart) : getMonday();
                          base.setDate(base.getDate() + 7);
                          loadWeeklyOverview(fmtYMD(getMonday(base)));
                        }}
                      >
                        Sonraki ▶
                      </button>
                      <div className="ml-auto text-sm whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>
                        {(() => {
                          const cur = effectiveWeeklyOverviewWeekStart ? new Date(effectiveWeeklyOverviewWeekStart) : getMonday();
                          const next = new Date(cur);
                          next.setDate(next.getDate() + 7);
                          return `Bu hafta: ${isoWeekNumber(cur)} • Gelecek hafta: ${isoWeekNumber(next)}`;
                        })()}
                      </div>
                    </div>
                    {weeklyOverviewError && (
                      <div className="border px-4 py-3 rounded-lg" style={{ backgroundColor: '#fee2e2', borderColor: '#fca5a5', color: '#991b1b' }}>
                        {weeklyOverviewError}
                      </div>
                    )}
                    <div className="rounded-lg shadow-lg overflow-hidden" style={{ backgroundColor: currentTheme.background }}>
                      {weeklyOverviewLoading ? (
                        <div className="py-12 text-center text-sm" style={{ color: currentTheme.textSecondary }}>
                          Haftalık hedef listesi yükleniyor...
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y text-[18px] cursor-pointer" style={{ borderColor: currentTheme.border }}>
                            <thead className="text-white text-[18px]" style={{ backgroundColor: currentTheme.tableHeader }}>
                              <tr>
                                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('name')} role="button">Kullanıcı</th>
                                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('leader_name')} role="button">Lider</th>
                                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('total_target_minutes')} role="button">Hedef (dk)</th>
                                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('total_actual_minutes')} role="button">Gerçekleşme (dk)</th>
                                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('unplanned_minutes')} role="button">Plandışı (dk)</th>
                                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('planned_score')} role="button">Planlı (%)</th>
                                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('unplanned_bonus')} role="button">Plandışı (%)</th>
                                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('final_score')} role="button">Final Skor (%)</th>
                                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide" style={{ color: currentTheme.text }} onClick={() => toggleWeeklyOverviewSort('total_actual_minutes')} role="button">Toplam Süre (DK)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {weeklyOverview.items.length === 0 ? (
                                <tr>
                                  <td colSpan={9} className="px-4 py-6 text-center text-sm" style={{ color: currentTheme.textSecondary }}>
                                    Listelenecek kullanıcı bulunamadı.
                                  </td>
                                </tr>
                              ) : (
                                sortedWeeklyOverview.map((item, index) => {
                                  const grade = getPerformanceGrade(Number(item.final_score || 0));
                                  const targetWeek = weeklyOverview.week_start || effectiveWeeklyOverviewWeekStart;
                                  const baseBg = index % 2 === 0
                                    ? (currentTheme.tableBackground || currentTheme.background)
                                    : (currentTheme.tableRowAlt || currentTheme.background);
                                  return (
                                    <tr
                                      key={item.user_id}
                                      onClick={() => {
                                        setShowWeeklyGoals(true);
                                        loadWeeklyGoals(targetWeek, item.user_id);
                                      }}
                                      className="transition-colors"
                                      style={{
                                        backgroundColor: baseBg,
                                        height: '50px',
                                        borderColor: currentTheme.border
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = currentTheme.accent + '40';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = baseBg;
                                      }}
                                    >
                                      <td className="px-4 py-3 text-sm text-left" style={{ color: currentTheme.accent }}>{item.name}</td>
                                      <td className="px-4 py-3 text-sm text-left" style={{ color: currentTheme.text }}>{item.leader_name || '-'}</td>
                                      <td className="px-4 py-3 text-sm text-center" style={{ color: currentTheme.text }}>{Number(item.total_target_minutes || 0).toLocaleString('tr-TR')}</td>
                                      <td className="px-4 py-3 text-sm text-center" style={{ color: currentTheme.text }}>{Number(item.total_actual_minutes || 0).toLocaleString('tr-TR')}</td>
                                      <td className="px-4 py-3 text-sm text-center" style={{ color: currentTheme.text }}>{Number(item.unplanned_minutes || 0).toLocaleString('tr-TR')}</td>
                                      <td className="px-4 py-3 text-sm text-center" style={{ color: currentTheme.text }}>{Number(item.planned_score || 0).toFixed(1)}</td>
                                      <td className="px-4 py-3 text-sm text-center" style={{ color: currentTheme.text }}>{Number(item.unplanned_bonus || 0).toFixed(1)}</td>
                                      <td className="px-4 py-3 text-sm text-center font-semibold" style={{ color: grade.color }}>{Number(item.final_score || 0).toFixed(1)}</td>
                                      <td className="px-4 py-3 text-sm text-center" style={{ color: currentTheme.text }}>{Number((item.total_actual_minutes || 0) + (item.unplanned_minutes || 0))}</td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-center">
                  <div className="px-2 xs:px-3 sm:px-4 lg:px-6" style={{ width: '1440px' }}>
                    <div className="flex items-center space-x-3 border-b border-gray-200 pb-3 overflow-x-auto" style={{ minWidth: '1440px', paddingTop: '10px', paddingBottom: '10px' }}>
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            setShowWeeklyOverview(true);
                            loadWeeklyOverview(null);
                          }}
                          className="px-4 xs:px-5 sm:px-6 py-2.5 text-xs xs:text-sm font-medium rounded-lg transition-colors whitespace-nowrap border"
                          style={{
                            marginRight: '5px',
                            backgroundColor: 'transparent',
                            color: currentTheme.text,
                            borderColor: currentTheme.border
                          }}
                        >
                          <span className="flex items-center gap-2 whitespace-nowrap">
                            <span>🎯</span>
                            <span>Haftalık Hedef</span>
                          </span>
                        </button>
                      )}
                      <button
                        onClick={() => setActiveTab('active')}
                        className="px-4 xs:px-5 sm:px-6 py-2.5 text-xs xs:text-sm font-medium rounded-lg transition-colors whitespace-nowrap border"
                        style={{
                          backgroundColor: activeTab === 'active' ? currentTheme.accent : 'transparent',
                          color: activeTab === 'active' ? '#ffffff' : currentTheme.text,
                          borderColor: activeTab === 'active' ? currentTheme.accent : currentTheme.border
                        }}
                      >
                        Aktif ({taskCounts.active})
                      </button>
                      <button
                        onClick={() => setActiveTab('completed')}
                        className="px-4 xs:px-5 sm:px-6 py-2.5 text-xs xs:text-sm font-medium rounded-lg transition-colors whitespace-nowrap border"
                        style={{
                          marginLeft: '5px',
                          backgroundColor: activeTab === 'completed' ? '#10b981' : 'transparent',
                          color: activeTab === 'completed' ? '#ffffff' : currentTheme.text,
                          borderColor: activeTab === 'completed' ? '#10b981' : currentTheme.border
                        }}
                      >
                        Tamamlanan ({taskCounts.completed})
                      </button>
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => setActiveTab('deleted')}
                          className="px-4 xs:px-5 sm:px-6 py-2.5 text-xs xs:text-sm font-medium rounded-lg transition-colors whitespace-nowrap border"
                          style={{
                            marginLeft: '5px',
                            backgroundColor: activeTab === 'deleted' ? '#ef4444' : 'transparent',
                            color: activeTab === 'deleted' ? '#ffffff' : currentTheme.text,
                            borderColor: activeTab === 'deleted' ? '#ef4444' : currentTheme.border
                          }}
                        >
                          İptal ({taskCounts.deleted})
                        </button>
                      )}
                      <div className="relative" style={{ marginLeft: '5px' }}>
                        <select
                          value={selectedTaskType}
                          onChange={(e) => setSelectedTaskType(e.target.value)}
                          className="px-3 xs:px-4 sm:px-4 py-2.5 text-[16px] xs:text-sm text-center border rounded-lg focus:outline-none focus:ring-2 appearance-none cursor-pointer shadow-sm"
                          style={{
                            height: '40px',
                            minWidth: '140px',
                            backgroundColor: currentTheme.tableBackground || currentTheme.background,
                            color: currentTheme.text,
                            borderColor: currentTheme.border
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = currentTheme.accent;
                            e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = currentTheme.border;
                            e.target.style.boxShadow = 'none';
                          }}
                        >
                          <option
                            value="all"
                            style={{
                              backgroundColor: currentTheme.tableBackground || currentTheme.background,
                              color: currentTheme.text
                            }}
                          >
                            Tüm Türler
                          </option>
                          {getAllTaskTypes().map(taskType => (
                            <option
                              key={taskType.value}
                              value={taskType.value}
                              style={{
                                backgroundColor: currentTheme.tableBackground || currentTheme.background,
                                color: currentTheme.text
                              }}
                            >
                              {taskType.label}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            style={{ color: currentTheme.textSecondary || currentTheme.text }}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      <div className="relative flex-shrink-0 items-center" style={{ marginLeft: 'auto' }}>
                        <input
                          type="text"
                          placeholder="Görev ara..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="!w-48 xs:!w-56 sm:!w-64 px-4 py-2.5 text-xs xs:text-sm border rounded-lg focus:outline-none focus:ring-2 shadow-sm"
                          style={{
                            height: '30px',
                            fontSize: '16px',
                            backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                            color: currentTheme.text,
                            borderColor: currentTheme.border
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = currentTheme.accent;
                            e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                            e.target.setAttribute('autocomplete', 'off');
                            e.target.setAttribute('autocorrect', 'off');
                            e.target.setAttribute('autocapitalize', 'off');
                            e.target.setAttribute('spellcheck', 'false');
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = currentTheme.border;
                            e.target.style.boxShadow = 'none';
                          }}
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck="false"
                          data-lpignore="true"
                          data-form-type="other"
                          name="search"
                          id="task-search"
                          onInput={(e) => {
                            if (e.target.value && !e.isTrusted) {
                              e.target.value = '';
                              setSearchTerm('');
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center">
                  <div className="border-b" style={{ minWidth: '1440px', backgroundColor: currentTheme.tableHeader || currentTheme.tableBackground || currentTheme.background, borderColor: currentTheme.border }}>
                    <div className="grid gap-0 px-2 xs:px-3 sm:px-4 lg:px-6 pt-2 xs:pt-3 text-xs xs:text-sm font-medium uppercase tracking-wider grid-cols-[120px_460px_160px_160px_120px_120px_120px_180px]" style={{ color: currentTheme.text, backgroundColor: currentTheme.tableHeader || currentTheme.tableBackground || currentTheme.background }}>
                      <button onClick={() => toggleSort('no')} className="flex items-center justify-center px-2 transition-colors"
                        style={{ color: currentTheme.text }}
                        onMouseEnter={(e) => e.target.style.color = currentTheme.accent}
                        onMouseLeave={(e) => e.target.style.color = currentTheme.text}>
                        <span>NO</span>
                      </button>
                      <button onClick={() => toggleSort('title')} className="flex items-center justify-center px-2 transition-colors"
                        style={{ color: currentTheme.text }}
                        onMouseEnter={(e) => e.target.style.color = currentTheme.accent}
                        onMouseLeave={(e) => e.target.style.color = currentTheme.text}>
                        <span>Başlık</span>
                      </button>
                      <button onClick={() => toggleSort('priority')} className="flex items-center justify-center px-2 transition-colors"
                        style={{ color: currentTheme.text }}
                        onMouseEnter={(e) => e.target.style.color = currentTheme.accent}
                        onMouseLeave={(e) => e.target.style.color = currentTheme.text}>
                        <span>Öncelik</span>
                      </button>
                      <button onClick={() => toggleSort('task_type')} className="flex items-center justify-center px-2 transition-colors"
                        style={{ color: currentTheme.text }}
                        onMouseEnter={(e) => e.target.style.color = currentTheme.accent}
                        onMouseLeave={(e) => e.target.style.color = currentTheme.text}>
                        <span>Tür</span>
                      </button>
                      <button onClick={() => toggleSort('start_date')} className="flex items-center justify-center px-2 transition-colors"
                        style={{ color: currentTheme.text }}
                        onMouseEnter={(e) => e.target.style.color = currentTheme.accent}
                        onMouseLeave={(e) => e.target.style.color = currentTheme.text}>
                        <span>Başlangıç</span>
                      </button>
                      <button onClick={() => toggleSort('due_date')} className="flex items-center justify-center px-2 transition-colors"
                        style={{ color: currentTheme.text }}
                        onMouseEnter={(e) => e.target.style.color = currentTheme.accent}
                        onMouseLeave={(e) => e.target.style.color = currentTheme.text}>
                        <span>Bitiş</span>
                      </button>
                      <button onClick={() => toggleSort('attachments_count')} className="flex items-center justify-center px-2 transition-colors"
                        style={{ color: currentTheme.text, backgroundColor: 'transparent' }}
                        onMouseEnter={(e) => {
                          e.target.style.color = currentTheme.accent;
                          e.target.style.backgroundColor = 'transparent';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.color = currentTheme.text;
                          e.target.style.backgroundColor = 'transparent';
                        }}>
                        <span>Dosyalar</span>
                      </button>
                      {activeTab === 'active' || activeTab === 'completed' ? (
                        <button className="flex items-center justify-center px-2 transition-colors"
                          style={{ color: currentTheme.text }}
                          onMouseEnter={(e) => e.target.style.color = currentTheme.accent}
                          onMouseLeave={(e) => e.target.style.color = currentTheme.text}>
                          <span>Güncel Durum</span>
                        </button>
                      ) : (
                        <div className="flex items-center justify-center px-2 select-none cursor-default" style={{ color: currentTheme.text }}>
                          <span>Eylem</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div style={{ width: '1440px' }}>
                    {filteredTasks.map((task, index) => (
                      <div
                        key={task.id}
                        onClick={() => handleTaskClick(task)}
                        className="grid gap-0 px-3 xs:px-4 sm:px-6 py-3 xs:py-4 sm:py-5 cursor-pointer transition-colors border-b grid-cols-[120px_460px_160px_160px_120px_120px_120px_180px]"
                        style={{
                          paddingTop: '10px',
                          paddingBottom: '10px',
                          backgroundColor: index % 2 === 0
                            ? (currentTheme.tableBackground || currentTheme.background)
                            : (currentTheme.tableRowAlt || currentTheme.background),
                          borderColor: currentTheme.border
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = currentTheme.accent + '20';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = index % 2 === 0
                            ? (currentTheme.tableBackground || currentTheme.background)
                            : (currentTheme.tableRowAlt || currentTheme.background);
                        }}
                      >
                        <div className="px-2 text-xs xs:text-sm text-center" style={{ color: currentTheme.text }}>
                          {task.no || `-`}
                        </div>
                        <div className="px-2 text-left">
                          <div className="text-xs xs:text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: currentTheme.text }}>
                            {task.title || `Görev ${task.id}`}
                          </div>
                        </div>
                        <div className="px-2">
                          <span
                            className="inline-flex items-center px-1 xs:px-1.5 py-0.5 xs:py-1 rounded-full text-xs xs:text-sm font-medium"
                            style={{
                              backgroundColor: getPriorityColor(task.priority) + '20',
                              color: getPriorityColor(task.priority),
                              paddingBottom: '5px',
                              paddingTop: '5px',
                              paddingLeft: '5px',
                              paddingRight: '5px'
                            }}
                          >
                            {getPriorityText(task.priority)}
                          </span>
                        </div>
                        <div className="px-2">
                          <span
                            className="inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: getTaskTypeColor(task.task_type, task) + '20',
                              color: getTaskTypeColor(task.task_type, task),
                              paddingBottom: '5px',
                              paddingTop: '5px',
                              paddingLeft: '5px',
                              paddingRight: '5px'
                            }}
                          >
                            {getTaskTypeText(task.task_type, task)}
                          </span>
                        </div>
                        <div className="px-2 text-xs xs:text-sm text-gray-900">
                          {task.start_date ? formatDateOnly(task.start_date) : '-'}
                        </div>
                        <div className="px-2 text-xs xs:text-sm text-gray-900">
                          {task.due_date ? formatDateOnly(task.due_date) : '-'}
                        </div>
                        <div className="px-2 text-xs xs:text-sm text-gray-900">
                          {task.attachments?.length > 0 ? `${task.attachments.length} dosya` : '-'}
                        </div>
                        <div className="px-2 flex justify-center items-center">
                          {activeTab === 'active' || activeTab === 'completed' ? (
                            <TooltipStatus
                              task={task}
                              onLoadHistory={() => loadTaskHistoryForTooltip(task.id)}
                              getStatusColor={getStatusColor}
                              getStatusText={getStatusText}
                              formatDateOnly={formatDateOnly}
                              getLastAddedDescription={() => getLastAddedDescription(taskHistories[task.id] || [])}
                              currentTheme={currentTheme}
                            />
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePermanentDelete(task.id);
                              }}
                              className="inline-flex items-center justify-center text-blue-300 hover:text-blue-200 text-[16px] buttonHoverEffect"
                              style={{ width: '40px', height: '40px', borderRadius: '9999px', backgroundColor: 'rgba(241, 91, 21, 0.62)' }}
                              title="Görevi kalıcı olarak sil"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {filteredTasks.length === 0 && (
                    <div className="flex justify-center">
                      <div className="text-center py-6 xs:py-8 sm:py-10 lg:py-12" style={{ width: '1440px' }}>
                        <div className="text-gray-500 text-sm xs:text-base sm:text-lg">
                          {activeTab === 'active' && 'Aktif görev bulunamadı'}
                          {activeTab === 'completed' && 'Tamamlanan görev bulunamadı'}
                          {activeTab === 'deleted' && 'İptal edilen görev bulunamadı'}
                        </div>
                        <div className="text-gray-400 text-xs mt-2">
                          {searchTerm ? 'Aramayı temizlemeyi deneyin' :
                            (activeTab === 'active' && user?.role !== 'observer' ? 'Yeni görev ekleyin' : 'Henüz görev bulunmuyor')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {showDetailModal && selectedTask && createPortal(
            <div className="fixed inset-0 z-[999996]" style={{ pointerEvents: 'auto' }}>
              <div className="absolute inset-0" onClick={handleCloseModal} style={{ pointerEvents: 'auto', backgroundColor: `${currentTheme.background}CC` }} />
              <div className="relative z-10 flex min-h-full items-center justify-center p-2 sm:p-4" style={{ pointerEvents: 'auto' }}>
                <div className="fixed z-[100100] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[1445px]
                  h-[80vh] rounded-2xl box-border
                shadow-[0_25px_80px_rgba(0,0,0,.6)] flex flex-col overflow-hidden
              "
                  style={{
                    backgroundColor: currentTheme.tableBackground || currentTheme.background,
                    color: currentTheme.text,
                    pointerEvents: 'auto',
                    borderColor: currentTheme.border,
                    borderWidth: '1px',
                    borderStyle: 'solid'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="border-b flex-none"
                    style={{ backgroundColor: currentTheme.background, borderColor: currentTheme.border, padding: '0px 10px' }}
                  >
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <div className="justify-self-start">

                      </div>
                      <h2 className="text-xl md:text-2xl font-semibold text-center" style={{ color: currentTheme.text }}>Görev Detayı</h2>
                      <div className="justify-self-end">
                        <button
                          onClick={handleCloseModal}
                          className="rounded-lg px-2 py-1 transition-colors border border-red-500"
                          style={{ color: currentTheme.textSecondary, backgroundColor: 'transparent' }}
                          onMouseEnter={(e) => {
                            e.target.style.color = currentTheme.text;
                            e.target.style.backgroundColor = `${currentTheme.border}30`;
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.color = currentTheme.textSecondary;
                            e.target.style.backgroundColor = 'transparent';
                          }}
                          aria-label="Kapat"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex min-w-0 overflow-hidden overflow-x-hidden" style={{ borderLeft: `1px solid ${currentTheme.border}`, borderRight: `1px solid ${currentTheme.border}` }}>
                    <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden no-scrollbar" style={{ padding: '0px 24px' }}>
                      <div className="py-6 flex flex-col gap-4 sm:gap-6">
                        {error && (
                          <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-2xl mb-4">
                            {error}
                          </div>
                        )}
                        <br />
                        <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                          <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>
                            NO
                          </label>
                          {(user?.role === 'admin' || user?.id === selectedTask.responsible?.id) ? (
                            <input
                              type="text"
                              value={detailDraft?.no || selectedTask.no || ''}
                              onChange={(e) => setDetailDraft(prev => ({ ...(prev || {}), no: e.target.value }))}
                              className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] focus:outline-none"
                              style={{
                                minHeight: '35px',
                                backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                color: currentTheme.text,
                                borderColor: currentTheme.border,
                                borderWidth: '1px',
                                borderStyle: 'solid'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = currentTheme.accent;
                                e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = currentTheme.border;
                                e.target.style.boxShadow = 'none';
                              }}
                              placeholder="NO girin..."
                            />
                          ) : (
                            <div className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] flex items-center" style={{ minHeight: '24px', backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background, color: currentTheme.text }}>
                              {selectedTask.no || '-'}
                            </div>
                          )}
                        </div>
                        <br />
                        <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                          <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>
                            Başlık
                          </label>
                          <div className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] flex items-center" style={{ minHeight: '24px', backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background, color: currentTheme.text }}>
                            {selectedTask.title ?? ""}
                          </div>
                        </div>
                        <br />
                        <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                          <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>
                            Görev Türü
                          </label>
                          {user?.role === 'admin' ? (
                            <select
                              value={detailDraft?.task_type || 'development'}
                              onChange={(e) => {
                                const newTaskType = e.target.value;
                                setDetailDraft(prev => ({
                                  ...(prev || {}),
                                  task_type: newTaskType,
                                  status: 'waiting' // Görev türü değiştiğinde durumu Bekliyor'a reset et
                                }));
                              }}
                              className="w-full rounded-lg px-3 py-2 !text-[24px] sm:!text-[16px] focus:outline-none"
                              style={{
                                height: '40px',
                                backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                color: currentTheme.text,
                                borderColor: currentTheme.border,
                                borderWidth: '1px',
                                borderStyle: 'solid'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = currentTheme.accent;
                                e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = currentTheme.border;
                                e.target.style.boxShadow = 'none';
                              }}
                            >
                              {getAllTaskTypes().map(taskType => (
                                <option key={taskType.value} value={taskType.value}>
                                  {taskType.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] flex items-center" style={{ minHeight: '24px', backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background, color: currentTheme.text }}>
                              {getTaskTypeText(selectedTask.task_type)}
                            </div>
                          )}
                        </div>
                        <br />
                        <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                          <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>
                            Durum
                          </label>
                          {(user?.role !== 'observer' && (user?.id === selectedTask.creator?.id || user?.id === selectedTask.responsible?.id || user?.role === 'admin' || (Array.isArray(selectedTask.assigned_users) && selectedTask.assigned_users.some(u => (typeof u === 'object' ? u.id : u) === user?.id)))) ? (
                            <div className="space-y-3">
                              {/* Durum Geçiş Butonları ve Select */}
                              <div className="flex items-center space-x-2">
                                {/* Önceki Durum Butonu */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentStatus = detailDraft?.status || '';
                                    const taskType = detailDraft?.task_type || selectedTask.task_type || selectedTask.type || 'development';
                                    const customStatuses = getAllTaskStatuses(taskType);
                                    const currentIndex = customStatuses.findIndex(s => s.value === currentStatus);
                                    if (currentIndex > 0) {
                                      const prevStatus = customStatuses[currentIndex - 1];
                                      setDetailDraft(prev => ({ ...(prev || {}), status: prevStatus.value }));
                                    }
                                  }}
                                  className="px-3 py-2 rounded-lg transition-colors"
                                  style={{
                                    backgroundColor: currentTheme.border,
                                    color: currentTheme.text
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = currentTheme.accent;
                                    e.target.style.color = '#ffffff';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = currentTheme.border;
                                    e.target.style.color = currentTheme.text;
                                  }}
                                  title="Önceki özel durum"
                                  disabled={getAllTaskStatuses(detailDraft?.task_type || selectedTask.task_type || selectedTask.type || 'development').length === 0}
                                >
                                  ←
                                </button>
                                {/* Durum Select - Sadece Özel Durumlar */}
                                {getAllTaskStatuses(detailDraft?.task_type || selectedTask.task_type || selectedTask.type || 'development').length > 0 ? (
                                  <select
                                    value={detailDraft?.status || ''}
                                    onChange={(e) => setDetailDraft(prev => ({ ...(prev || {}), status: e.target.value }))}
                                    className="flex-1 rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] focus:outline-none"
                                    style={{
                                      height: '40px',
                                      backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                      color: currentTheme.text,
                                      borderColor: currentTheme.border,
                                      borderWidth: '1px',
                                      borderStyle: 'solid'
                                    }}
                                    onFocus={(e) => {
                                      e.target.style.borderColor = currentTheme.accent;
                                      e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                    }}
                                    onBlur={(e) => {
                                      e.target.style.borderColor = currentTheme.border;
                                      e.target.style.boxShadow = 'none';
                                    }}
                                  >
                                    <option value="">Durum seçin...</option>
                                    {getAllTaskStatuses(detailDraft?.task_type || selectedTask.task_type || selectedTask.type || 'development').map(status => (
                                      <option key={status.value} value={status.value}>
                                        {status.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <div className="flex-1 rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] flex items-center" style={{ height: '40px', backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background, color: currentTheme.textSecondary || currentTheme.text }}>
                                    Durum yok
                                  </div>
                                )}

                                {/* Sonraki Durum Butonu */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentStatus = detailDraft?.status || '';
                                    const taskType = detailDraft?.task_type || selectedTask.task_type || selectedTask.type || 'development';
                                    const customStatuses = getAllTaskStatuses(taskType);
                                    const currentIndex = customStatuses.findIndex(s => s.value === currentStatus);
                                    if (currentIndex < customStatuses.length - 1) {
                                      const nextStatus = customStatuses[currentIndex + 1];
                                      setDetailDraft(prev => ({ ...(prev || {}), status: nextStatus.value }));
                                    }
                                  }}
                                  className="px-3 py-2 rounded-lg transition-colors"
                                  style={{
                                    backgroundColor: currentTheme.border,
                                    color: currentTheme.text
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = currentTheme.accent;
                                    e.target.style.color = '#ffffff';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = currentTheme.border;
                                    e.target.style.color = currentTheme.text;
                                  }}
                                  title="Sonraki özel durum"
                                  disabled={getAllTaskStatuses(detailDraft?.task_type || selectedTask.task_type || selectedTask.type || 'development').length === 0}
                                >
                                  →
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] flex items-center" style={{ minHeight: '24px', backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background, color: currentTheme.text }}>
                              {getStatusText(selectedTask.status, selectedTask)}
                            </div>
                          )}
                        </div>
                        <br />
                        <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                          <PriorityLabelWithTooltip htmlFor="new-task-priority" currentTheme={currentTheme} />
                          {user?.role !== 'observer' ? (
                            <select
                              value={detailDraft?.priority || 'medium'}
                              onChange={(e) => setDetailDraft(prev => ({ ...(prev || {}), priority: e.target.value }))}
                              className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] focus:outline-none"
                              style={{
                                height: '40px',
                                backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                color: currentTheme.text,
                                borderColor: currentTheme.border,
                                borderWidth: '1px',
                                borderStyle: 'solid'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = currentTheme.accent;
                                e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = currentTheme.border;
                                e.target.style.boxShadow = 'none';
                              }}
                            >
                              <option value="low">Düşük</option>
                              <option value="medium">Orta</option>
                              <option value="high">Yüksek</option>
                              <option value="critical">Kritik</option>
                            </select>
                          ) : (
                            <div className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] flex items-center" style={{ minHeight: '24px', backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background, color: currentTheme.text }}>
                              {getPriorityText(selectedTask.priority)}
                            </div>
                          )}
                        </div>
                        <br />
                        <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                          <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>
                            Sorumlu
                          </label>
                          {(user?.role !== 'observer') ? (
                            <select
                              value={detailDraft?.responsible_id || ''}
                              onChange={(e) => {
                                const rid = e.target.value ? parseInt(e.target.value) : '';
                                const currentAssignedUserIds = detailDraft?.assigned_user_ids || (selectedTask.assigned_users || []).map(x => (typeof x === 'object' ? x.id : x));

                                // Önceki liderin ekibini kaldır
                                let cleanedAssignedUsers = currentAssignedUserIds;
                                if (previousResponsibleIdDetailRef.current && users) {
                                  const prevResponsibleUser = users.find(u => u.id === previousResponsibleIdDetailRef.current);
                                  if (prevResponsibleUser && prevResponsibleUser.role === 'team_leader') {
                                    const prevTeamMembers = users.filter(u => u.leader_id === previousResponsibleIdDetailRef.current);
                                    const prevTeamMemberIds = prevTeamMembers.map(m => m.id);
                                    cleanedAssignedUsers = cleanedAssignedUsers.filter(id => !prevTeamMemberIds.includes(id));
                                  }
                                }

                                // Yeni lider takım lideriyse, ekibini ekle
                                if (rid && users) {
                                  const newResponsibleUser = users.find(u => u.id === rid);
                                  if (newResponsibleUser && newResponsibleUser.role === 'team_leader') {
                                    const teamMembers = users.filter(u => u.leader_id === rid);
                                    const teamMemberIds = teamMembers.map(m => m.id);
                                    const combinedIds = [...new Set([...cleanedAssignedUsers, ...teamMemberIds])];
                                    setDetailDraft(prev => ({ ...(prev || {}), responsible_id: rid, assigned_user_ids: combinedIds }));
                                  } else {
                                    setDetailDraft(prev => ({ ...(prev || {}), responsible_id: rid, assigned_user_ids: cleanedAssignedUsers }));
                                  }
                                } else {
                                  setDetailDraft(prev => ({ ...(prev || {}), responsible_id: rid, assigned_user_ids: cleanedAssignedUsers }));
                                }

                                // Önceki sorumluyu güncelle
                                previousResponsibleIdDetailRef.current = rid;
                              }}
                              className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] focus:outline-none"
                              style={{
                                height: '40px',
                                backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                color: currentTheme.text,
                                borderColor: currentTheme.border,
                                borderWidth: '1px',
                                borderStyle: 'solid'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = currentTheme.accent;
                                e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = currentTheme.border;
                                e.target.style.boxShadow = 'none';
                              }}
                            >
                              <option value="">Seçin</option>
                              {getEligibleResponsibleUsers().map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                              ))}
                            </select>
                          ) : (
                            <div className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] flex items-center" style={{ height: '40px', backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background, color: currentTheme.text }}>
                              {selectedTask.responsible?.name || 'Atanmamış'}
                            </div>
                          )}
                        </div>
                        <br />
                        <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                          <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>
                            Oluşturan
                          </label>
                          <div className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[24px] flex items-center" style={{ height: '40px', backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background, color: currentTheme.text }}>
                            {selectedTask.creator?.name || 'Bilinmiyor'}
                          </div>
                        </div>
                        <br />
                        <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-start">
                          <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>
                            Atananlar
                          </label>
                          <div className="w-full rounded-lg p-3 sm:p-4" style={{ minHeight: '24px', height: 'fit-content', backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background }}>
                            {user?.role !== 'observer' ? (
                              <div className="assignee-dropdown-detail-container relative">
                                {Array.isArray(detailDraft?.assigned_user_ids) && detailDraft.assigned_user_ids.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-2 mb-3 overflow-hidden">
                                    {(detailDraft.assigned_user_ids || []).map((id) => {
                                      const u = (users || []).find(x => x.id === id) || (selectedTask.assigned_users || []).find(x => (typeof x === 'object' ? x.id : x) === id);
                                      const name = u ? (typeof u === 'object' ? (u.name || u.email || `#${id}`) : String(u)) : `#${id}`;
                                      return (
                                        <span
                                          key={id}
                                          className="inline-flex items-center gap-1.5 rounded-full text-sm max-w-full px-3 py-1 transition-colors"
                                          style={{
                                            backgroundColor: currentTheme.accent + '20',
                                            color: currentTheme.text
                                          }}
                                        >
                                          <span className="truncate max-w-[200px]">{name}</span>
                                          <button
                                            type="button"
                                            aria-label="Atananı kaldır"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const nextIds = (detailDraft?.assigned_user_ids || []).filter(v => v !== id);
                                              setDetailDraft(prev => ({ ...(prev || {}), assigned_user_ids: nextIds }));
                                            }}
                                            className="flex items-center justify-center rounded-full transition-colors focus:outline-none"
                                            style={{
                                              width: '16px',
                                              height: '16px',
                                              minWidth: '16px',
                                              minHeight: '16px',
                                              backgroundColor: 'transparent',
                                              color: currentTheme.textSecondary || currentTheme.text,
                                              fontSize: '12px',
                                              lineHeight: '1',
                                              padding: '0',
                                              marginLeft: '2px'
                                            }}
                                            onMouseEnter={(e) => {
                                              e.target.style.backgroundColor = currentTheme.accent;
                                              e.target.style.color = '#ffffff';
                                            }}
                                            onMouseLeave={(e) => {
                                              e.target.style.backgroundColor = 'transparent';
                                              e.target.style.color = currentTheme.textSecondary || currentTheme.text;
                                            }}
                                          >
                                            ✕
                                          </button>
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}

                                <input
                                  ref={assigneeDetailInputRef}
                                  type="text"
                                  placeholder="Kullanıcı atayın..."
                                  value={assigneeSearchDetail}
                                  className="w-[99%] rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] focus:outline-none"
                                  style={{
                                    minHeight: '32px',
                                    backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                    color: currentTheme.text,
                                    borderColor: currentTheme.border,
                                    borderWidth: '1px',
                                    borderStyle: 'solid'
                                  }}
                                  onFocus={(e) => {
                                    e.target.style.borderColor = currentTheme.accent;
                                    e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                    setShowAssigneeDropdownDetail(true);
                                  }}
                                  onBlur={(e) => {
                                    e.target.style.borderColor = currentTheme.border;
                                    e.target.style.boxShadow = 'none';
                                    setTimeout(() => setShowAssigneeDropdownDetail(false), 200);
                                  }}
                                  onChange={(e) => {
                                    setAssigneeSearchDetail(e.target.value);
                                    setShowAssigneeDropdownDetail(true);
                                  }}
                                />

                                {showAssigneeDropdownDetail && users && users.length > 0 && (
                                  <div
                                    className="absolute w-full mt-1 border-2 border-gray-400 rounded-lg shadow-xl max-h-60 overflow-y-auto bg-white"
                                    style={{
                                      backgroundColor: currentTheme.tableBackground || currentTheme.background,
                                      opacity: 1,
                                      zIndex: 2147483647,
                                      filter: 'none',
                                      backdropFilter: 'none',
                                      WebkitBackdropFilter: 'none',
                                      mixBlendMode: 'normal',
                                      isolation: 'isolate',
                                      pointerEvents: 'auto',
                                      borderColor: currentTheme.border,
                                      borderWidth: '2px',
                                      borderStyle: 'solid',
                                      color: currentTheme.text
                                    }}
                                  >
                                    {getEligibleAssignedUsers(selectedTask.responsible?.id)
                                      .filter(u => {
                                        const q = assigneeSearchDetail.toLowerCase();
                                        const name = (u.name || '').toLowerCase();
                                        const email = (u.email || '').toLowerCase();
                                        const matches = !q || name.includes(q) || email.includes(q);
                                        const already = (detailDraft?.assigned_user_ids || []).includes(u.id);
                                        return matches && !already;
                                      })
                                      .map(u => (
                                        <div
                                          key={u.id}
                                          className="px-3 sm:px-4 py-2 sm:py-3 cursor-pointer text-[24px] sm:text-[24px] text-left border-b last:border-b-0"
                                          style={{
                                            color: currentTheme.text,
                                            borderColor: currentTheme.border
                                          }}
                                          onMouseEnter={(e) => {
                                            e.target.style.backgroundColor = currentTheme.accent + '20';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.target.style.backgroundColor = 'transparent';
                                          }}
                                          onMouseDown={(e) => e.preventDefault()}
                                          onClick={async () => {
                                            let usersToAdd = [u.id];
                                            if (u.role === 'team_leader') {
                                              // Sorumlu kişiyi hariç tutarak ekip üyelerini bul
                                              const responsibleId = detailDraft?.responsible_id || selectedTask.responsible?.id;
                                              const teamMembers = users.filter(tm =>
                                                Number(tm.leader_id) === Number(u.id) &&
                                                tm.id !== responsibleId
                                              );
                                              const teamMemberIds = teamMembers.map(tm => tm.id);
                                              console.log(`[Detay Modal] Takım lideri ${u.name} seçildi. Ekip: `, teamMembers.map(tm => tm.name));
                                              usersToAdd = [...usersToAdd, ...teamMemberIds];
                                            }
                                            const combinedUsers = [...new Set([...(detailDraft?.assigned_user_ids || []), ...usersToAdd])];
                                            setDetailDraft(prev => ({ ...(prev || {}), assigned_user_ids: combinedUsers }));
                                            setAssigneeSearchDetail('');
                                            setShowAssigneeDropdownDetail(true);
                                            setTimeout(() => assigneeDetailInputRef.current?.focus(), 0);
                                          }}
                                        >
                                          {u.name}
                                        </div>
                                      ))}
                                    {getEligibleAssignedUsers(selectedTask.responsible?.id).filter(u => {
                                      const q = assigneeSearchDetail.toLowerCase();
                                      const name = (u.name || '').toLowerCase();
                                      const email = (u.email || '').toLowerCase();
                                      const matches = !q || name.includes(q) || email.includes(q);
                                      const already = (detailDraft?.assigned_user_ids || []).some(id => id === u.id);
                                      return matches && !already;
                                    }).length === 0 && (
                                        <div className="px-3 sm:px-4 py-2 sm:py-3 text-[16px] sm:text-[24px] border-b" style={{ color: currentTheme.textSecondary || currentTheme.text, borderColor: currentTheme.border }}>
                                          Kullanıcı bulunamadı
                                        </div>
                                      )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                {Array.isArray(detailDraft?.assigned_user_ids) && detailDraft.assigned_user_ids.length > 0 ? (
                                  <div className="flex flex-wrap items-center gap-2 overflow-hidden">
                                    {(detailDraft.assigned_user_ids || []).map((id) => {
                                      const u = (users || []).find(x => x.id === id) || (selectedTask.assigned_users || []).find(x => (typeof x === 'object' ? x.id : x) === id);
                                      const name = u ? (typeof u === 'object' ? (u.name || u.email || `#${id}`) : String(u)) : `#${id}`;
                                      return (
                                        <span key={id} className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm max-w-[240px]" style={{ paddingRight: '10px' }}>
                                          <span className="truncate">{name} | </span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-gray-500">-</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <br />
                        <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-top ">
                          <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>
                            Dosyalar
                          </label>
                          <div className="w-full !text-[18px] p-3 sm:p-4" style={{ minHeight: '24px', height: 'fit-content', backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background }}>
                            {uploadProgress && (
                              <div className="mb-3">
                                <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
                                  <div
                                    className="h-full bg-blue-600 transition-all duration-150"
                                    style={{ width: `${Math.max(0, Math.min(100, uploadProgress.percent ?? 10))}%` }}
                                  />
                                </div>
                                <div className="text-right text-xs text-gray-500 mt-1">
                                  {typeof uploadProgress.percent === 'number' ? `${uploadProgress.percent}%` : '...'}
                                </div>
                              </div>
                            )}
                            {(user?.role === 'admin' || user?.role === 'team_leader' || user?.id === selectedTask.creator?.id || user?.id === selectedTask.responsible?.id || (Array.isArray(selectedTask.assigned_users) && selectedTask.assigned_users.some(u => (typeof u === 'object' ? u.id : u) === user?.id))) ? (
                              <div className="!text-[18px]">
                                <div className="flex items-center gap-6">
                                  <input
                                    type="file"
                                    multiple
                                    accept={[
                                      'image/*',
                                      '.pdf',
                                      '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
                                      '.zip', '.rar', '.7z',
                                      '.sldprt', '.sldasm', '.slddrw',
                                      '.step', '.stp', '.iges', '.igs',
                                      '.x_t', '.x_b', '.stl', '.3mf',
                                      '.dwg', '.dxf', '.eprt', '.easm', '.edrw'
                                    ].join(',')}
                                    onChange={async (e) => {
                                      const files = Array.from(e.target.files || []);
                                      if (files.length === 0) return;
                                      try {
                                        setUploadProgress({ percent: 0, label: 'Dosyalar yükleniyor' });
                                        await Tasks.uploadAttachments(selectedTask.id, files, (p) => {
                                          setUploadProgress({ percent: p, label: 'Dosyalar yükleniyor' });
                                        });
                                        const t = await Tasks.get(selectedTask.id);
                                        setSelectedTask(t.task || t);
                                        addNotification('Dosyalar yüklendi', 'success');
                                      } catch {
                                        addNotification('Yükleme başarısız', 'error');
                                      } finally {
                                        setUploadProgress(null);
                                        e.target.value = '';
                                      }
                                    }}
                                    className="w-[150px] !text-[18px] sm:!text-[16px] text-gray-600 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-[18px] file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer file:transition-colors"
                                  />
                                  <div className="flex items-center justify-between rounded px-3 py-2 flex-1" style={{ backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
                                    <div style={{ paddingLeft: '12px', color: currentTheme.text }}>Yüklenen dosya: <span className="font-semibold">{(selectedTask.attachments || []).length}</span> adet</div>
                                    {(selectedTask.attachments || []).length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => setAttachmentsExpanded(v => !v)}
                                        className="rounded px-3 py-1 transition-colors"
                                        style={{
                                          backgroundColor: currentTheme.accent,
                                          color: '#ffffff'
                                        }}
                                        onMouseEnter={(e) => {
                                          const hex = currentTheme.accent.replace('#', '');
                                          const r = parseInt(hex.substr(0, 2), 16);
                                          const g = parseInt(hex.substr(2, 2), 16);
                                          const b = parseInt(hex.substr(4, 2), 16);
                                          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                                          e.target.style.backgroundColor = brightness > 128
                                            ? `rgba(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)}, 1)`
                                            : `rgba(${Math.min(255, r + 20)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 20)}, 1)`;
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.backgroundColor = currentTheme.accent;
                                        }}
                                      >
                                        {attachmentsExpanded ? '⮝' : '⮟'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {attachmentsExpanded && (selectedTask.attachments || []).length > 0 && (
                                  <div className="space-y-1">
                                    {(selectedTask.attachments || []).map(a => (
                                      <div key={a.id} className="flex items-center justify-between rounded px-2 py-1" style={{ paddingTop: '10px', paddingLeft: '10px', backgroundColor: currentTheme.tableBackground || currentTheme.background, borderColor: currentTheme.border, borderWidth: '1px', borderStyle: 'solid' }}>
                                        <div className="flex-1 min-w-0">
                                          <a
                                            href={(() => {
                                              // Kalıcı token tabanlı download URL - ZAMAN SINIRI YOK!
                                              if (a.download_url) {
                                                const url = a.download_url;
                                                return url.startsWith('http') ? url : `${apiOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
                                              }
                                              // Fallback: direct storage URL (eğer public storage varsa)
                                              if (a.url) return a.url;
                                              if (a.path) return `${apiOrigin}/storage/${a.path}`;
                                              return '#';
                                            })()}
                                            target="_blank"
                                            rel="noreferrer"
                                            download={a.original_name || a.name || 'dosya'}
                                            className="text-blue-600 hover:underline text-[16px] truncate block"
                                            title={a.original_name || 'Dosya'}
                                          >
                                            {a.original_name || a.name || 'Dosya'}
                                          </a>
                                          {a.size && (
                                            <div className="text-xs text-gray-500 mt-1">
                                              {(a.size / 1024 / 1024).toFixed(2)} MB
                                            </div>
                                          )}
                                        </div>
                                        {(user?.role === 'admin' || user?.role === 'team_leader' || user?.id === selectedTask.responsible?.id) && (
                                          <button
                                            onClick={async () => {
                                              try {
                                                await Tasks.deleteAttachment(a.id);
                                                const t = await Tasks.get(selectedTask.id);
                                                setSelectedTask(t.task || t);
                                                addNotification('Dosya silindi', 'success');
                                              } catch (err) {
                                                console.error('Delete attachment error:', err);
                                                addNotification('Silinemedi', 'error');
                                              }
                                            }}
                                            className="inline-flex items-center justify-center text-blue-300 hover:text-blue-200 text-[18px] buttonHoverEffect"
                                            style={{ width: '45px', height: '45px', borderRadius: '9999px', backgroundColor: 'rgba(241, 91, 21, 0.62)' }}
                                            title="Dosyayı sil"
                                          >
                                            🗑️
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between rounded px-3 py-2" style={{ backgroundColor: currentTheme.tableBackground || currentTheme.background, borderColor: currentTheme.border, borderWidth: '1px', borderStyle: 'solid' }}>
                                  <div style={{ paddingLeft: '12px', color: currentTheme.text }}>Yüklenen dosya: <span className="font-semibold">{(selectedTask.attachments || []).length}</span> adet</div>
                                  {(selectedTask.attachments || []).length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setAttachmentsExpanded(v => !v)}
                                      className="rounded px-3 py-1 transition-colors"
                                      style={{
                                        backgroundColor: currentTheme.accent,
                                        color: '#ffffff'
                                      }}
                                      onMouseEnter={(e) => {
                                        const hex = currentTheme.accent.replace('#', '');
                                        const r = parseInt(hex.substr(0, 2), 16);
                                        const g = parseInt(hex.substr(2, 2), 16);
                                        const b = parseInt(hex.substr(4, 2), 16);
                                        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                                        e.target.style.backgroundColor = brightness > 128
                                          ? `rgba(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)}, 1)`
                                          : `rgba(${Math.min(255, r + 20)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 20)}, 1)`;
                                      }}
                                      onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = currentTheme.accent;
                                      }}
                                    >
                                      {attachmentsExpanded ? '⮝' : '⮟'}
                                    </button>
                                  )}
                                </div>
                                {attachmentsExpanded && (selectedTask.attachments || []).length > 0 ? (
                                  <div className="space-y-1">
                                    {(selectedTask.attachments || []).map(a => (
                                      <div key={a.id} className="rounded px-2 py-1" style={{ backgroundColor: currentTheme.tableBackground || currentTheme.background, borderColor: currentTheme.border, borderWidth: '1px', borderStyle: 'solid' }}>
                                        <a
                                          href={(() => {
                                            // Kalıcı token tabanlı download URL - ZAMAN SINIRI YOK!
                                            if (a.download_url) {
                                              const url = a.download_url;
                                              return url.startsWith('http') ? url : `${apiOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
                                            }
                                            // Fallback: direct storage URL (eğer public storage varsa)
                                            if (a.url) return a.url;
                                            if (a.path) return `${apiOrigin}/storage/${a.path}`;
                                            return '#';
                                          })()}
                                          target="_blank"
                                          rel="noreferrer"
                                          download={a.original_name || a.name || 'dosya'}
                                          className="text-blue-600 hover:underline text-sm block"
                                          title={a.original_name || 'Dosya'}
                                        >
                                          {a.original_name || a.name || 'Dosya'}
                                        </a>
                                        {a.size && (
                                          <div className="text-xs text-gray-500 mt-1">
                                            {(a.size / 1024 / 1024).toFixed(2)} MB
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  (selectedTask.attachments || []).length === 0 && <span className="text-gray-500 text-sm">-</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <br />
                        <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-center">
                          <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>
                            Tarihler
                          </label>
                          <div className="grid grid-cols-2 gap-2 sm:gap-4 min-w-0">
                            <div className="min-w-0">
                              <label className="block !text-[24px] sm:!text-[16px] !leading-[1.2] !font-medium text-left mb-1" style={{ color: currentTheme.text }}>Başlangıç</label>
                              {(user?.role !== 'observer' && (user?.id === selectedTask.creator?.id || user?.role === 'admin')) ? (
                                <input
                                  type="date"
                                  value={editingDates.start_date}
                                  onChange={(e) => {
                                    setEditingDates(prev => ({
                                      ...prev,
                                      start_date: e.target.value
                                    }));
                                  }}
                                  className="w-[98%] min-w-0 rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] focus:outline-none"
                                  style={{
                                    minHeight: '32px',
                                    backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                    color: currentTheme.text,
                                    borderColor: currentTheme.border,
                                    borderWidth: '1px',
                                    borderStyle: 'solid'
                                  }}
                                  onFocus={(e) => {
                                    e.target.style.borderColor = currentTheme.accent;
                                    e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                  }}
                                  onBlur={(e) => {
                                    e.target.style.borderColor = currentTheme.border;
                                    e.target.style.boxShadow = 'none';
                                    handleDateChange(selectedTask.id, 'start_date', e.target.value);
                                  }}
                                />
                              ) : (
                                <div className="w-full min-w-0 rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] flex items-center truncate" style={{ minHeight: '24px', backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background, color: currentTheme.text }}>
                                  {selectedTask.start_date ? formatDateOnly(selectedTask.start_date) : '-'}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <label className="block !text-[24px] sm:!text-[16px] !leading-[1.2] !font-medium text-left mb-1" style={{ color: currentTheme.text }}>Bitiş</label>
                              {(user?.role !== 'observer' && (user?.id === selectedTask.creator?.id || user?.role === 'admin' || user?.role === 'team_leader')) ? (
                                <input
                                  type="date"
                                  value={editingDates.due_date}
                                  onChange={(e) => {
                                    setEditingDates(prev => ({
                                      ...prev,
                                      due_date: e.target.value
                                    }));
                                  }}
                                  className="w-[98%] min-w-0 rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] focus:outline-none"
                                  style={{
                                    minHeight: '32px',
                                    paddingLeft: '6px',
                                    backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                    color: currentTheme.text,
                                    borderColor: currentTheme.border,
                                    borderWidth: '1px',
                                    borderStyle: 'solid'
                                  }}
                                  onFocus={(e) => {
                                    e.target.style.borderColor = currentTheme.accent;
                                    e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                  }}
                                  onBlur={(e) => {
                                    e.target.style.borderColor = currentTheme.border;
                                    e.target.style.boxShadow = 'none';
                                    handleDateChange(selectedTask.id, 'due_date', e.target.value);
                                  }}
                                />
                              ) : (
                                <div className="w-full min-w-0 rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] sm:!text-[16px] flex items-center truncate" style={{ minHeight: '24px', backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background, color: currentTheme.text }}>
                                  {selectedTask.due_date ? formatDateOnly(selectedTask.due_date) : '-'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <br />
                        <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[240px_1fr] gap-2 sm:gap-4 items-start">
                          <label className="!text-[24px] sm:!text-[16px] font-medium text-left" style={{ color: currentTheme.text }}>
                            Görev Açıklaması
                          </label>
                          <div className="w-[99%]">
                            {user?.role === 'admin' ? (
                              <textarea
                                value={descDraft}
                                onChange={(e) => {
                                  setDescDraft(e.target.value);
                                }}
                                placeholder="Görev açıklamasını girin..."
                                className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] focus:outline-none min-h-[120px] sm:min-h-[180px] max-h-[30vh] sm:max-h-[40vh] resize-none no-scrollbar"
                                style={{
                                  backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                  color: currentTheme.text,
                                  borderColor: currentTheme.border,
                                  borderWidth: '1px',
                                  borderStyle: 'solid'
                                }}
                                onFocus={(e) => {
                                  e.target.style.borderColor = currentTheme.accent;
                                  e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                }}
                                onBlur={(e) => {
                                  e.target.style.borderColor = currentTheme.border;
                                  e.target.style.boxShadow = 'none';
                                }}
                              />
                            ) : (
                              <textarea
                                readOnly
                                value={selectedTask.description ?? ''}
                                placeholder="Görev açıklamasını girin..."
                                className="w-full rounded-lg px-3 sm:px-4 py-2 sm:py-3 !text-[24px] focus:outline-none min-h-[120px] sm:min-h-[180px] max-h-[30vh] sm:max-h-[40vh] resize-none no-scrollbar"
                                style={{
                                  backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                  color: currentTheme.text,
                                  borderColor: currentTheme.border,
                                  borderWidth: '1px',
                                  borderStyle: 'solid'
                                }}
                              />
                            )}
                          </div>
                        </div>
                        {/* Sistem Durumları (Sabit Alt Butonlar) - Sadece Admin, Takım Lideri ve Sorumlu */}
                        {(user?.role === 'admin' || user?.role === 'team_leader' || user?.id === selectedTask.responsible?.id) && (
                          <div className="bottom-0 left-0 right-0 p-4 z-[100200]" style={{ alignItems: 'center', paddingTop: '3%', paddingBottom: '1%', backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
                            <div className="flex gap-2 justify-center max-w-[1400px] mx-auto">
                              {getSystemTaskStatuses().map(status => (
                                <button
                                  key={status.value}
                                  type="button"
                                  onClick={() => setDetailDraft(prev => ({ ...(prev || {}), status: status.value }))}
                                  className="px-6 py-3 rounded-lg text-sm font-medium transition-colors flex-1"
                                  style={{
                                    backgroundColor: (detailDraft?.status || selectedTask.status) === status.value ? status.color : currentTheme.border,
                                    color: (detailDraft?.status || selectedTask.status) === status.value ? '#ffffff' : currentTheme.text
                                  }}
                                  onMouseEnter={(e) => {
                                    if ((detailDraft?.status || selectedTask.status) !== status.value) {
                                      e.target.style.backgroundColor = currentTheme.accent;
                                      e.target.style.color = '#ffffff';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if ((detailDraft?.status || selectedTask.status) !== status.value) {
                                      e.target.style.backgroundColor = currentTheme.border;
                                      e.target.style.color = currentTheme.text;
                                    }
                                  }}
                                >
                                  {status.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="w-[480px] md:w-[420px] lg:w-[480px] max-w-[48%] shrink-0 flex flex-col overflow-hidden" style={{ backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
                      <div className="border-b flex-none" style={{ padding: '10px', borderColor: currentTheme.border }}>
                        <h3 className="text-lg md:text-xl font-semibold" style={{ color: currentTheme.text }}>👁️ Son Görüntüleme</h3>
                        <div className="mt-3 space-y-2">
                          {Array.isArray(taskLastViews) && taskLastViews.length > 0 ? (
                            taskLastViews.map(v => (
                              <div key={v.user_id} className="flex items-center justify-between text-sm">
                                <div className="truncate mr-3" style={{ color: currentTheme.text }}>
                                  {v.name}
                                  {v.is_responsible ? <span className="ml-2 text-xs" style={{ color: currentTheme.accent }}></span> : null}
                                </div>
                                <div className="whitespace-nowrap" style={{ color: currentTheme.textSecondary || currentTheme.text }}>{v.last_viewed_at ? formatDate(v.last_viewed_at) : '-'}</div>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm" style={{ color: currentTheme.textSecondary || currentTheme.text }}>Kayıt bulunamadı</div>
                          )}
                        </div>
                      </div>
                      <div className="border-b flex-none" style={{ padding: '1px', borderColor: currentTheme.border }}>
                        <div className="flex items-center justify-between" style={{ paddingLeft: '10px', paddingRight: '10px' }}>
                          <h3 className="text-lg md:text-xl font-semibold" style={{ color: currentTheme.text }}>📢 Görev Geçmişi</h3>
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => { if (user?.role === 'admin') setHistoryDeleteMode(v => !v); }}
                              className="rounded px-2 py-1 inline-flex items-center justify-center text-[18px] transition-colors"
                              style={{
                                width: '45px',
                                height: '45px',
                                borderRadius: '9999px',
                                backgroundColor: currentTheme.border,
                                color: currentTheme.text
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = currentTheme.accent;
                                e.target.style.color = '#ffffff';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = currentTheme.border;
                                e.target.style.color = currentTheme.text;
                              }}
                              title={user?.role === 'admin' ? (historyDeleteMode ? 'Silme modunu kapat' : 'Silme modunu aç') : 'Sadece admin'}
                            >🗑️</button>)}
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto no-scrollbar space-y-4" style={{ padding: '10px' }}>
                        {Array.isArray(taskHistory) && taskHistory.length > 0 ? (
                          taskHistory.filter(h => !h.field.includes('_color')).map((h) => (
                            <div key={h.id} className="relative p-3 rounded max-w-full overflow-hidden" style={{ backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background, borderColor: currentTheme.border, borderWidth: '1px', borderStyle: 'solid' }}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0 max-w-full overflow-hidden pr-8">
                                  <div className="text-[11px] mb-1" style={{ color: currentTheme.accent }}>{formatDateOnly(h.created_at)}</div>
                                  {h.field === 'comment' ? (
                                    <div className="text-sm max-w-full overflow-hidden">
                                      <span className="font-medium" style={{ color: currentTheme.text }}>{h.user?.name || 'Kullanıcı'}:<br></br></span>{' '}
                                      <span className="break-words whitespace-normal block max-w-full" style={{ color: currentTheme.text }}>{renderHistoryValue(h.field, h.new_value)}</span>
                                    </div>
                                  ) : (h.new_value && typeof h.new_value === 'string' && h.new_value.trim().length > 0 &&
                                    !h.field.includes('status') && !h.field.includes('priority') &&
                                    !h.field.includes('task_type') && !h.field.includes('date') &&
                                    !h.field.includes('attachments') && !h.field.includes('assigned') &&
                                    !h.field.includes('responsible') && !h.field.includes('assigned_users') &&
                                    !h.field.includes('_color') && // Renk değişikliklerini gizle
                                    !h.new_value.toLowerCase().includes('dosya') &&
                                    !h.new_value.toLowerCase().includes('eklendi') &&
                                    !h.new_value.toLowerCase().includes('silindi') &&
                                    !h.new_value.toLowerCase().includes('değiştirildi') &&
                                    !h.new_value.toLowerCase().includes('→')) ? (
                                    <div className="text-sm max-w-full overflow-hidden">
                                      <span className="font-medium" style={{ color: currentTheme.text }}>{h.user?.name || 'Kullanıcı'}:<br></br></span>{' '}
                                      <span className="break-words whitespace-normal block max-w-full" style={{ color: currentTheme.text }}>{h.new_value}</span>
                                    </div>
                                  ) : h.field === 'attachments' ? (
                                    <div className="text-sm" style={{ color: currentTheme.text }}>
                                      {(() => {
                                        const normalizeToNames = (val) => {
                                          let arr;
                                          try {
                                            const v = typeof val === 'string' ? JSON.parse(val) : val;
                                            arr = Array.isArray(v) ? v : (v != null ? [v] : []);
                                          } catch {
                                            arr = val != null ? [val] : [];
                                          }
                                          return arr.map((item) => {
                                            if (item == null) return '';
                                            if (typeof item === 'string') return item;
                                            if (typeof item === 'object') {
                                              return (
                                                item.original_name ||
                                                item.name ||
                                                item.filename ||
                                                item.file_name ||
                                                item.title ||
                                                item.path ||
                                                item.url ||
                                                JSON.stringify(item)
                                              );
                                            }
                                            return String(item);
                                          });
                                        };
                                        const added = normalizeToNames(h.new_value);
                                        const removed = normalizeToNames(h.old_value);
                                        const actor = h.user?.name || 'Kullanıcı';
                                        if (added.length > 0 && removed.length === 0) {
                                          return (
                                            <>
                                              <span className="font-medium" style={{ color: currentTheme.text }}>{actor}</span> dosya ekledi.
                                              <ul className="mt-1 list-disc list-inside space-y-0.5">
                                                {added.map((name, idx) => (
                                                  <li key={`a-${idx}`} className="break-all" style={{ color: currentTheme.text }}>{name}</li>
                                                ))}
                                              </ul>
                                            </>
                                          );
                                        }
                                        if (removed.length > 0 && added.length === 0) {
                                          return (
                                            <>
                                              <span className="font-medium" style={{ color: currentTheme.text }}>{actor}</span> dosya sildi.
                                              <ul className="mt-1 list-disc list-inside space-y-0.5">
                                                {removed.map((name, idx) => (
                                                  <li key={`r-${idx}`} className="break-all" style={{ color: currentTheme.text }}>{name}</li>
                                                ))}
                                              </ul>
                                            </>
                                          );
                                        }
                                        return (
                                          <>
                                            <span className="font-medium" style={{ color: currentTheme.text }}>{actor}</span> dosya ekledi/sildi.
                                            {added.length > 0 && (
                                              <>
                                                <div className="mt-1" style={{ color: currentTheme.textSecondary || currentTheme.text }}>Eklendi:</div>
                                                <ul className="list-disc list-inside space-y-0.5">
                                                  {added.map((name, idx) => (
                                                    <li key={`a2-${idx}`} className="break-all" style={{ color: currentTheme.text }}>{name}</li>
                                                  ))}
                                                </ul>
                                              </>
                                            )}
                                            {removed.length > 0 && (
                                              <>
                                                <div className="mt-1" style={{ color: currentTheme.textSecondary || currentTheme.text }}>Silindi:</div>
                                                <ul className="list-disc list-inside space-y-0.5">
                                                  {removed.map((name, idx) => (
                                                    <li key={`r2-${idx}`} className="break-all" style={{ color: currentTheme.text }}>{name}</li>
                                                  ))}
                                                </ul>
                                              </>
                                            )}
                                          </>
                                        );
                                      })()}
                                    </div>
                                  ) : h.field === 'assigned_users' ? (
                                    <div className="text-sm">
                                      {(() => {
                                        const normalizeToNames = (val) => {
                                          let arr;
                                          try {
                                            const v = typeof val === 'string' ? JSON.parse(val) : val;
                                            arr = Array.isArray(v) ? v : (v != null ? [v] : []);
                                          } catch {
                                            arr = val != null ? [val] : [];
                                          }
                                          return arr.map((id) => {
                                            return resolveUserName(id);
                                          });
                                        };
                                        const oldUsers = normalizeToNames(h.old_value);
                                        const newUsers = normalizeToNames(h.new_value);
                                        const added = newUsers.filter(user => !oldUsers.includes(user));
                                        const removed = oldUsers.filter(user => !newUsers.includes(user));

                                        const actor = h.user?.name || 'Kullanıcı';
                                        if (added.length > 0 && removed.length === 0) {
                                          return (
                                            <>
                                              <span className="font-medium" style={{ color: currentTheme.text }}>{actor}</span> atanan kullanıcıları güncelledi.
                                              <div className="mt-1" style={{ color: currentTheme.textSecondary || currentTheme.text }}>Atanan Kullanıcı:</div>
                                              <ul className="mt-1 list-disc list-inside space-y-0.5">
                                                {added.map((name, idx) => (
                                                  <li key={`a-${idx}`} className="break-all" style={{ color: currentTheme.text }}>{name}</li>
                                                ))}
                                              </ul>
                                            </>
                                          );
                                        }
                                        if (removed.length > 0 && added.length === 0) {
                                          return (
                                            <>
                                              <span className="font-medium" style={{ color: currentTheme.text }}>{actor}</span> atanan kullanıcıları güncelledi.
                                              <div className="mt-1" style={{ color: currentTheme.textSecondary || currentTheme.text }}>Kaldırılan Kullanıcı:</div>
                                              <ul className="mt-1 list-disc list-inside space-y-0.5">
                                                {removed.map((name, idx) => (
                                                  <li key={`r-${idx}`} className="break-all" style={{ color: currentTheme.text }}>{name}</li>
                                                ))}
                                              </ul>
                                            </>
                                          );
                                        }
                                        return (
                                          <>
                                            <span className="font-medium" style={{ color: currentTheme.text }}>{actor}</span> atanan kullanıcıları güncelledi.
                                            {added.length > 0 && (
                                              <>
                                                <div className="mt-1" style={{ color: currentTheme.textSecondary || currentTheme.text }}>Atanan Kullanıcı:</div>
                                                <ul className="list-disc list-inside space-y-0.5">
                                                  {added.map((name, idx) => (
                                                    <li key={`a2-${idx}`} className="break-all" style={{ color: currentTheme.text }}>{name}</li>
                                                  ))}
                                                </ul>
                                              </>
                                            )}
                                            {removed.length > 0 && (
                                              <>
                                                <div className="mt-1" style={{ color: currentTheme.textSecondary || currentTheme.text }}>Kaldırılan Kullanıcı:</div>
                                                <ul className="list-disc list-inside space-y-0.5">
                                                  {removed.map((name, idx) => (
                                                    <li key={`r2-${idx}`} className="break-all" style={{ color: currentTheme.text }}>{name}</li>
                                                  ))}
                                                </ul>
                                              </>
                                            )}
                                          </>
                                        );
                                      })()}
                                    </div>
                                  ) : renderFieldLabel(h.field) ? (
                                    <div className="text-sm">
                                      <span className="font-medium" style={{ color: currentTheme.text }}>{h.user?.name || 'Kullanıcı'}</span>{' '}
                                      {renderFieldLabel(h.field)} değiştirdi <br></br> "<span style={{ color: currentTheme.text }}>{renderHistoryValue(h.field, h.old_value)}</span> →{' '}
                                      <span style={{ color: currentTheme.text }}>{renderHistoryValue(h.field, h.new_value)}</span>"
                                    </div>
                                  ) : null}
                                </div>
                                {(user?.role === 'admin' && historyDeleteMode && h.field === 'comment') && (
                                  <button
                                    onClick={async () => { try { await Tasks.deleteHistory(selectedTask.id, h.id); const h2 = await Tasks.getHistory(selectedTask.id); setTaskHistory(Array.isArray(h2) ? h2 : []); setTaskHistories(prev => ({ ...prev, [selectedTask.id]: Array.isArray(h2) ? h2 : [] })); addNotification('Yorum silindi', 'success'); } catch (err) { console.error('Delete history error:', err); addNotification('Silinemedi', 'error'); } }}
                                    className="inline-flex items-center justify-center text-[18px] transition-colors"
                                    style={{
                                      width: '45px',
                                      height: '45px',
                                      borderRadius: '9999px',
                                      backgroundColor: currentTheme.border,
                                      color: currentTheme.text,
                                      marginRight: '3px',
                                      marginTop: '3px'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.target.style.backgroundColor = currentTheme.accent;
                                      e.target.style.color = '#ffffff';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.backgroundColor = currentTheme.border;
                                      e.target.style.color = currentTheme.text;
                                    }}
                                    title="Yorumu sil"
                                  >🗑️</button>
                                )}
                              </div>
                              <div className="sticky bottom-0 w-full border-t px-8 py-5" style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.tableBackground || currentTheme.background }}></div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4" style={{ color: currentTheme.textSecondary || currentTheme.text }}>Henüz görev geçmişi bulunmuyor</div>
                        )}

                        {Array.isArray(comments) && comments.map((c) => (
                          <div key={c.id} className="p-3 rounded" style={{ backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background, borderColor: currentTheme.border, borderWidth: '1px', borderStyle: 'solid' }}>
                            <div className="text-[11px] mb-1" style={{ color: currentTheme.textSecondary || currentTheme.text }}>{formatDate(c.timestamp)}</div>
                            <div className="text-sm">
                              <span className="font-medium" style={{ color: currentTheme.text }}>{c.author}</span> <span style={{ color: currentTheme.text }}>{c.text}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {user?.role !== 'observer' && (
                        <div className="border-t flex-none p-4" style={{ borderColor: currentTheme.border }}>
                          <div className="relative flex items-center rounded-2xl py-2" style={{ backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background, borderColor: currentTheme.border, borderWidth: '1px', borderStyle: 'solid' }}>
                            <textarea
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="Yorum yap/Not ekle"
                              className="flex-1 bg-transparent border-none outline-none px-4 resize-none"
                              style={{
                                height: '80px',
                                overflowY: 'auto',
                                fontSize: '16px',
                                color: currentTheme.text,
                                lineHeight: '1'
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleAddComment();
                                }
                              }}
                            />
                            <div className="pr-3 flex items-center h-[100%] border-0" style={{ height: '80px', backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background }}>
                              <button
                                onClick={handleAddComment}
                                disabled={!newComment.trim()}
                                className="rounded-full flex items-center justify-center transition-all duration-300"
                                style={{
                                  height: '80px',
                                  backgroundColor: newComment.trim() ? currentTheme.accent : currentTheme.border,
                                  boxShadow: newComment.trim() ? `0 4px 12px ${currentTheme.accent}66` : '0 2px 4px rgba(0, 0, 0, 0.2)',
                                  transform: 'scale(0.8)',
                                  cursor: newComment.trim() ? 'pointer' : 'not-allowed',
                                  border: newComment.trim() ? `2px solid ${currentTheme.border}` : `2px solid ${currentTheme.border}`,
                                  opacity: newComment.trim() ? '1' : '0.6',
                                  color: '#ffffff'
                                }}
                                onMouseEnter={(e) => {
                                  if (newComment.trim()) {
                                    const hex = currentTheme.accent.replace('#', '');
                                    const r = parseInt(hex.substr(0, 2), 16);
                                    const g = parseInt(hex.substr(2, 2), 16);
                                    const b = parseInt(hex.substr(4, 2), 16);
                                    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                                    e.target.style.backgroundColor = brightness > 128
                                      ? `rgba(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)}, 1)`
                                      : `rgba(${Math.min(255, r + 20)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 20)}, 1)`;
                                    e.target.style.transform = 'scale(0.8)';
                                    e.target.style.boxShadow = `0 6px 16px ${currentTheme.accent}80`;
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (newComment.trim()) {
                                    e.target.style.backgroundColor = currentTheme.accent;
                                    e.target.style.transform = 'scale(0.8)';
                                    e.target.style.boxShadow = `0 4px 12px ${currentTheme.accent}66`;
                                  }
                                }}
                              >
                                <span className="text-[40px]">⮝</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
          }
          {
            showUserProfile && createPortal(
              <div className="fixed inset-0 z-[999980]" style={{ pointerEvents: 'auto' }}>
                <div className="absolute inset-0" onClick={() => setShowUserProfile(false)} style={{ pointerEvents: 'auto', backgroundColor: `${currentTheme.background}CC` }} />
                <div className="relative z-10 flex min-h-full items-center justify-center p-4" style={{ pointerEvents: 'auto' }}>
                  <div className="fixed z-[100210] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[800px] max-h-[85vh] rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,.6)] overflow-hidden" style={{
                    pointerEvents: 'auto',
                    backgroundColor: currentTheme.tableBackground || currentTheme.background,
                    borderColor: currentTheme.border,
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    color: currentTheme.text
                  }} onClick={(e) => e.stopPropagation()}>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3"
                      style={{
                        borderBottom: `1px solid ${currentTheme.border}`,
                        backgroundColor: currentTheme.background
                      }}>
                      <div></div>
                      <h2 className="font-semibold text-center" style={{ color: currentTheme.text }}>Profil</h2>
                      <div className="justify-self-end">
                        <button onClick={() => setShowUserProfile(false)}
                          className="rounded px-2 py-1 transition-colors"
                          style={{ color: currentTheme.textSecondary, backgroundColor: 'transparent' }}
                          onMouseEnter={(e) => {
                            e.target.style.color = currentTheme.text;
                            e.target.style.backgroundColor = `${currentTheme.border}30`;
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.color = currentTheme.textSecondary;
                            e.target.style.backgroundColor = 'transparent';
                          }}>✕</button>
                      </div>
                    </div>

                    <div className="p-4 xs:p-6 sm:p-8 space-y-4 xs:space-y-6 sm:space-y-8 overflow-y-auto no-scrollbar" style={{ maxHeight: 'calc(85vh - 80px)' }}>
                      <div className="rounded-2xl p-6 mx-4" style={{ padding: '15px', backgroundColor: `${currentTheme.border}20` }}>
                        <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 260px' }}>
                          <div>
                            <div className="grid items-center gap-x-8 gap-y-4" style={{ gridTemplateColumns: '120px 1fr' }}>
                              <div className="!text-[18px]" style={{ color: currentTheme.textSecondary }}>İsim</div>
                              <div className="font-semibold !text-[18px] truncate" style={{ color: currentTheme.text }}>{user?.name || 'Belirtilmemiş'}</div>

                              <div className="!text-[18px]" style={{ color: currentTheme.textSecondary }}>E-posta</div>
                              <div className="!text-[18px] truncate" style={{ color: currentTheme.text }}>{user?.email || 'Belirtilmemiş'}</div>

                              <div className="!text-[18px]" style={{ color: currentTheme.textSecondary }}>Rol</div>
                              <div className="font-semibold !text-[18px] truncate" style={{ color: currentTheme.text }}>{getRoleText(user?.role)}</div>
                            </div>
                          </div>
                          <div className="rounded-2xl p-4" style={{ backgroundColor: `${currentTheme.border}20` }}>
                            {user?.role !== 'observer' && (
                              <button
                                className="w-full h-full rounded px-4 py-2 flex items-center justify-center transition-colors"
                                style={{ backgroundColor: currentTheme.accent, color: '#ffffff' }}
                                onMouseEnter={(e) => {
                                  const hex = currentTheme.accent.replace('#', '');
                                  const r = parseInt(hex.substr(0, 2), 16);
                                  const g = parseInt(hex.substr(2, 2), 16);
                                  const b = parseInt(hex.substr(4, 2), 16);
                                  e.target.style.backgroundColor = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = currentTheme.accent;
                                }}
                                onClick={async () => {
                                  setWeeklyUserId(null); // Kendi hedeflerini göster
                                  setShowWeeklyGoals(true);
                                  await loadWeeklyGoals(null, null); // Kendi hedeflerini yükle
                                }}
                              >
                                <span className="!text-[40px]">🎯</span>
                                <span className="!text-[24px]">Haftalık Hedefler</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="sticky bottom-0 w-full px-8 py-5 backdrop-blur" style={{ borderTop: `1px solid ${currentTheme.border}`, backgroundColor: `${currentTheme.background}E6` }}></div>
                      <div className="rounded-2xl p-6 mx-4" style={{ backgroundColor: `${currentTheme.border}20` }}>
                        <div className="!text-[24px] font-medium mb-4 flex items-center" style={{ paddingLeft: '15px', color: currentTheme.text }}>
                          🔐 <span className="ml-2">Şifre Değiştir</span>
                        </div>
                        <PasswordChangeForm onDone={() => setShowUserProfile(false)} currentTheme={currentTheme} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )
          }

          {
            showTeamModal && createPortal(
              <div className="fixed inset-0 z-[999994]" style={{ pointerEvents: 'auto' }}>
                <div className="absolute inset-0" onClick={() => setShowTeamModal(false)} style={{ pointerEvents: 'auto', backgroundColor: `${currentTheme.background}CC` }} />
                <div className="relative z-10 flex min-h-full items-center justify-center p-4" style={{ pointerEvents: 'auto' }}>
                  <div className="fixed z-[100230] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[900px] max-h-[80vh] rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,.6)] overflow-hidden" style={{
                    pointerEvents: 'auto',
                    backgroundColor: currentTheme.tableBackground || currentTheme.background,
                    borderColor: currentTheme.border,
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    color: currentTheme.text
                  }} onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center px-5 py-3 relative"
                      style={{
                        borderBottom: `1px solid ${currentTheme.border}`,
                        backgroundColor: currentTheme.background
                      }}>
                      <h2 className="font-semibold text-center" style={{ color: currentTheme.text }}>Takım</h2>
                      <button onClick={() => setShowTeamModal(false)} className="absolute transition-colors" style={{ right: '16px', top: '50%', transform: 'translateY(-50%)', color: currentTheme.textSecondary }}
                        onMouseEnter={(e) => {
                          e.target.style.color = currentTheme.text;
                          e.target.style.backgroundColor = `${currentTheme.border}30`;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.color = currentTheme.textSecondary;
                          e.target.style.backgroundColor = 'transparent';
                        }}>
                        <span className="rounded px-2 py-1">✕</span>
                      </button>
                    </div>
                    <div className="p-4 space-y-3 overflow-y-auto no-scrollbar" style={{ maxHeight: 'calc(80vh - 120px)' }}>
                      {Array.isArray(teamMembers) && teamMembers.filter(m => m.role !== 'observer').length > 0 ? (
                        teamMembers.filter(m => m.role !== 'observer').map(m => (
                          <div key={m.id} className="flex items-center text-[24px] justify-between rounded px-3 py-2 transition-colors"
                            style={{
                              paddingTop: '20px',
                              paddingBottom: '20px',
                              paddingLeft: '10px',
                              paddingRight: '10px',
                              backgroundColor: `${currentTheme.border}20`
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${currentTheme.border}30`}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = `${currentTheme.border}20`}>
                            <div>
                              <div className="font-medium" style={{ color: currentTheme.text }}>{m.name}</div>
                              <div className="text-sm" style={{ color: currentTheme.textSecondary }}>{m.email}</div>
                            </div>
                            <button className="rounded px-3 py-2 transition-colors"
                              style={{ backgroundColor: currentTheme.accent, color: '#ffffff', height: '70px' }}
                              onMouseEnter={(e) => {
                                const hex = currentTheme.accent.replace('#', '');
                                const r = parseInt(hex.substr(0, 2), 16);
                                const g = parseInt(hex.substr(2, 2), 16);
                                const b = parseInt(hex.substr(4, 2), 16);
                                e.target.style.backgroundColor = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = currentTheme.accent;
                              }}
                              onClick={async () => {
                                setShowTeamModal(false); setWeeklyUserId(m.id);
                                setShowWeeklyGoals(true); await loadWeeklyGoals(null, m.id);
                              }}>Hedefleri Aç</button>
                          </div>
                        ))
                      ) : (
                        <div className="text-neutral-300">
                          {bulkLeaderId ? 'Bu liderin takım üyesi bulunamadı.' : 'Takım üyesi bulunamadı.'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )
          }

          {
            showUserPanel && createPortal(
              <div className="fixed inset-0 z-[999993]" style={{ pointerEvents: 'auto' }}>
                <div className="absolute inset-0" onClick={() => setShowUserPanel(false)} style={{ pointerEvents: 'auto', backgroundColor: `${currentTheme.background}CC` }} />
                <div className="relative flex min-h-full items-center justify-center p-4" style={{ pointerEvents: 'auto' }}>
                  <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[1445px] max-h-[85vh] rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,.6)] overflow-hidden"
                    style={{
                      pointerEvents: 'auto',
                      backgroundColor: currentTheme.tableBackground || currentTheme.background,
                      borderColor: currentTheme.border,
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      color: currentTheme.text
                    }} onClick={(e) => e.stopPropagation()}>
                    <div className="border-b flex-none" style={{ backgroundColor: currentTheme.background, borderColor: currentTheme.border, padding: '0px 10px' }}>
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                        <div className="justify-self-start"></div>
                        <h2 className="text-xl md:text-2xl font-semibold text-center" style={{ color: currentTheme.text }}>Kullanıcı Yönetimi</h2>
                        <div className="justify-self-end">
                          <button
                            onClick={() => setShowUserPanel(false)}
                            className="rounded-lg px-2 py-1 transition-colors"
                            style={{ color: currentTheme.textSecondary, backgroundColor: 'transparent' }}
                            onMouseEnter={(e) => {
                              e.target.style.color = currentTheme.text;
                              e.target.style.backgroundColor = `${currentTheme.border}30`;
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.color = currentTheme.textSecondary;
                              e.target.style.backgroundColor = 'transparent';
                            }}
                            aria-label="Kapat"
                          >✕</button>
                        </div>
                      </div>
                    </div>
                    <div className="flex min-w-0 overflow-y-auto no-scrollbar" style={{ height: 'calc(100vh - 50px)', borderLeft: `1px solid ${currentTheme.border}`, borderRight: `1px solid ${currentTheme.border}` }}>
                      <div className="w-2/5 min-w-0 space-y-6" style={{ paddingRight: '20px', paddingLeft: '20px', borderRight: `1px solid ${currentTheme.border}` }}>
                        {user?.role === 'admin' && (
                          <div className="pt-4" style={{ paddingTop: '5px' }}>
                            <div className="font-medium mb-2 !text-[32px]" style={{ paddingBottom: '10px' }}>Yeni Kullanıcı Ekle</div>
                            <AdminCreateUser />
                          </div>
                        )}
                      </div>
                      <div className="w-3/5 shrink-0 overflow-y-auto no-scrollbar" style={{ padding: '20px', backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
                        <div className="flex text-[24px] font-semibold mb-4 space-y-3" style={{ marginBottom: '10px' }}>
                          <span style={{ color: currentTheme.text }}>Kullanıcılar</span> <span className="w-[50px]"></span>
                          <input
                            type="text"
                            placeholder="Kullanıcı ara..."
                            value={userSearchTerm}
                            onChange={(e) => setUserSearchTerm(e.target.value)}
                            className="w-full rounded-lg border px-3 py-2 !text-[24px] focus:outline-none"
                            style={{
                              color: currentTheme.text,
                              backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                              borderColor: currentTheme.border,
                              borderWidth: '1px',
                              borderStyle: 'solid'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = currentTheme.accent;
                              e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                              e.target.setAttribute('autocomplete', 'off');
                              e.target.setAttribute('autocorrect', 'off');
                              e.target.setAttribute('autocapitalize', 'off');
                              e.target.setAttribute('spellcheck', 'false');
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = currentTheme.border;
                              e.target.style.boxShadow = 'none';
                            }}
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck="false"
                            data-lpignore="true"
                            data-form-type="other"
                            name="user-search"
                            id="user-search"
                            onInput={(e) => {
                              if (e.target.value && !e.isTrusted) {
                                e.target.value = '';
                                setUserSearchTerm('');
                              }
                            }}
                          />
                        </div>
                        <div className="text-[16px] font-semibold mb-4 space-y-3">
                          <div className="flex items-center gap-3 border rounded-[20px] !w-[100%] justify-end" style={{ marginBottom: '10px', paddingTop: '10px', paddingBottom: '10px', backgroundColor: currentTheme.accent + '20', borderColor: currentTheme.border }}>
                            <span className="text-[18px] whitespace-nowrap" style={{ marginRight: '30px', color: currentTheme.accent }}>
                              {selectedUsers.length} kullanıcı seçildi ▶
                            </span>
                            <select
                              value={bulkLeaderId}
                              onChange={(e) => setBulkLeaderId(e.target.value)}
                              style={{
                                paddingLeft: '5px',
                                marginRight: '30px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                color: currentTheme.text,
                                borderColor: currentTheme.border,
                                borderWidth: '1px',
                                borderStyle: 'solid'
                              }}
                              className="rounded !py-2 !text-[16px] focus:outline-none !h-[35px] !max-w-[250px] !w-[250px] truncate"
                              onFocus={(e) => {
                                e.target.style.borderColor = currentTheme.accent;
                                e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = currentTheme.border;
                                e.target.style.boxShadow = 'none';
                              }}
                              title={bulkLeaderId && bulkLeaderId !== 'remove' ? users.find(u => u.id == bulkLeaderId)?.name + ' (' + getRoleText(users.find(u => u.id == bulkLeaderId)?.role) + ')' : bulkLeaderId === 'remove' ? 'Lideri Kaldır' : 'Lider Seçin'}
                            >
                              <option value="">Lider Seçin</option>
                              <option value="remove">Lideri Kaldır</option>
                              {Array.isArray(users) && users
                                .filter(u => u.role === 'team_leader' || u.role === 'admin')
                                .map(leader => (
                                  <option key={`bulk-${leader.id}`} value={leader.id} title={`${leader.name} (${getRoleText(leader.role)})`}>
                                    {leader.name} ({getRoleText(leader.role)})
                                  </option>
                                ))}
                            </select>
                            <button
                              onClick={async () => {
                                if (!bulkLeaderId) return;
                                const leaderId = bulkLeaderId === 'remove' ? null : parseInt(bulkLeaderId);
                                const leaderName = bulkLeaderId === 'remove' ? 'Lideri Kaldır' :
                                  users.find(u => u.id === leaderId)?.name || 'Bilinmeyen';
                                if (!confirm(`${selectedUsers.length} kullanıcıya "${leaderName}" lider olarak atanacak. Devam etmek istiyor musunuz?`)) {
                                  return;
                                }
                                try {
                                  setLoading(true);
                                  let successCount = 0;
                                  let errorCount = 0;

                                  for (const userId of selectedUsers) {
                                    try {
                                      await updateUserAdmin(userId, { leader_id: leaderId });
                                      successCount++;
                                    } catch (err) {
                                      console.error(`User ${userId} update error:`, err);
                                      errorCount++;
                                    }
                                  }

                                  if (successCount > 0) {
                                    addNotification(`${successCount} kullanıcı güncellendi`, 'success');
                                    await loadUsers();
                                  }
                                  if (errorCount > 0) {
                                    addNotification(`${errorCount} kullanıcı güncellenemedi`, 'error');
                                  }

                                  setSelectedUsers([]);
                                  setBulkLeaderId('');
                                } catch (err) {
                                  console.error('Bulk update error:', err);
                                  addNotification('Toplu güncelleme başarısız', 'error');
                                } finally {
                                  setLoading(false);
                                }
                              }}
                              disabled={!bulkLeaderId}
                              className="px-4 py-2 rounded text-sm transition-colors"
                              style={{
                                marginRight: '20px',
                                backgroundColor: !bulkLeaderId ? currentTheme.border : currentTheme.accent,
                                color: '#ffffff',
                                cursor: !bulkLeaderId ? 'not-allowed' : 'pointer',
                                opacity: !bulkLeaderId ? '0.6' : '1'
                              }}
                              onMouseEnter={(e) => {
                                if (bulkLeaderId) {
                                  const hex = currentTheme.accent.replace('#', '');
                                  const r = parseInt(hex.substr(0, 2), 16);
                                  const g = parseInt(hex.substr(2, 2), 16);
                                  const b = parseInt(hex.substr(4, 2), 16);
                                  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                                  e.target.style.backgroundColor = brightness > 128
                                    ? `rgba(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)}, 1)`
                                    : `rgba(${Math.min(255, r + 20)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 20)}, 1)`;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (bulkLeaderId) {
                                  e.target.style.backgroundColor = currentTheme.accent;
                                }
                              }}
                            >
                              Uygula
                            </button>
                            <span className="!px-3"></span>
                            <button
                              onClick={() => { setSelectedUsers([]); setBulkLeaderId(''); }}
                              className="px-3 py-2 rounded text-sm transition-colors"
                              style={{
                                marginRight: '20px',
                                backgroundColor: currentTheme.border,
                                color: currentTheme.text
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = currentTheme.accent;
                                e.target.style.color = '#ffffff';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = currentTheme.border;
                                e.target.style.color = currentTheme.text;
                              }}
                            >
                              İptal
                            </button>
                          </div>
                        </div>

                        <div className="sticky bottom-0 w-full px-8 py-5" style={{ backgroundColor: currentTheme.tableBackground || currentTheme.background }}></div>
                        {user?.role === 'admin' ? (
                          <div className="space-y-3">
                            {Array.isArray(users) && users
                              .filter(u => {
                                // Arama terimi filtresi
                                if (userSearchTerm) {
                                  const searchTerm = userSearchTerm.toLowerCase();
                                  const matchesSearch = (
                                    u.name?.toLowerCase().includes(searchTerm) ||
                                    u.email?.toLowerCase().includes(searchTerm) ||
                                    getRoleText(u.role)?.toLowerCase().includes(searchTerm)
                                  );
                                  if (!matchesSearch) return false;
                                }
                                return true;
                              })
                              .map((u) => {
                                const hasResetRequest = passwordResetRequests.some(req => req.user_id === u.id);
                                return (
                                  <div
                                    key={u.id}
                                    className="rounded-lg px-4 py-4 gap-4 transition-colors"
                                    style={{
                                      backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                      borderColor: hasResetRequest ? '#ef4444' : currentTheme.border,
                                      borderWidth: hasResetRequest ? '2px' : '1px',
                                      borderStyle: 'solid'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = currentTheme.accent + '20';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background;
                                    }}
                                  >
                                    <div className="flex items-center justify-between" style={{ paddingRight: '5px' }}>
                                      <div className="min-w-0 flex text-[16px] items-center gap-3">
                                        <input
                                          type="checkbox"
                                          checked={selectedUsers.includes(u.id)}
                                          disabled={u.role === 'admin' || u.role === 'team_leader' || u.role === 'observer'}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setSelectedUsers(prev => [...prev, u.id]);
                                            } else {
                                              setSelectedUsers(prev => prev.filter(id => id !== u.id));
                                            }
                                          }}
                                          className={`w-4 h-4 rounded focus:ring-blue-500 ${u.role === 'admin' || u.role === 'team_leader' || u.role === 'observer'
                                            ? 'opacity-50 cursor-not-allowed'
                                            : 'cursor-pointer'
                                            }`}
                                          style={{
                                            scale: '3',
                                            marginLeft: '15px',
                                            marginRight: '20px',
                                            backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                            borderColor: currentTheme.border,
                                            accentColor: currentTheme.accent
                                          }}
                                        />
                                        <div className="flex-1 min-w-0 max-w-[300px]">
                                          <div className="text-base font-medium truncate" style={{ color: currentTheme.text }} title={u.name}>{u.name}</div>
                                          <div className="text-xs truncate mt-1" style={{ color: currentTheme.textSecondary || currentTheme.text }} title={u.email}>{u.email}</div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3 shrink-0">
                                        {(u.role === 'team_member') && (
                                          <select
                                            className="!text-[16px] rounded px-3 py-2 focus:outline-none !max-w-[200px] !w-[200px] truncate transition-colors"
                                            value={u.leader_id || ''}
                                            onChange={async (e) => {
                                              const val = e.target.value ? parseInt(e.target.value) : null;
                                              try {
                                                await updateUserAdmin(u.id, { leader_id: val });
                                                addNotification('Lider ataması güncellendi', 'success');
                                                await loadUsers();
                                              } catch (err) {
                                                console.error('Leader assign error:', err);
                                                addNotification(err?.response?.data?.message || 'Lider atanamadı', 'error');
                                              }
                                            }}
                                            style={{
                                              padding: '5px',
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                              whiteSpace: 'nowrap',
                                              backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                              color: currentTheme.text,
                                              borderColor: currentTheme.border,
                                              borderWidth: '1px',
                                              borderStyle: 'solid'
                                            }}
                                            onFocus={(e) => {
                                              e.target.style.borderColor = currentTheme.accent;
                                              e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                            }}
                                            onBlur={(e) => {
                                              e.target.style.borderColor = currentTheme.border;
                                              e.target.style.boxShadow = 'none';
                                            }}
                                            onMouseEnter={(e) => {
                                              e.target.style.backgroundColor = currentTheme.accent + '20';
                                            }}
                                            onMouseLeave={(e) => {
                                              e.target.style.backgroundColor = currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background;
                                            }}
                                            title={u.leader_id ? users.find(x => x.id === u.leader_id)?.name + ' (' + getRoleText(users.find(x => x.id === u.leader_id)?.role) + ')' : 'Lider Yok'}
                                          >
                                            <option value="">Lider Yok</option>
                                            {Array.isArray(users) && users.filter(x => x.role === 'team_leader' || x.role === 'admin').map(l => (
                                              <option key={`ldr-${l.id}`} value={l.id} title={`${l.name} (${getRoleText(l.role)})`}>{l.name} ({getRoleText(l.role)})</option>
                                            ))}
                                          </select>
                                        )}
                                        <button
                                          onClick={async () => {
                                            if (!confirm(`${u.name} kullanıcısının şifresini "123456" olarak sıfırlamak istediğinizden emin misiniz?`)) return;

                                            try {
                                              setLoading(true);
                                              await PasswordReset.adminResetPassword(u.id, '123456');
                                              addNotification('Şifre başarıyla "123456" olarak sıfırlandı', 'success');
                                              await loadPasswordResetRequests();
                                            } catch (err) {
                                              console.error('Admin reset password error:', err);
                                              addNotification(err.response?.data?.message || 'Şifre sıfırlanamadı', 'error');
                                            } finally {
                                              setLoading(false);
                                            }
                                          }}
                                          className="inline-flex items-center justify-center text-[14px] transition-colors"
                                          style={{
                                            width: '35px',
                                            height: '35px',
                                            borderRadius: '9999px',
                                            backgroundColor: currentTheme.accent,
                                            color: '#ffffff'
                                          }}
                                          onMouseEnter={(e) => {
                                            const hex = currentTheme.accent.replace('#', '');
                                            const r = parseInt(hex.substr(0, 2), 16);
                                            const g = parseInt(hex.substr(2, 2), 16);
                                            const b = parseInt(hex.substr(4, 2), 16);
                                            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                                            e.target.style.backgroundColor = brightness > 128
                                              ? `rgba(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)}, 1)`
                                              : `rgba(${Math.min(255, r + 20)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 20)}, 1)`;
                                          }}
                                          onMouseLeave={(e) => {
                                            e.target.style.backgroundColor = currentTheme.accent;
                                          }}
                                          title='Şifreyi "123456" olarak sıfırla'
                                        >
                                          ↺
                                        </button>
                                        <div className="flex items-center gap-2">
                                          <select
                                            className="text-[16px] rounded px-3 py-2 focus:outline-none !max-w-[120px] !w-[120px] transition-colors"
                                            value={u.role}
                                            onChange={async (e) => { try { await updateUserAdmin(u.id, { role: e.target.value }); addNotification('Rol güncellendi', 'success'); await loadUsers(); } catch { addNotification('Güncellenemedi', 'error'); } }}
                                            style={{
                                              padding: '5px',
                                              marginLeft: '10px',
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                              whiteSpace: 'nowrap',
                                              backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                              color: currentTheme.text,
                                              borderColor: currentTheme.border,
                                              borderWidth: '1px',
                                              borderStyle: 'solid'
                                            }}
                                            onFocus={(e) => {
                                              e.target.style.borderColor = currentTheme.accent;
                                              e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                            }}
                                            onBlur={(e) => {
                                              e.target.style.borderColor = currentTheme.border;
                                              e.target.style.boxShadow = 'none';
                                            }}
                                            onMouseEnter={(e) => {
                                              e.target.style.backgroundColor = currentTheme.accent + '20';
                                            }}
                                            onMouseLeave={(e) => {
                                              e.target.style.backgroundColor = currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background;
                                            }}
                                            title={getRoleText(u.role)}
                                          >
                                            <option value="admin">Yönetici</option>
                                            <option value="team_leader">Takım Lideri</option>
                                            <option value="team_member">Takım Üyesi</option>
                                            <option value="observer">Gözlemci</option>
                                          </select>
                                        </div>
                                        <button
                                          className="inline-flex items-center justify-center text-[14px] transition-colors"
                                          style={{
                                            width: '35px',
                                            height: '35px',
                                            borderRadius: '9999px',
                                            backgroundColor: currentTheme.border,
                                            color: currentTheme.text,
                                            marginLeft: '10px'
                                          }}
                                          onMouseEnter={(e) => {
                                            e.target.style.backgroundColor = currentTheme.accent;
                                            e.target.style.color = '#ffffff';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.target.style.backgroundColor = currentTheme.border;
                                            e.target.style.color = currentTheme.text;
                                          }}
                                          onClick={async () => {
                                            if (!confirm('Silinsin mi?')) return; try {
                                              await deleteUserAdmin(u.id);
                                              addNotification('Kullanıcı silindi', 'success');
                                              await loadUsers();
                                            }
                                            catch (err) {
                                              console.error('Delete user error:', err);
                                              addNotification('Silinemedi', 'error');
                                            }
                                          }}
                                        >🗑️</button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                            {Array.isArray(users) && users.filter(u => {
                              // Arama terimi filtresi
                              if (userSearchTerm) {
                                const searchTerm = userSearchTerm.toLowerCase();
                                const matchesSearch = (
                                  u.name?.toLowerCase().includes(searchTerm) ||
                                  u.email?.toLowerCase().includes(searchTerm) ||
                                  getRoleText(u.role)?.toLowerCase().includes(searchTerm)
                                );
                                if (!matchesSearch) return false;
                              }
                              // Lider filtresi
                              return true;
                            }).length === 0 && userSearchTerm && (
                                <div className="text-center py-4" style={{ color: currentTheme.textSecondary || currentTheme.text }}>
                                  {userSearchTerm ? `"${userSearchTerm}" için kullanıcı bulunamadı` : 'Seçilen filtreye uygun kullanıcı bulunamadı'}
                                </div>
                              )}
                          </div>
                        ) : (
                          <div className="text-xs" style={{ color: currentTheme.textSecondary || currentTheme.text }}>Yalnızca admin kullanıcı listesi görüntüler.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )
          }

          {
            showTaskSettings && createPortal(
              <div className="fixed inset-0 z-[999993]" style={{ pointerEvents: 'auto' }}>
                <div className="absolute inset-0" onClick={() => setShowTaskSettings(false)} style={{ pointerEvents: 'auto', backgroundColor: `${currentTheme.background}CC` }} />
                <div className="relative flex min-h-full items-center justify-center p-4" style={{ pointerEvents: 'auto' }}>
                  <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[1445px] max-h-[85vh] rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,.6)] overflow-hidden"
                    style={{
                      pointerEvents: 'auto',
                      backgroundColor: currentTheme.tableBackground || currentTheme.background,
                      borderColor: currentTheme.border,
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      color: currentTheme.text
                    }} onClick={(e) => e.stopPropagation()}>
                    <div className="border-b flex-none" style={{ backgroundColor: currentTheme.background, borderColor: currentTheme.border, padding: '0px 10px' }}>
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                        <div className="justify-self-start">
                        </div>
                        <h2 className="text-xl md:text-2xl font-semibold text-center" style={{ color: currentTheme.text }}>Görev Ayarları</h2>
                        <div className="justify-self-end">
                          <button
                            onClick={() => setShowTaskSettings(false)}
                            className="rounded-lg px-2 py-1 transition-colors"
                            style={{ color: currentTheme.textSecondary, backgroundColor: 'transparent' }}
                            onMouseEnter={(e) => {
                              e.target.style.color = currentTheme.text;
                              e.target.style.backgroundColor = `${currentTheme.border}30`;
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.color = currentTheme.textSecondary;
                              e.target.style.backgroundColor = 'transparent';
                            }}
                            aria-label="Kapat"
                          >✕</button>
                        </div>
                      </div>
                    </div>
                    <div className="flex min-w-0 overflow-y-auto no-scrollbar" style={{ height: 'calc(80vh - 72px)', borderLeft: `1px solid ${currentTheme.border}`, borderRight: `1px solid ${currentTheme.border}` }}>
                      <div className="w-1/2 min-w-0 space-y-6" style={{ padding: '20px' }}>
                        <div className="pt-4" style={{ paddingTop: '5px' }}>
                          <div className="font-medium mb-4 !text-[24px]" style={{ paddingBottom: '10px' }}>Görev Türleri</div>

                          {/* Yeni Görev Türü Ekleme */}
                          <div className="rounded-lg p-4 mb-4">
                            <label className="text-[18px] font-medium mb-3">Yeni Görev Türü Ekle</label>
                            <div className="space-y-3">
                              <div className="flex items-center space-x-3">
                                <input
                                  type="text"
                                  placeholder="Görev türü adı (örn: Fikstür, Yeni Ürün)"
                                  value={newTaskTypeName}
                                  onChange={(e) => setNewTaskTypeName(e.target.value)}
                                  className="flex-1 px-3 py-2 rounded-lg text-[16px] focus:outline-none"
                                  style={{
                                    height: '40px',
                                    backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                    color: currentTheme.text,
                                    borderColor: currentTheme.border,
                                    borderWidth: '1px',
                                    borderStyle: 'solid'
                                  }}
                                  onFocus={(e) => {
                                    e.target.style.borderColor = currentTheme.accent;
                                    e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                  }}
                                  onBlur={(e) => {
                                    e.target.style.borderColor = currentTheme.border;
                                    e.target.style.boxShadow = 'none';
                                  }}
                                />
                                <input
                                  type="color"
                                  value={newTaskTypeColor}
                                  onChange={(e) => setNewTaskTypeColor(e.target.value)}
                                  className="w-10 h-full rounded-full cursor-pointer"
                                  title="Renk seç"
                                  style={{
                                    height: '40px',
                                    width: '40px',
                                    backgroundColor: newTaskTypeColor,
                                    marginLeft: '5px',
                                    borderColor: currentTheme.border,
                                    borderWidth: '2px',
                                    borderStyle: 'solid'
                                  }}
                                  onFocus={(e) => {
                                    e.target.style.borderColor = currentTheme.accent;
                                    e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                  }}
                                  onBlur={(e) => {
                                    e.target.style.borderColor = currentTheme.border;
                                    e.target.style.boxShadow = 'none';
                                  }}
                                />
                              </div>
                              <button
                                onClick={handleAddTaskType}
                                className="w-full px-4 py-2 rounded-lg text-[16px] font-medium transition-colors"
                                style={{
                                  backgroundColor: currentTheme.accent,
                                  color: '#ffffff'
                                }}
                                onMouseEnter={(e) => {
                                  const hex = currentTheme.accent.replace('#', '');
                                  const r = parseInt(hex.substr(0, 2), 16);
                                  const g = parseInt(hex.substr(2, 2), 16);
                                  const b = parseInt(hex.substr(4, 2), 16);
                                  e.target.style.backgroundColor = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = currentTheme.accent;
                                }}
                              >
                                Tür Ekle
                              </button>
                            </div>
                          </div>

                          {/* Mevcut Görev Türleri */}
                          <div className="space-y-3" style={{ marginTop: '30px' }}>
                            <label className="text-[18px]">Mevcut Görev Türleri</label>
                            <div className="space-y-2" style={{ marginTop: '10px' }}>
                              {getAllTaskTypes().map(taskType => (
                                <div key={taskType.id || taskType.value} className="rounded-lg p-3 flex items-center justify-between">
                                  <div className="w-full flex items-center space-x-4" style={{ marginBottom: '5px', height: '50px', backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
                                    {editingTaskTypeId === (taskType.id || taskType.value) ? (
                                      <>
                                        <input
                                          type="color"
                                          value={editingTaskTypeColor}
                                          onChange={(e) => setEditingTaskTypeColor(e.target.value)}
                                          className="rounded-full cursor-pointer"
                                          style={{
                                            backgroundColor: taskType.color,
                                            width: '24px',
                                            height: '24px',
                                            borderColor: currentTheme.border,
                                            borderWidth: '2px',
                                            borderStyle: 'solid'
                                          }}
                                          title="Renk seç"
                                          onFocus={(e) => {
                                            e.target.style.borderColor = currentTheme.accent;
                                            e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                          }}
                                          onBlur={(e) => {
                                            e.target.style.borderColor = currentTheme.border;
                                            e.target.style.boxShadow = 'none';
                                          }}
                                        />
                                        <input
                                          type="text"
                                          value={editingTaskTypeName}
                                          onChange={(e) => setEditingTaskTypeName(e.target.value)}
                                          className="flex-1 px-2 py-1 rounded text-[18px] focus:outline-none"
                                          placeholder="Tür adı"
                                          style={{
                                            paddingLeft: '5px',
                                            backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                            color: currentTheme.text,
                                            borderColor: currentTheme.border,
                                            borderWidth: '1px',
                                            borderStyle: 'solid'
                                          }}
                                          onFocus={(e) => {
                                            e.target.style.borderColor = currentTheme.accent;
                                            e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                          }}
                                          onBlur={(e) => {
                                            e.target.style.borderColor = currentTheme.border;
                                            e.target.style.boxShadow = 'none';
                                          }}
                                        />
                                        <div className="flex items-center space-x-2" style={{ marginRight: '5px' }}>
                                          <button
                                            onClick={handleSaveTaskType}
                                            className="inline-flex items-center justify-center text-[16px] transition-colors"
                                            style={{
                                              width: '90px',
                                              height: '45px',
                                              borderRadius: '9999px',
                                              backgroundColor: currentTheme.accent,
                                              color: '#ffffff'
                                            }}
                                            onMouseEnter={(e) => {
                                              const hex = currentTheme.accent.replace('#', '');
                                              const r = parseInt(hex.substr(0, 2), 16);
                                              const g = parseInt(hex.substr(2, 2), 16);
                                              const b = parseInt(hex.substr(4, 2), 16);
                                              const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                                              e.target.style.backgroundColor = brightness > 128
                                                ? `rgba(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)}, 1)`
                                                : `rgba(${Math.min(255, r + 20)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 20)}, 1)`;
                                            }}
                                            onMouseLeave={(e) => {
                                              e.target.style.backgroundColor = currentTheme.accent;
                                            }}
                                          >
                                            Kaydet
                                          </button>
                                          <button
                                            onClick={handleCancelEditTaskType}
                                            className="inline-flex items-center justify-center text-[18px] transition-colors"
                                            style={{
                                              width: '45px',
                                              height: '45px',
                                              borderRadius: '9999px',
                                              backgroundColor: currentTheme.border,
                                              color: currentTheme.text
                                            }}
                                            onMouseEnter={(e) => {
                                              e.target.style.backgroundColor = currentTheme.accent;
                                              e.target.style.color = '#ffffff';
                                            }}
                                            onMouseLeave={(e) => {
                                              e.target.style.backgroundColor = currentTheme.border;
                                              e.target.style.color = currentTheme.text;
                                            }}
                                          >
                                            X
                                          </button>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="w-5 h-5 rounded-full border-2" style={{ backgroundColor: taskType.color, minWidth: '20px', minHeight: '20px', borderColor: currentTheme.border }}></div>
                                        <span className="text-[18px]" style={{ paddingLeft: '5px', color: currentTheme.text }}>{taskType.label}</span>
                                        <div className="flex items-center justify-end space-x-2 ml-auto" style={{ marginRight: '5px' }}>
                                          {taskType.isCustom && !taskType.isPermanent ? (
                                            <>
                                              <button
                                                onClick={() => handleEditTaskType(taskType)}
                                                className="inline-flex items-center justify-center text-[16px] transition-colors"
                                                style={{
                                                  width: '90px',
                                                  height: '45px',
                                                  borderRadius: '9999px',
                                                  backgroundColor: currentTheme.accent,
                                                  color: '#ffffff'
                                                }}
                                                onMouseEnter={(e) => {
                                                  const hex = currentTheme.accent.replace('#', '');
                                                  const r = parseInt(hex.substr(0, 2), 16);
                                                  const g = parseInt(hex.substr(2, 2), 16);
                                                  const b = parseInt(hex.substr(4, 2), 16);
                                                  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                                                  e.target.style.backgroundColor = brightness > 128
                                                    ? `rgba(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)}, 1)`
                                                    : `rgba(${Math.min(255, r + 20)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 20)}, 1)`;
                                                }}
                                                onMouseLeave={(e) => {
                                                  e.target.style.backgroundColor = currentTheme.accent;
                                                }}
                                              >
                                                Düzenle
                                              </button>
                                              <button
                                                onClick={() => handleDeleteTaskType(taskType.id || taskType.value)}
                                                className="inline-flex items-center justify-center text-[18px] transition-colors"
                                                style={{
                                                  width: '45px',
                                                  height: '45px',
                                                  borderRadius: '9999px',
                                                  backgroundColor: currentTheme.border,
                                                  color: currentTheme.text,
                                                  marginLeft: '5px'
                                                }}
                                                onMouseEnter={(e) => {
                                                  e.target.style.backgroundColor = currentTheme.accent;
                                                  e.target.style.color = '#ffffff';
                                                }}
                                                onMouseLeave={(e) => {
                                                  e.target.style.backgroundColor = currentTheme.border;
                                                  e.target.style.color = currentTheme.text;
                                                }}
                                              >
                                                🗑️
                                              </button>
                                            </>
                                          ) : (
                                            <span className="text-gray-500 text-[16px]">
                                              {taskType.isPermanent ? 'Sistem Türü' : 'Silinmez'}
                                            </span>
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="w-1/2 min-w-0 space-y-6" style={{ padding: '20px' }}>
                        <div className="pt-4" style={{ paddingTop: '5px' }}>
                          <div className="font-medium mb-4 !text-[24px]" style={{ paddingBottom: '10px' }}>Görev Durumları</div>

                          {/* Görev Türü Seçimi */}
                          <div className="mb-4">
                            <label className="block text-[18px] mb-3">Görev Türü Seçin</label>
                            <select
                              value={selectedTaskTypeForStatuses}
                              onChange={(e) => setSelectedTaskTypeForStatuses(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg text-[18px] focus:outline-none"
                              style={{
                                height: '40px',
                                backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                color: currentTheme.text,
                                borderColor: currentTheme.border,
                                borderWidth: '1px',
                                borderStyle: 'solid'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = currentTheme.accent;
                                e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = currentTheme.border;
                                e.target.style.boxShadow = 'none';
                              }}
                            >
                              {getAllTaskTypes().map(taskType => (
                                <option key={taskType.value} value={taskType.value}>
                                  {taskType.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Yeni Durum Ekleme */}
                          <div className="rounded-lg p-4 mb-4">
                            <label className="text-[18px] mb-3">Yeni Durum Ekle</label>
                            <div className="space-y-3">
                              <div className="flex items-center space-x-3">
                                <input
                                  type="text"
                                  placeholder="Durum adı (örn: Tasarlanacak, Test Edilecek)"
                                  value={newStatusName}
                                  onChange={(e) => setNewStatusName(e.target.value)}
                                  className="flex-1 px-3 py-2 rounded-lg text-[16px] focus:outline-none"
                                  style={{
                                    height: '40px',
                                    backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                    color: currentTheme.text,
                                    borderColor: currentTheme.border,
                                    borderWidth: '1px',
                                    borderStyle: 'solid'
                                  }}
                                  onFocus={(e) => {
                                    e.target.style.borderColor = currentTheme.accent;
                                    e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                  }}
                                  onBlur={(e) => {
                                    e.target.style.borderColor = currentTheme.border;
                                    e.target.style.boxShadow = 'none';
                                  }}
                                />
                                <input
                                  type="color"
                                  value={newStatusColor}
                                  onChange={(e) => setNewStatusColor(e.target.value)}
                                  className="w-10 h-full rounded-full cursor-pointer"
                                  title="Renk seç"
                                  style={{
                                    height: '40px',
                                    width: '40px',
                                    backgroundColor: newStatusColor,
                                    marginLeft: '5px',
                                    borderColor: currentTheme.border,
                                    borderWidth: '2px',
                                    borderStyle: 'solid'
                                  }}
                                  onFocus={(e) => {
                                    e.target.style.borderColor = currentTheme.accent;
                                    e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                  }}
                                  onBlur={(e) => {
                                    e.target.style.borderColor = currentTheme.border;
                                    e.target.style.boxShadow = 'none';
                                  }}
                                />
                              </div>
                              <button
                                onClick={handleAddTaskStatus}
                                className="w-full px-4 py-2 rounded-lg text-[16px] font-medium transition-colors"
                                style={{
                                  backgroundColor: currentTheme.accent,
                                  color: '#ffffff'
                                }}
                                onMouseEnter={(e) => {
                                  const hex = currentTheme.accent.replace('#', '');
                                  const r = parseInt(hex.substr(0, 2), 16);
                                  const g = parseInt(hex.substr(2, 2), 16);
                                  const b = parseInt(hex.substr(4, 2), 16);
                                  e.target.style.backgroundColor = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = currentTheme.accent;
                                }}
                              >
                                Durum Ekle
                              </button>
                            </div>
                          </div>

                          {/* Seçilen Tür için Mevcut Durumlar */}
                          <div className="space-y-3">
                            <div className="font-medium mb-4 !text-[24px]" style={{ paddingTop: '10px' }}>
                              {(() => {
                                const allTypes = getAllTaskTypes();
                                const foundType = allTypes.find(type =>
                                  type.value == selectedTaskTypeForStatuses ||
                                  type.id == selectedTaskTypeForStatuses
                                );
                                return foundType ? foundType.label : 'Geliştirme';
                              })()} Durumları
                            </div>

                            {/* Sistem Durumları (Sabit) */}
                            <div className="mb-4">
                              <div className="space-y-2">
                                {/* Waiting - Default */}
                                <div className="rounded-lg p-3" style={{ marginBottom: '5px', height: '50px', backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
                                  <div className="flex items-center justify-between h-full">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-5 h-5 rounded-full border-2" style={{ backgroundColor: '#6b7280', minWidth: '20px', minHeight: '20px', borderColor: currentTheme.border }}></div>
                                      <span className="text-[18px] min-w-[120px]" style={{ paddingLeft: '5px', color: currentTheme.text }}>Bekliyor</span>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                      <span className="text-[16px] min-w-[80px] text-right" style={{ marginRight: '5px', color: currentTheme.textSecondary || currentTheme.text }}>Varsayılan</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Completed */}
                                <div className="rounded-lg p-3" style={{ marginBottom: '5px', height: '50px', backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
                                  <div className="flex items-center justify-between h-full">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-5 h-5 rounded-full border-2" style={{ backgroundColor: '#10b981', minWidth: '20px', minHeight: '20px', borderColor: currentTheme.border }}></div>
                                      <span className="text-[18px] min-w-[120px]" style={{ paddingLeft: '5px', color: currentTheme.text }}>Tamamlandı</span>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                      <span className="text-[16px] min-w-[80px] text-right" style={{ marginRight: '5px', color: currentTheme.textSecondary || currentTheme.text }}>Sistem</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Cancelled */}
                                <div className="rounded-lg p-3" style={{ marginBottom: '5px', height: '50px', backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
                                  <div className="flex items-center justify-between h-full">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-5 h-5 rounded-full border-2" style={{ backgroundColor: '#ef4444', minWidth: '20px', minHeight: '20px', borderColor: currentTheme.border }}></div>
                                      <span className="text-[18px] min-w-[120px]" style={{ paddingLeft: '5px', color: currentTheme.text }}>İptal</span>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                      <span className="text-[16px] min-w-[80px] text-right" style={{ marginRight: '5px', color: currentTheme.textSecondary || currentTheme.text }}>Sistem</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            {/* Özel Durumlar (Dinamik) */}
                            <div>
                              <div className="space-y-2">
                                {(() => {
                                  // Sistem türü için ID'yi bul (hem string hem integer kontrol et)
                                  let statuses = customTaskStatuses[selectedTaskTypeForStatuses] || [];

                                  // Eğer string ise ve statuses boşsa, integer ID'yi de kontrol et
                                  if (selectedTaskTypeForStatuses === 'development' && statuses.length === 0) {
                                    const systemType = allTaskTypesFromAPI.find(type =>
                                      type.is_system && (type.name === 'Geliştirme' || type.name === 'development')
                                    );
                                    if (systemType && systemType.id) {
                                      statuses = customTaskStatuses[systemType.id] || [];
                                    }
                                  }

                                  return statuses.length > 0;
                                })() ? (
                                  (() => {
                                    // Sistem türü için ID'yi bul (hem string hem integer kontrol et)
                                    let statuses = customTaskStatuses[selectedTaskTypeForStatuses] || [];

                                    // Eğer string ise ve statuses boşsa, integer ID'yi de kontrol et
                                    if (selectedTaskTypeForStatuses === 'development' && statuses.length === 0) {
                                      const systemType = allTaskTypesFromAPI.find(type =>
                                        type.is_system && (type.name === 'Geliştirme' || type.name === 'development')
                                      );
                                      if (systemType && systemType.id) {
                                        statuses = customTaskStatuses[systemType.id] || [];
                                      }
                                    }

                                    return statuses;
                                  })().map(status => (
                                    <div key={status.id || status.key} className="rounded-lg p-3 flex items-center justify-between" style={{ marginBottom: '5px', height: '50px', backgroundColor: currentTheme.tableBackground || currentTheme.background }}>
                                      {editingTaskStatusId === (status.id || status.key) ? (
                                        <>
                                          <div className="flex items-center space-x-3 flex-1">
                                            <input
                                              type="color"
                                              value={editingTaskStatusColor}
                                              onChange={(e) => setEditingTaskStatusColor(e.target.value)}
                                              className="rounded-full cursor-pointer"
                                              style={{
                                                backgroundColor: status.color,
                                                width: '24px',
                                                height: '24px',
                                                borderColor: currentTheme.border,
                                                borderWidth: '2px',
                                                borderStyle: 'solid'
                                              }}
                                              title="Renk seç"
                                              onFocus={(e) => {
                                                e.target.style.borderColor = currentTheme.accent;
                                                e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                              }}
                                              onBlur={(e) => {
                                                e.target.style.borderColor = currentTheme.border;
                                                e.target.style.boxShadow = 'none';
                                              }}
                                            />
                                            <input
                                              type="text"
                                              value={editingTaskStatusName}
                                              onChange={(e) => setEditingTaskStatusName(e.target.value)}
                                              className="flex-1 px-2 py-1 rounded !text-[18px] focus:outline-none"
                                              placeholder="Durum adı"
                                              style={{
                                                paddingLeft: '5px',
                                                backgroundColor: currentTheme.tableRowAlt || currentTheme.tableBackground || currentTheme.background,
                                                color: currentTheme.text,
                                                borderColor: currentTheme.border,
                                                borderWidth: '1px',
                                                borderStyle: 'solid'
                                              }}
                                              onFocus={(e) => {
                                                e.target.style.borderColor = currentTheme.accent;
                                                e.target.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                                              }}
                                              onBlur={(e) => {
                                                e.target.style.borderColor = currentTheme.border;
                                                e.target.style.boxShadow = 'none';
                                              }}
                                            />
                                          </div>
                                          <div className="flex items-center space-x-2" style={{ marginRight: '5px' }}>
                                            <button
                                              onClick={handleSaveTaskStatus}
                                              className="inline-flex items-center justify-center text-[16px] transition-colors"
                                              style={{
                                                width: '90px',
                                                height: '45px',
                                                borderRadius: '9999px',
                                                backgroundColor: currentTheme.accent,
                                                color: '#ffffff'
                                              }}
                                              onMouseEnter={(e) => {
                                                const hex = currentTheme.accent.replace('#', '');
                                                const r = parseInt(hex.substr(0, 2), 16);
                                                const g = parseInt(hex.substr(2, 2), 16);
                                                const b = parseInt(hex.substr(4, 2), 16);
                                                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                                                e.target.style.backgroundColor = brightness > 128
                                                  ? `rgba(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)}, 1)`
                                                  : `rgba(${Math.min(255, r + 20)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 20)}, 1)`;
                                              }}
                                              onMouseLeave={(e) => {
                                                e.target.style.backgroundColor = currentTheme.accent;
                                              }}
                                            >
                                              Kaydet
                                            </button>
                                            <button
                                              onClick={handleCancelEditTaskStatus}
                                              className="inline-flex items-center justify-center text-[18px] transition-colors"
                                              style={{
                                                width: '45px',
                                                height: '45px',
                                                borderRadius: '9999px',
                                                backgroundColor: currentTheme.border,
                                                color: currentTheme.text
                                              }}
                                              onMouseEnter={(e) => {
                                                e.target.style.backgroundColor = currentTheme.accent;
                                                e.target.style.color = '#ffffff';
                                              }}
                                              onMouseLeave={(e) => {
                                                e.target.style.backgroundColor = currentTheme.border;
                                                e.target.style.color = currentTheme.text;
                                              }}
                                            >
                                              X
                                            </button>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <div className="flex items-center space-x-3">
                                            <div className="w-5 h-5 rounded-full border-2" style={{ backgroundColor: status.color, minWidth: '20px', minHeight: '20px', borderColor: currentTheme.border }}></div>
                                            <span className="!text-[18px]" style={{ paddingLeft: '5px', color: currentTheme.text }}>{status.name || status.label}</span>
                                          </div>
                                          <div className="flex items-center justify-end space-x-2 ml-auto" style={{ marginRight: '5px' }}>
                                            <button
                                              onClick={() => handleEditTaskStatus(status)}
                                              className="inline-flex items-center justify-center text-[16px] transition-colors"
                                              style={{
                                                width: '90px',
                                                height: '45px',
                                                borderRadius: '9999px',
                                                backgroundColor: currentTheme.accent,
                                                color: '#ffffff'
                                              }}
                                              onMouseEnter={(e) => {
                                                const hex = currentTheme.accent.replace('#', '');
                                                const r = parseInt(hex.substr(0, 2), 16);
                                                const g = parseInt(hex.substr(2, 2), 16);
                                                const b = parseInt(hex.substr(4, 2), 16);
                                                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                                                e.target.style.backgroundColor = brightness > 128
                                                  ? `rgba(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)}, 1)`
                                                  : `rgba(${Math.min(255, r + 20)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 20)}, 1)`;
                                              }}
                                              onMouseLeave={(e) => {
                                                e.target.style.backgroundColor = currentTheme.accent;
                                              }}
                                            >
                                              Düzenle
                                            </button>
                                            <button
                                              onClick={() => handleDeleteTaskStatus(status.id || status.key)}
                                              className="inline-flex items-center justify-center text-[18px] transition-colors"
                                              style={{
                                                width: '45px',
                                                height: '45px',
                                                borderRadius: '9999px',
                                                backgroundColor: currentTheme.border,
                                                color: currentTheme.text,
                                                marginLeft: '5px'
                                              }}
                                              onMouseEnter={(e) => {
                                                e.target.style.backgroundColor = currentTheme.accent;
                                                e.target.style.color = '#ffffff';
                                              }}
                                              onMouseLeave={(e) => {
                                                e.target.style.backgroundColor = currentTheme.border;
                                                e.target.style.color = currentTheme.text;
                                              }}
                                            >
                                              🗑️
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-gray-400 text-center text-[18px] py-4 border-2 border-dashed border-gray-600 rounded-lg">
                                    Bu görev türü için henüz özel durum tanımlanmamış.
                                    <br />
                                    Yukarıdan yeni durum ekleyebilirsiniz.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )
          }

          {
            error && (
              <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50" style={{ width: '1440px', maxWidth: 'calc(100vw - 32px)' }}>
                <div className="flex items-center justify-between">
                  <span>{error}</span>
                  <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">✕</button>
                </div>
              </div>
            )
          }

        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer border-t" style={{
        padding: '15px',
        paddingRight: '30px',
        backgroundColor: currentTheme.background,
        borderColor: currentTheme.border
      }}>
        <div className="app-footer__inner">
          {/* Sol Logo */}
          <div className="flex items-center space-x-3">
            <div className="text-left">
              <a href="https://vaden.com.tr" target="_blank" rel="noopener noreferrer">
                <img
                  src={currentLogo || logo}
                  alt="VADEN LOGO"
                  className="h-10 app-footer__logo"
                  style={{ minHeight: '60px' }}
                  onError={(e) => { e.target.src = logo; }}
                />
              </a>
            </div>
          </div>

          {/* Orta İletişim Bilgileri */}
          <div className="flex items-center space-x-6">
            <div className="text-xs whitespace-nowrap" style={{ color: currentTheme.textSecondary }}>
              © Vaden Otomotiv San. Tic. A.Ş. Tüm hakları saklıdır / 2025
            </div>
          </div>

          {/* Sağ Sosyal Medya */}
          <div className="flex items-center space-x-3 app-footer__social">
            <div className="text-center">
              <a href="https://www.facebook.com/vadenoriginal" target="_blank" rel="noopener noreferrer" className="app-footer__social-link" aria-label="Facebook" style={{ marginRight: '10px', color: currentTheme.socialIconColor || currentTheme.textSecondary }}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a href="https://www.instagram.com/vadenoriginal" target="_blank" rel="noopener noreferrer" className="app-footer__social-link" aria-label="Instagram" style={{ marginRight: '10px', color: currentTheme.socialIconColor || currentTheme.textSecondary }}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a href="https://x.com/@vadenoriginal" target="_blank" rel="noopener noreferrer" className="app-footer__social-link" aria-label="X" style={{ marginRight: '10px', color: currentTheme.socialIconColor || currentTheme.textSecondary }}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="https://www.linkedin.com/company/vadenoriginal" target="_blank" rel="noopener noreferrer" className="app-footer__social-link" aria-label="LinkedIn" style={{ marginRight: '10px', color: currentTheme.socialIconColor || currentTheme.textSecondary }}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a href="https://www.youtube.com/@vadenoriginal" target="_blank" rel="noopener noreferrer" className="app-footer__social-link" aria-label="YouTube" style={{ marginRight: '10px', color: currentTheme.socialIconColor || currentTheme.textSecondary }}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
              <div className="text-xs whitespace-nowrap" style={{ paddingTop: '5px', color: currentTheme.textSecondary }}>Yazılım/Tasarım MEY</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
export default App;
