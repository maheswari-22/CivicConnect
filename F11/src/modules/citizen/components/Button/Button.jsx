import './Button.css';

/**
 * Shared Button component.
 * variant: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
 * size: 'md' | 'lg' | 'sm'
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  className = '',
  ...props
}) {
  return (
    <button
      className={`btn btn--${variant} btn--${size} ${fullWidth ? 'btn--full' : ''} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span className="btn__spinner" aria-hidden="true" />
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="btn__icon" size={18} />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon className="btn__icon" size={18} />}
        </>
      )}
    </button>
  );
}
