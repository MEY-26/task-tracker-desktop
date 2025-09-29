import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';

function PasswordChangeForm({ onSubmit }) {
  const [form, setForm] = useState({ current: '', next: '', again: '' });
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    if (!form.current || !form.next || !form.again) return false;
    return form.next === form.again;
  }, [form]);

  const handleSubmit = async () => {
    if (!canSubmit || loading) return;
    try {
      setLoading(true);
      const ok = await onSubmit?.({ current: form.current, next: form.next });
      if (ok) {
        setForm({ current: '', next: '', again: '' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10" style={{ padding: '18px', paddingBottom: '32px' }}>
      <div className="space-y-6">
        <input type="text" style={{ display: 'none' }} autoComplete="username" />
        <input type="password" style={{ display: 'none' }} autoComplete="current-password" />
        <input
          type="password"
          className="w-full border border-white/20 bg-white/10 text-white !text-[24px] sm:!text-[16px] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all px-6 py-4"
          placeholder="Mevcut şifrenizi girin"
          value={form.current}
          onChange={(e) => setForm((prev) => ({ ...prev, current: e.target.value }))}
          autoComplete="new-password"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          data-lpignore="true"
          data-form-type="other"
          name="current-password-hidden"
          id="current-password-hidden"
          style={{ height: '40px' }}
        />
      </div>

      <div className="space-y-6">
        <input type="text" style={{ display: 'none' }} autoComplete="username" />
        <input type="password" style={{ display: 'none' }} autoComplete="new-password" />
        <input
          type="password"
          className="w-full border border-white/20 bg-white/10 text-white !text-[24px] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all px-6 py-4"
          placeholder="Yeni şifrenizi girin"
          value={form.next}
          onChange={(e) => setForm((prev) => ({ ...prev, next: e.target.value }))}
          autoComplete="new-password"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          data-lpignore="true"
          data-form-type="other"
          name="new-password-hidden"
          id="new-password-hidden"
          style={{ height: '40px' }}
        />
      </div>

      <div className="space-y-6">
        <input
          type="password"
          className="w-full border border-white/20 bg-white/10 text-white !text-[24px] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all px-6 py-4"
          placeholder="Yeni şifrenizi tekrar girin"
          value={form.again}
          onChange={(e) => setForm((prev) => ({ ...prev, again: e.target.value }))}
          autoComplete="new-password"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          data-lpignore="true"
          data-form-type="other"
          name="new-password-check-hidden"
          id="new-password-check-hidden"
          style={{ height: '40px' }}
        />
      </div>

      <div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 transition-colors"
          style={{ height: '48px' }}
        >
          {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
        </button>
      </div>
    </div>
  );
}

PasswordChangeForm.propTypes = {
  onSubmit: PropTypes.func,
};

export default PasswordChangeForm;
