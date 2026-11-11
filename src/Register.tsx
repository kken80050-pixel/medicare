import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Eye, EyeOff, Mail } from 'lucide-react';
import { useAuth } from './AuthContext';
import type { Branch } from './BranchesData';
import './Auth.css';

export function Register() {
const { register, resendVerification } = useAuth();
const navigate = useNavigate();
const location = useLocation();
const returnTo = location.state as { from?: string; branch?: Branch } | null;
const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [confirm, setConfirm] = useState('');
const [error, setError] = useState('');
const [showpassword, setshowpassword] = useState(false);
const [showpass, setshowpass] = useState(false);
const [info, setInfo] = useState('');
const [sent, setSent] = useState(false);
const carry = { from: returnTo?.from, branch: returnTo?.branch };

const handleSubmit = async (event: FormEvent) => {
  event.preventDefault();
  setError('');
  if (password.length < 6) {
    setError('Password must be at least 6 characters.');
    return;
  }
  if (password !== confirm) {
    setError('Passwords do not match.');
    return;
  }
  const result = await register(name, email, password);
  if (result) {
    setError(result);
    return;
  }
  setSent(true);
};

const resend = async () => {
  setError('');
  setInfo('');
  const result = await resendVerification(email, password);
  if (result.error) setError(result.error);
  else setInfo(result.notice);
};

return <main className="medicare-auth">
  <Link className="auth-brand" to="/" aria-label="MediCare Clinic home">
    <span className="auth-logo" aria-hidden="true"><Plus size={25} strokeWidth={2.7} /></span>
    <span>MediCare Clinic</span>
  </Link>
  <section className="auth-card" aria-labelledby="register-title">
    {sent ? <div className="auth-sent">
        <div className="auth-sent-icon"><Mail size={26} /></div>
        <h1 id="register-title">Check your email</h1>
        <p className="auth-subtitle">We sent a verification link to <strong>{email.trim()}</strong>. Click the link, then log in. If you do not see it, check your spam folder.</p>
        {info && <p className="auth-notice" role="status">{info}</p>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button type="button" className="auth-google" onClick={resend}>Resend verification email</button>
        <button type="button" className="primary-button auth-submit" onClick={() => navigate('/login', { state: carry })}>Go to Log In</button>
      </div> : <>
        <h1 id="register-title">Create your account</h1>
        <p className="auth-subtitle">Register to book appointments.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>Full Name<input required value={name} onChange={event => setName(event.target.value)} placeholder="Your full name" /></label>
          <label>Email Address<input type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@email.com" /></label>
          <label>Password<span className="password-field"><input type={showpassword ? 'text' : 'password'} required value={password} onChange={event => setPassword(event.target.value)}
          placeholder="Enter your password" /><button type="button" tabIndex={-1} className="password-toggle" onClick={() => setshowpassword(current => !current)} aria-label={showpassword ?
            'Hide password' : 'Show password'}>{showpassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
          <label>Confirm Password<span className="password-field"><input type={showpass ? 'text' : 'password'} required value={confirm} onChange={event => setConfirm(event.target.value)}
          placeholder="Enter your password" /><button type="button" tabIndex={-1} className="password-toggle" onClick={() => setshowpass(current => !current)} aria-label={showpass ?
            'Hide password' : 'Show password'}>{showpass ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="primary-button auth-submit" type="submit">Register</button>
        </form>
        <p className="auth-switch">Already have an account? <Link to="/login" state={carry}>Log in</Link></p>
      </>}
    <p className = "auth-back"><Link to = "/"><ArrowLeft size={15} /> Return to Homepage</Link></p>
  </section>
</main>;
}