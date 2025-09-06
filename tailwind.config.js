/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        '2xs': '375px',
        'xs': '480px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
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
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      minHeight: {
        'screen-75': '75vh',
        'screen-85': '85vh',
      }
    },
  },
  plugins: [],
}
