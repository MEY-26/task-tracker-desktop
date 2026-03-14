import { useState, useCallback, useEffect } from 'react';
import { getUsers, registerUser, Team } from '../api';
import * as ExcelJS from 'exceljs';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

export function useUsers(options = {}) {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const { setLoading } = options;

  const [users, setUsers] = useState([]);
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);

  const loadUsers = useCallback(async () => {
    try {
      const usersList = await getUsers();
      setUsers(usersList);
    } catch (err) {
      console.error('Users load error:', err);
      setUsers([]);
    }
  }, []);

  const loadTeamMembers = useCallback(async (leaderId = null) => {
    try {
      const list = await Team.members(leaderId);
      setTeamMembers(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Team members load error:', e);
      setTeamMembers([]);
    }
  }, []);

  const parseExcelUsers = useCallback((file) => {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
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
              if (v && typeof v === 'object' && 'text' in v) v = v.text;
              rowData[colNumber - 1] = v;
            });
            jsonRows.push(rowData);
          });

          const userRows = jsonRows.slice(1).filter(row => (row?.[0] && row?.[1]));
          const validRoles = ['admin', 'team_leader', 'team_member', 'observer'];
          const parsedUsers = userRows.map((row, index) => {
            const name = row[0];
            const email = row[1];
            const role = row[2];
            const password = row[3];
            const leaderEmail = row[4];
            const department = row[5];
            const roleStr = (role ?? '').toString().trim().toLowerCase();
            const validatedRole = validRoles.includes(roleStr) ? roleStr : 'team_member';
            return {
              name: (name ?? '').toString().trim(),
              email: (email ?? '').toString().trim(),
              role: validatedRole,
              password: (password ?? '').toString().trim() || '123456',
              leaderEmail: (leaderEmail ?? '').toString().trim(),
              department: (department ?? '').toString().trim() || null,
              rowIndex: index + 2,
            };
          }).filter(u => u.name && u.email);

          resolve(parsedUsers);
        } catch (err) {
          reject(new Error('Excel dosyası okunamadı: ' + (err?.message || String(err))));
        }
      })();
    });
  }, []);

  const handleBulkUserImport = useCallback(async (file) => {
    try {
      setLoading?.(true);
      const parsedUsers = await parseExcelUsers(file);

      if (parsedUsers.length === 0) {
        addNotification('Excel dosyasında geçerli kullanıcı verisi bulunamadı', 'error');
        return;
      }

      const existingUsers = await getUsers();
      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      const processedUsers = new Map();

      const leadersAndAdmins = parsedUsers.filter(u => u.role === 'team_leader' || u.role === 'admin');
      const members = parsedUsers.filter(u => u.role !== 'team_leader' && u.role !== 'admin');

      for (const userData of leadersAndAdmins) {
        try {
          const result = await registerUser({
            name: userData.name,
            email: userData.email,
            password: userData.password,
            password_confirmation: userData.password,
            role: userData.role,
            leader_id: null,
            department: userData.department || null
          });
          if (result && result.user && result.user.id) {
            processedUsers.set(userData.email.toLowerCase(), result.user.id);
          }
          successCount++;
        } catch (error) {
          errorCount++;
          errors.push(`Satır ${userData.rowIndex}: ${userData.name} - ${error.response?.data?.message || 'Bilinmeyen hata'}`);
        }
      }

      for (const userData of members) {
        try {
          let leaderId = null;
          if (userData.leaderEmail) {
            const leaderEmail = userData.leaderEmail.toLowerCase();
            if (processedUsers.has(leaderEmail)) {
              leaderId = processedUsers.get(leaderEmail);
            } else {
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
            leader_id: leaderId,
            department: userData.department || null
          });
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
      setLoading?.(false);
    }
  }, [parseExcelUsers, loadUsers, addNotification, setLoading]);

  useEffect(() => {
    if (showUserPanel && ['admin', 'team_leader', 'observer'].includes(user?.role)) {
      loadUsers();
    }
  }, [showUserPanel, user?.role, loadUsers]);

  useEffect(() => {
    if (user?.id && user.role !== 'observer' && (!users || users.length === 0)) {
      loadUsers();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- users intentionally omitted to avoid reload loop
  }, [user?.id, user?.role, users?.length, loadUsers]);

  return {
    users,
    setUsers,
    showUserPanel,
    setShowUserPanel,
    teamMembers,
    setTeamMembers,
    loadUsers,
    loadTeamMembers,
    handleBulkUserImport,
    parseExcelUsers
  };
}
