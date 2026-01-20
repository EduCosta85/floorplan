import type { InputHTMLAttributes } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export function Checkbox({
  label,
  id,
  className = '',
  ...props
}: CheckboxProps) {
  const checkboxId = id ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`checkbox-group ${className}`}>
      <input
        type="checkbox"
        id={checkboxId}
        className="checkbox-group__input"
        {...props}
      />
      <label htmlFor={checkboxId} className="checkbox-group__label">
        {label}
      </label>
    </div>
  );
}

export default Checkbox;
