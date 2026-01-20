import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  suffix?: string;
}

export function Input({
  label,
  error,
  suffix,
  id,
  className = '',
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`input-group ${error ? 'input-group--error' : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input-group__label">
          {label}
        </label>
      )}
      <div className="input-group__wrapper">
        <input
          id={inputId}
          className="input-group__input"
          {...props}
        />
        {suffix && <span className="input-group__suffix">{suffix}</span>}
      </div>
      {error && <span className="input-group__error">{error}</span>}
    </div>
  );
}

export default Input;
