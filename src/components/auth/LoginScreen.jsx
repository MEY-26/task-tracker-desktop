import PropTypes from 'prop-types';

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
  const handleFormSubmit = async (event) => {
    event.preventDefault();
    if (showForgotPassword) {
      await onForgotPasswordSubmit?.();
    } else {
      await onSubmit?.();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4 z-[999800]">
      <div className="bg-black/20 backdrop-blur-sm rounded-2xl border-gray-800/50 p-8 shadow-2xl w-full max-w-md" style={{ minWidth: '400px' }}>
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <img src={logoSrc} alt="Logo" className="w-16 h-16" />
          </div>
          <h2 className="text-4xl font-bold text-white tracking-wider">Görev Takip Sistemi</h2>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div>
            <label className="block text-white text-[24px] font-medium mb-3 items-left flex">
              E-mail
            </label>
            <input
              type="email"
              value={loginForm.email}
              onChange={(e) => onLoginFormChange?.('email', e.target.value)}
              className="w-full bg-gray-100 border-0 rounded-xl px-4 py-4 text-gray-900 focus:outline-none focus:ring-0 text-base text-[32px]"
              placeholder="Mail Adresinizi Giriniz"
              required
            />
          </div>

          {!showForgotPassword && (
            <div>
              <label className="block text-white text-[24px] font-medium mb-3 items-left flex">
                Şifre
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => onLoginFormChange?.('password', e.target.value)}
                  className="w-full bg-gray-100 border-0 rounded-xl px-4 py-4 pr-12 text-gray-900 focus:outline-none focus:ring-0 text-base text-[32px]"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 text-lg shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            {loading
              ? (showForgotPassword ? 'Talep Gönderiliyor...' : 'Giriş yapılıyor...')
              : (showForgotPassword ? 'Talep Gönder' : 'Giriş Yap')}
          </button>
        </form>

        <div className="mt-4 text-center" style={{ paddingTop: '5px' }}>
          <button
            type="button"
            onClick={onToggleForgotPassword}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 text-lg shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            {showForgotPassword ? 'Geri' : 'Şifremi Unuttum'}
          </button>
        </div>
      </div>
    </div>
  );
}

LoginScreen.propTypes = {
  logoSrc: PropTypes.string.isRequired,
  error: PropTypes.string,
  loading: PropTypes.bool,
  loginForm: PropTypes.shape({
    email: PropTypes.string,
    password: PropTypes.string,
  }).isRequired,
  onLoginFormChange: PropTypes.func,
  onSubmit: PropTypes.func,
  onForgotPasswordSubmit: PropTypes.func,
  showForgotPassword: PropTypes.bool,
  onToggleForgotPassword: PropTypes.func,
};

export default LoginScreen;
