import { useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getDepartments } from '../../api';

function AdminCreateUser({ currentTheme, onCreateUser, onBulkImport, pushToast, users = [] }) {
  const theme = currentTheme || {};
  const inputBg = theme.tableRowAlt || theme.tableBackground || theme.background || '#1f2937';
  const inputText = theme.text || '#ffffff';
  const inputBorder = theme.border || 'rgba(255,255,255,0.1)';
  const placeholderColor = theme.textSecondary || theme.text || '#9ca3af';
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'team_member',
    leader_id: null,
    department: null,
  });

  useEffect(() => {
    getDepartments().then(setDepartments);
  }, []);

  const leaderOptions = useMemo(
    () => (Array.isArray(users) ? users.filter(u => u.role === 'team_leader' || u.role === 'admin') : []),
    [users]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.name.trim() || !form.email.trim() || !form.password || !form.password_confirmation) {
      pushToast?.('Lütfen tüm alanları doldurun', 'error');
      return;
    }
    if (form.password !== form.password_confirmation) {
      pushToast?.('Şifreler eşleşmiyor', 'error');
      return;
    }

    try {
      const payload = {
        ...form,
        leader_id: form.role === 'team_member' ? (form.leader_id ?? null) : null,
        department: form.department || null,
      };
      await onCreateUser?.(payload);
      pushToast?.('Kullanıcı eklendi', 'success');
      setForm({ name: '', email: '', password: '', password_confirmation: '', role: 'team_member', leader_id: null, department: null });
    } catch (error) {
      console.error('User registration error:', error);
      const message = error?.response?.data?.message || 'Kullanıcı eklenemedi';
      pushToast?.(message, 'error');
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    onBulkImport?.(file);
    event.target.value = '';
  };

  const inputStyle = {
    marginBottom: '10px',
    borderRadius: '8px',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    backgroundColor: inputBg,
    color: inputText,
    borderColor: inputBorder,
    borderWidth: '1px',
    borderStyle: 'solid',
    padding: '12px',
    fontSize: '24px',
  };

  return (
    <div className="space-y-6 min-w-0 max-w-full overflow-hidden" data-admin-create-user>
      <style>{`
        [data-admin-create-user] input::placeholder,
        [data-admin-create-user] input::-webkit-input-placeholder {
          color: ${placeholderColor};
          opacity: 0.85;
        }
        [data-admin-create-user] input[type="file"]::file-selector-button {
          background-color: ${theme.accent || '#2563eb'};
          color: #ffffff;
        }
        [data-admin-create-user] input[type="file"]::file-selector-button:hover {
          opacity: 0.9;
        }
      `}</style>
      <div className="pb-4" style={{ borderBottom: `1px solid ${inputBorder}` }}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="w-full"
            placeholder="İsim"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            style={inputStyle}
          />

          <input
            type="email"
            name="username"
            autoComplete="username"
            className="w-full"
            placeholder="E-posta"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            style={inputStyle}
          />

          <input
            type="password"
            className="w-full"
            placeholder="Şifre"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-lpignore="true"
            name="password"
            style={inputStyle}
          />

          <select
            className="w-full"
            value={form.role}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            style={{ ...inputStyle, minHeight: '48px' }}
          >
            <option value="admin" style={{ backgroundColor: inputBg, color: inputText }}>Yönetici</option>
            <option value="team_leader" style={{ backgroundColor: inputBg, color: inputText }}>Takım Lideri</option>
            <option value="team_member" style={{ backgroundColor: inputBg, color: inputText }}>Takım Üyesi</option>
            <option value="observer" style={{ backgroundColor: inputBg, color: inputText }}>Gözlemci</option>
          </select>

          {/* Opsiyonel: Ekip Lideri seçimi */}
          <select
            className="w-full"
            value={form.leader_id ?? ''}
            onChange={(e) => setForm((prev) => ({ ...prev, leader_id: e.target.value ? Number(e.target.value) : null }))}
            style={{ ...inputStyle, minHeight: '48px' }}
          >
            <option value="" style={{ backgroundColor: inputBg, color: inputText }}>Takım Lideri (opsiyonel)</option>
            {leaderOptions.map((u) => (
              <option key={u.id} value={u.id} style={{ backgroundColor: inputBg, color: inputText }}>
                {u.name || u.email} {u.role === 'admin' ? '(Yönetici)' : '(Takım Lideri)'}
              </option>
            ))}
          </select>

          {/* Opsiyonel: Departman seçimi */}
          {departments.length > 0 && (
            <select
              className="w-full"
              value={form.department ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value || null }))}
              style={{ ...inputStyle, minHeight: '48px' }}
            >
              <option value="" style={{ backgroundColor: inputBg, color: inputText }}>Departman (opsiyonel)</option>
              {departments.map((d) => (
                <option key={d} value={d} style={{ backgroundColor: inputBg, color: inputText }}>{d}</option>
              ))}
            </select>
          )}

          <button
            type="submit"
            className="w-full px-4 py-3 !text-[20px]"
            style={{ marginBottom: '10px', borderRadius: '8px', backgroundColor: theme.accent || '#16a34a', color: '#ffffff' }}
          >
            Kullanıcı Ekle
          </button>
        </form>
      </div>

      <div className="pb-4">
        <h3 className="mb-4" style={{ color: inputText }}>Excel'den Toplu Kullanıcı Ekle</h3>
        <div className="space-y-4" style={{ fontSize: '16px' }}>
          <div className="rounded-lg p-4 max-w-full" style={{ backgroundColor: theme.accent ? theme.accent + '20' : 'rgba(59,130,246,0.2)', borderColor: theme.accent || '#3b82f6', borderWidth: '1px', borderStyle: 'solid', boxSizing: 'border-box' }}>
            <div className="space-y-1" style={{ color: theme.accent ? theme.text : '#bfdbfe' }}>
              <div className="mt-3 text-blue-300">
              <b style={{ paddingLeft: '10px' }}><i>İlk satır başlık olarak kabul edilir, veriler 2. satırdan başlar.</i></b>
              </div>
              <div>• <b>A2:</b> Kullanıcı Adı Soyadı</div>
              <div>• <b>B2:</b> E-posta Adresi</div>
              <div>• <b>C2:</b> Rol (admin/team_leader/team_member/observer)</div>
              <div>• <b>D2:</b> Şifre (boşsa varsayılan: 123456)</div>
              <div>• <b>E2:</b> Takım Lideri E-posta (opsiyonel)</div>
              <div>• <b>F2:</b> Departman (opsiyonel: Ar-Ge, Fikstür, Elektronik Montaj, Giriş Kalite)</div>
            </div>
          </div>
          <div className="!text-[18px]" style={{ color: placeholderColor }}>
            Excel dosyası seçin (.xlsx önerilir)
          </div>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="!text-[18px] file:w-[30%] file:h-[30px] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-medium file:cursor-pointer file:transition-colors"
            style={{ color: placeholderColor }}
          />
        </div>
      </div>
    </div>
  );
}

AdminCreateUser.propTypes = {
  currentTheme: PropTypes.object,
  onCreateUser: PropTypes.func,
  onBulkImport: PropTypes.func,
  pushToast: PropTypes.func,
};

export default AdminCreateUser;
