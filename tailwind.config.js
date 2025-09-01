/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        '2xs': '375px',    // Çok küçük mobil cihazlar
        'xs': '480px',     // Ekstra küçük ekranlar
        'sm': '640px',     // Küçük tabletler
        'md': '768px',     // Orta tabletler
        'lg': '1024px',    // Küçük laptop (13")
        'xl': '1280px',    // Orta laptop (15")
        '2xl': '1536px',   // Büyük ekranlar
      },
      fontSize: {
        'xs-mobile': ['10px', '14px'],
        'sm-mobile': ['12px', '16px'],
        'base-mobile': ['14px', '20px'],
        'lg-mobile': ['16px', '24px'],
        'xl-mobile': ['18px', '28px'],
        '2xl-mobile': ['20px', '32px'],
        '3xl-mobile': ['24px', '36px'],
        '4xl-mobile': ['32px', '40px'],
      },
      spacing: {
        '18': '4.5rem',    // 72px
        '88': '22rem',     // 352px
        '128': '32rem',    // 512px
      },
      maxWidth: {
        '8xl': '88rem',    // 1408px
        '9xl': '96rem',    // 1536px
      },
      minHeight: {
        'screen-75': '75vh',
        'screen-85': '85vh',
      }
    },
  },
  plugins: [],
}
