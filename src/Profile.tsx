import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from './AuthContext';

export function ProfileModal({ onClose }: { onClose: () => void }) {
  const { user, updateAccount } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setSaving(true);
    const result = await updateAccount({ name, phone, email, currentPassword, newPassword });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setNotice(result.notice);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return <div className="profile-overlay" onClick={onClose}>
      <form className="profile-modal" onClick={event => event.stopPropagation()} onSubmit={submit}>
        <h2>Edit Profile</h2>
        <label>Full name
          <input value={name} onChange={event => setName(event.target.value)} required />
        </label>
        <label>Contact number
          <input value={phone} inputMode="numeric" maxLength={11} onChange={event => setPhone(event.target.value.replace(/\D/g, ''))} />
        </label>
        <label>Email
          <input type="email" value={email} onChange={event => setEmail(event.target.value)} required />
        </label>
        <fieldset>
          <legend>Security</legend>
          <label>Current password
            <input type="password" value={currentPassword} autoComplete="current-password" onChange={event => setCurrentPassword(event.target.value)} />
          </label>
          <label>New password
            <input type="password" value={newPassword} autoComplete="new-password" onChange={event => setNewPassword(event.target.value)} />
          </label>
          <label>Confirm new password
            <input type="password" value={confirmPassword} autoComplete="new-password" onChange={event => setConfirmPassword(event.target.value)} />
          </label>
        </fieldset>
        {error && <p className="profile-error">{error}</p>}
        {notice && <p className="profile-notice">{notice}</p>}
        <div className="profile-actions">
          <button type="button" className="dash-outline" onClick={onClose}>Close</button>
          <button type="submit" className="dash-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </form>
    </div>;
}