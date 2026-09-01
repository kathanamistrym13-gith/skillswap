import './Button.css';
import { Loader2 } from 'lucide-react';

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false, 
  disabled, 
  className = '', 
  ...props 
}) {
  const classes = `btn btn-${variant} btn-${size} ${isLoading ? 'btn-loading' : ''} ${className}`;

  return (
    <button 
      className={classes} 
      disabled={disabled || isLoading} 
      {...props}
    >
      {isLoading && <Loader2 className="spinner" size={18} />}
      <span className={isLoading ? 'invisible' : ''}>{children}</span>
    </button>
  );
}
