import './Card.css';

export default function Card({ children, className = '', interactive = false, elevated = false, as = 'div', ...props }) {
  const Component = as;
  return (
    <Component
      className={`card ${interactive ? 'card--interactive' : ''} ${elevated ? 'card--elevated' : ''} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
