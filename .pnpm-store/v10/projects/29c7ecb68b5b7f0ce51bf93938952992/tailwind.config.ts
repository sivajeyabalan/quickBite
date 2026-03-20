import type { Config } from 'tailwindcss';

export default {
  theme: {
    extend: {
      fontFamily: {
        heading: ['Lexend', 'sans-serif'],
        body: ['Montserrat', 'sans-serif'],
        ui: ['Montserrat', 'sans-serif'],
        accent: ['Poppins', 'sans-serif'],
      },
    },
  },
} satisfies Config;
