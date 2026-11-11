import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from './AuthContext';
import type { Branch } from './BranchesData';
import './Auth.css';
import googlebutton from './assets/google.png';

export function Login() {
const { user, login, loginWithGoogle, resendVerification } = useAuth();
const navigate = useNavigate();
const location = useLocation();
const returnTo = location.state as { from?: string; branch?: Branch; notice?: string } | null;
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [error, setError] = useState('');
const [info, setInfo] = useState(returnTo?.notice ?? '');
const [showpassword, setshowpassword] = useState(false);

useEffect(() => {
  if (user) navigate(returnTo?.from ?? '/dashboard', { replace: true, state: returnTo?.branch ? { branch: returnTo.branch } : undefined });
}, [user]);

const handleSubmit = async (event: FormEvent) => {
  event.preventDefault();
  setError('');
  setInfo('');
  const result = await login(email, password);
  if (result) setError(result);
};

const handleGoogle = async () => {
  setError('');
  setInfo('');
  const result = await loginWithGoogle();
  if (result) setError(result);
};

const resend = async () => {
  setError('');
  const result = await resendVerification(email, password);
  if (result.error) setError(result.error);
  else setInfo(result.notice);
};

const carry = { from: returnTo?.from, branch: returnTo?.branch };

return <main className="medicare-auth">
  <Link className="auth-brand" to="/" aria-label="MediCare Clinic home">
    <span className="auth-logo" aria-hidden="true"><Plus size={25} strokeWidth={2.7} /></span>
    <span>MediCare Clinic</span>
  </Link>
  <section className="auth-card" aria-labelledby="login-title">
    <h1 id="login-title">Welcome back</h1>
    <p className="auth-subtitle">Log in to book an appointment and manage your visits.</p>
    <form className="auth-form" onSubmit={handleSubmit}>
      <label>Email Address<input type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@email.com" /></label>
      <label>Password<span className="password-field"><input type={showpassword ? 'text' : 'password'} required value={password} onChange={event => setPassword(event.target.value)}
      placeholder="Enter your password" /><button type="button" tabIndex={-1} className="password-toggle" onClick={() => setshowpassword(current => !current)} aria-label={showpassword ? 'Hide password' :
      'Show password'}>{showpassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
      {info && <p className="auth-notice" role="status">{info}</p>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      {error.startsWith('Please verify') && <button type="button" className="auth-link-button" onClick={resend}>Resend verification email</button>}
      <button className="primary-button auth-submit" type="submit">Log In</button>
    </form>
    <div className="auth-divider">or</div>
        <button type="button" className="auth-google-image" onClick={handleGoogle}><img src={googlebutton} alt="Sign in with Google" /></button>
    <p className="auth-switch">Not yet registered? <Link to="/register" state={carry}>Register here</Link></p>
    <p className = "auth-back"><Link to = "/"><ArrowLeft size={15} /> Return to Homepage</Link></p>
  </section>
</main>;
}