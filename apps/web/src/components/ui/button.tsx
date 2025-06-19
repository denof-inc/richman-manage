import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', asChild = false, children, ...props }, ref) => {
    const classes = cn(
      'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
      {
        'bg-primary text-white hover:bg-primary-light': variant === 'primary',
        'bg-accent text-white hover:bg-accent-light': variant === 'accent',
        'border border-primary text-primary hover:bg-primary hover:text-white':
          variant === 'outline',
        'h-9 px-3 text-sm': size === 'sm',
        'h-10 px-4 text-base': size === 'md',
        'h-11 px-6 text-lg': size === 'lg',
      },
      className
    );

    if (asChild) {
      // asChild機能は複雑な型解決が必要なため、シンプルに子要素をそのまま返す
      return children;
    }

    return (
      <button className={classes} ref={ref} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
