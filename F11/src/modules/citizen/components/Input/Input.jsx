import { useId, useState } from 'react';
import { Eye, EyeOff, CircleAlert } from 'lucide-react';
import './Input.css';

export default function Input({
  label,
  icon: Icon,
  error,
  helper,
  type = 'text',
  className = '',
  textarea = false,
  rows = 4,
  options,
  placeholder,
  ...props
}) {
  const id = useId();
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : type;
  const Field = options ? 'select' : textarea ? 'textarea' : 'input';

  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`}>
      {label && <label htmlFor={id} className="field__label">{label}</label>}
      <div className="field__control">
        {Icon && <Icon className="field__icon" size={18} aria-hidden="true" />}
        <Field
          id={id}
          type={textarea || options ? undefined : resolvedType}
          placeholder={options ? undefined : placeholder}
          rows={textarea ? rows : undefined}
          className={`field__input ${Icon ? 'field__input--with-icon' : ''} ${textarea ? 'field__input--textarea' : ''} ${options ? 'field__input--select' : ''}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : helper ? `${id}-helper` : undefined}
          {...props}
        >
          {options && (
            <>
              <option value="">{placeholder || 'Select'}</option>
              {options.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </>
          )}
        </Field>
        {isPassword && (
          <button
            type="button"
            className="field__toggle"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && (
        <span id={`${id}-error`} className="field__error">
          <CircleAlert size={13} /> {error}
        </span>
      )}
      {!error && helper && <span id={`${id}-helper`} className="field__helper">{helper}</span>}
    </div>
  );
}
