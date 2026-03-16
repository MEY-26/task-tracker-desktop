import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

function MenuItem({ icon, label, onClick, theme }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-2 text-sm flex items-center space-x-2 transition-colors"
      style={{
        padding: '10px',
        color: theme.text,
        backgroundColor: 'transparent'
      }}
      onMouseEnter={(e) => {
        e.target.style.backgroundColor = `${theme.border}30`;
      }}
      onMouseLeave={(e) => {
        e.target.style.backgroundColor = 'transparent';
      }}
    >
      <span className="flex items-center gap-2 whitespace-nowrap">
        <span>{icon}</span>
        <span>{label}</span>
      </span>
    </button>
  );
}

export function ProfileMenuDropdown({
  user,
  onClose,
  onOpenProfile,
  onOpenTheme,
  onOpenTaskSettings,
  onOpenTeam,
  onOpenUserPanel,
  onOpenLeaveRequest,
  onOpenSystemSettings,
  onLogout
}) {
  const { currentTheme } = useTheme();

  const handleProfile = () => {
    onClose();
    onOpenProfile();
  };

  const handleTheme = () => {
    onClose();
    onOpenTheme();
  };

  const handleTaskSettings = () => {
    onClose();
    onOpenTaskSettings();
  };

  const handleTeam = () => {
    onClose();
    onOpenTeam();
  };

  const handleUserPanel = () => {
    onClose();
    onOpenUserPanel();
  };

  const handleLeaveRequest = () => {
    onClose();
    onOpenLeaveRequest?.();
  };

  const handleSystemSettings = () => {
    onClose();
    onOpenSystemSettings?.();
  };

  const handleLogout = () => {
    onClose();
    onLogout();
  };

  return (
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
      <MenuItem icon="👤" label="Profil" onClick={handleProfile} theme={currentTheme} />
      <MenuItem icon="🎨" label="Tema Ayarları" onClick={handleTheme} theme={currentTheme} />
      <MenuItem icon="📅" label="İzin Bildirimi" onClick={handleLeaveRequest} theme={currentTheme} />
      {user?.role === 'admin' && (
        <MenuItem icon="📋" label="Görev Ayarları" onClick={handleTaskSettings} theme={currentTheme} />
      )}
      {user?.role === 'team_leader' && (
        <MenuItem icon="👥" label="Takım" onClick={handleTeam} theme={currentTheme} />
      )}
      {user?.role === 'admin' && (
        <MenuItem icon="⚙️" label="Kullanıcı Yönetimi" onClick={handleUserPanel} theme={currentTheme} />
      )}
      {user?.role === 'admin' && (
        <MenuItem icon="🔧" label="Sistem Yönetimi" onClick={handleSystemSettings} theme={currentTheme} />
      )}
      <MenuItem icon="🚪" label="Çıkış Yap" onClick={handleLogout} theme={currentTheme} />
    </div>
  );
}
