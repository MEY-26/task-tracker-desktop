import { useTheme } from '../../contexts/ThemeContext';

function LoginScreen({
  logoSrc,
  error,
  loading,
  loginForm,
  onLoginFormChange,
  onSubmit,
  onForgotPasswordSubmit,
  showForgotPassword,
  onToggleForgotPassword,
}) {
  const { currentTheme } = useTheme();

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    if (showForgotPassword) {
      await onForgotPasswordSubmit?.();
    } else {
      await onSubmit?.();
    }
  };

  const inputStyle = {
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    backgroundColor: currentTheme.tableRowAlt || currentTheme.background,
    color: currentTheme.text,
    border: `1px solid ${currentTheme.border}`,
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '1rem',
    outline: 'none',
  };

  const buttonStyle = {
    width: '100%',
    backgroundColor: currentTheme.accent,
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 24px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 z-[999800]"
      style={{ backgroundColor: currentTheme.background }}
    >
      <div
        className="rounded-2xl p-8 shadow-2xl w-full"
        style={{
          maxWidth: '420px',
          backgroundColor: currentTheme.tableBackground || currentTheme.background,
          border: `1px solid ${currentTheme.border}`,
        }}
      >
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <img src={logoSrc} alt="Logo" className="w-16 h-16" />
          </div>
          <h2
            className="text-2xl font-bold tracking-wider"
            style={{ color: currentTheme.text }}
          >
            Görev Takip Sistemi
          </h2>
        </div>

        {error && (
          <div
            className="px-4 py-3 rounded-xl mb-6"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-5">
          <div>
            <label
              className="block font-medium mb-2"
              style={{ color: currentTheme.text, fontSize: '0.95rem' }}
            >
              E-mail
            </label>
            <input
              type="email"
              value={loginForm.email}
              onChange={(e) => onLoginFormChange?.('email', e.target.value)}
              style={inputStyle}
              placeholder="Mail Adresinizi Giriniz"
              required
            />
          </div>

          {!showForgotPassword && (
            <div>
              <label
                className="block font-medium mb-2"
                style={{ color: currentTheme.text, fontSize: '0.95rem' }}
              >
                Şifre
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => onLoginFormChange?.('password', e.target.value)}
                  style={{ ...inputStyle, paddingRight: '48px' }}
                  placeholder="Şifrenizi Giriniz"
                  required
                  autoComplete="current-password"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading
              ? (showForgotPassword ? 'Talep Gönderiliyor...' : 'Giriş yapılıyor...')
              : (showForgotPassword ? 'Talep Gönder' : 'Giriş Yap')}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onToggleForgotPassword}
            style={{
              ...buttonStyle,
              backgroundColor: currentTheme.border,
              marginTop: '8px',
            }}
          >
            {showForgotPassword ? 'Geri' : 'Şifremi Unuttum'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
