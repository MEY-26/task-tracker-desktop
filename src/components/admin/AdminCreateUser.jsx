import { useState } from 'react';
import PropTypes from 'prop-types';

function AdminCreateUser({ onCreateUser, onBulkImport, pushToast }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'team_member',
  });

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
      await onCreateUser?.(form);
      pushToast?.('Kullanıcı eklendi', 'success');
      setForm({ name: '', email: '', password: '', password_confirmation: '', role: 'team_member' });
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

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4" style={{ paddingBottom: '30px' }}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="w-full rounded border border-white/10 bg-white/5 px-3 py-3 !text-[24px] text-white placeholder-gray-400"
            placeholder="İsim"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            style={{ marginBottom: '10px' }}
          />

          <input
            type="email"
            name="username"
            autoComplete="username"
            className="w-full rounded border border-white/10 bg-white/5 px-3 py-3 !text-[24px] text-white placeholder-gray-400"
            placeholder="E-posta"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            style={{ marginBottom: '10px' }}
          />

          <input
            type="password"
            className="w-full rounded border border-white/10 bg-white/5 px-3 py-3 !text-[24px] text-white placeholder-gray-400"
            placeholder="Şifre"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-lpignore="true"
            name="password"
            style={{ marginBottom: '10px' }}
          />

          <input
            type="password"
            className="w-full rounded border border-white/10 bg-white/5 px-3 py-3 !text-[24px] text-white placeholder-gray-400"
            placeholder="Şifre (tekrar)"
            value={form.password_confirmation}
            onChange={(e) => setForm((prev) => ({ ...prev, password_confirmation: e.target.value }))}
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-lpignore="true"
            name="password-confirm"
            style={{ marginBottom: '10px' }}
          />

          <select
            className="w-[101%] h-[35px] rounded border border-white/10 bg-white/5 px-3 py-3 !text-[24px] text-white"
            value={form.role}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            style={{ marginBottom: '10px' }}
          >
            <option value="admin" className="bg-gray-800 text-white">Yönetici</option>
            <option value="team_leader" className="bg-gray-800 text-white">Takım Lideri</option>
            <option value="team_member" className="bg-gray-800 text-white">Takım Üyesi</option>
            <option value="observer" className="bg-gray-800 text-white">Gözlemci</option>
          </select>

          <button
            type="submit"
            className="w-[101%] rounded px-4 py-3 bg-green-600 hover:bg-green-700 !text-[20px]"
            style={{ marginBottom: '10px' }}
          >
            Kullanıcı Ekle
          </button>
        </form>
      </div>

      <div className="border-white/10 pb-4">
        <h2 className="text-white mb-4">Excel'den Toplu Kullanıcı Ekle</h2>
        <div className="space-y-4 !text-[16px]">
          <div className="bg-blue-900/20 border-blue-500/30 rounded-lg p-4">
            <div className="text-blue-200 space-y-1">
              <div className="mt-3 text-blue-300">
                İlk satır başlık olarak kabul edilir, veriler 2. satırdan başlar.
              </div>
              <div>• A2: Kullanıcı Adı Soyadı</div>
              <div>• B2: E-posta Adresi</div>
              <div>• C2: Rol (admin/team_leader/team_member/observer)</div>
              <div>• D2: Şifre (boşsa varsayılan: 123456)</div>
              <div>• E2: Takım Lideri E-posta (opsiyonel)</div>
            </div>
          </div>
          <div className="text-gray-400 !text-[24px]" style={{ marginTop: '10px' }}>
            Excel dosyası seçin (.xlsx önerilir)
          </div>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="text-gray-300 !text-[18px] file:w-[30%] file:h-[30px] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer file:transition-colors"
          />
        </div>
      </div>
    </div>
  );
}

AdminCreateUser.propTypes = {
  onCreateUser: PropTypes.func,
  onBulkImport: PropTypes.func,
  pushToast: PropTypes.func,
};

export default AdminCreateUser;
