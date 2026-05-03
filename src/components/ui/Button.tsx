'use client';
import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  fullWidth?: boolean;
}

const variantClasses = {
  primary: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed',
  outline: 'border border-green-600 text-green-600 hover:bg-green-50 active:bg-green-100 disabled:border-gray-300 disabled:text-gray-300 disabled:cursor-not-allowed',
  ghost: 'text-gray-600 hover:bg-gray-100 active:bg-gray-200',
  danger: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3.5 text-base rounded-xl',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
