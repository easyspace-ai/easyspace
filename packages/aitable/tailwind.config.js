/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './examples/**/*.{js,ts,jsx,tsx}',
    './demo/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // 设计系统颜色
        surface: {
          base: '#ffffff',
          hover: '#f8fafc',
          active: '#f1f5f9',
          selected: '#e0f2fe',
          disabled: '#f9fafb',
          destructive: '#fef2f2',
          accent: '#eff6ff',
        },
        border: {
          subtle: '#e5e7eb',
          default: '#d1d5db',
          strong: '#9ca3af',
          focus: '#3b82f6',
          error: '#ef4444',
          accent: '#93c5fd',
        },
        text: {
          primary: '#111827',
          secondary: '#6b7280',
          tertiary: '#9ca3af',
          disabled: '#d1d5db',
          inverse: '#ffffff',
          destructive: '#dc2626',
          accent: '#2563eb',
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        'lg': '0.5rem',
        'xl': '0.75rem',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
      transitionProperty: {
        'colors-shadow': 'color, background-color, border-color, text-decoration-color, fill, stroke, box-shadow',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    // 添加自定义工具类
    function({ addUtilities }) {
      const newUtilities = {
        '.grid-cell': {
          '@apply border-r border-b border-border-subtle bg-surface-base': {},
        },
        '.grid-cell-hover': {
          '@apply hover:bg-surface-hover transition-colors duration-150': {},
        },
        '.grid-cell-selected': {
          '@apply bg-surface-selected border-border-focus ring-1 ring-border-focus': {},
        },
        '.toolbar-button': {
          '@apply inline-flex items-center justify-center gap-2 h-8 px-3 rounded-md text-sm font-medium': {},
          '@apply bg-white border border-gray-200 text-gray-700': {},
          '@apply hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900': {},
          '@apply active:bg-gray-100 transition-all duration-200 ease-out': {},
          '@apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500': {},
        },
        '.toolbar-button-primary': {
          '@apply bg-blue-600 border-blue-600 text-white': {},
          '@apply hover:bg-blue-700 hover:border-blue-700': {},
          '@apply active:bg-blue-800 shadow-sm hover:shadow-md': {},
        },
      };
      addUtilities(newUtilities);
    },
  ],
  // 确保所有使用的类都被包含
  safelist: [
    // 工具栏相关
    'toolbar-button',
    'toolbar-button-primary',
    // 网格相关
    'grid-cell',
    'grid-cell-hover',
    'grid-cell-selected',
    // 常用颜色
    'bg-primary-500',
    'bg-primary-600',
    'text-primary-600',
    'border-primary-500',
    // 常用间距
    'p-2', 'p-3', 'p-4',
    'm-2', 'm-3', 'm-4',
    'gap-1', 'gap-2', 'gap-3',
    // 常用尺寸
    'w-4', 'w-5', 'w-6', 'w-8',
    'h-4', 'h-5', 'h-6', 'h-8',
    // 常用圆角
    'rounded-sm', 'rounded-md', 'rounded-lg',
    // 常用阴影
    'shadow-sm', 'shadow-md', 'shadow-lg',
  ],
};
