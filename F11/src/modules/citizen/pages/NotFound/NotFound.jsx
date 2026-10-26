import { useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo/Logo';
import Button from '../../components/Button/Button';
import './NotFound.css';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="not-found">
      <Logo size={52} />
      <h1>404</h1>
      <p>This page has wandered off. Let&rsquo;s get you back on track.</p>
      <Button onClick={() => navigate('/')}>Back to Home</Button>
    </div>
  );
}
