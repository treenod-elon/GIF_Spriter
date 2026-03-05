import { forwardRef, type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'upload' | 'edit' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
}

const variants = {
  primary:
    'bg-accent-primary text-text-inverse hover:bg-accent-primary-hover active:bg-accent-primary-active',
  secondary:
    'bg-accent-primary text-text-inverse hover:bg-accent-primary-hover active:bg-accent-primary-active',
  upload:
    'bg-accent-primary text-text-inverse hover:bg-accent-primary-hover active:bg-accent-primary-active',
  edit:
    'bg-accent-primary text-text-inverse hover:bg-accent-primary-hover active:bg-accent-primary-active',
  ghost:
    'bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/5',
  glass:
    'border border-[var(--glass-border)] text-text-primary hover:bg-[var(--glass-bg-hover)] hover:border-[var(--glass-border-hover)]',
};

const sizes = {
  sm: 'h-8 px-3 text-xs rounded-lg',
  md: 'h-10 px-5 text-sm rounded-lg',
  lg: 'h-12 px-6 text-base rounded-xl',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center gap-2 font-semibold
          transition-all duration-200
          disabled:opacity-50 disabled:pointer-events-none
          ${variants[variant]}
          ${sizes[size]}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
