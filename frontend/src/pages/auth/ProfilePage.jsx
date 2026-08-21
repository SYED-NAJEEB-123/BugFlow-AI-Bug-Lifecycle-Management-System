import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme, THEMES } from '../../context/ThemeContext';
import { useNotification } from '../../context/NotificationContext';
import { authService } from '../../services/authService';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { 
  User, Mail, Phone, Building2, Wrench, Shield, 
  Lock, Save, Key, Palette, Activity, CheckCircle2
} from 'lucide-react';

export const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { addNotification } = useNotification();

  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    department: user?.department || '',
    phone: user?.phone || '',
    skills: Array.isArray(user?.skills) ? user?.skills.join(', ') : (user?.skills || ''),
    theme_preference: user?.theme_preference || theme
  });

  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      const res = await authService.updateProfile(profileData);
      updateUser(res.user);
      setTheme(res.user.theme_preference);
      addNotification({
        title: 'Profile Updated',
        message: 'Your account details have been updated.',
        type: 'success'
      });
    } catch (err) {
      addNotification({
        title: 'Update Error',
        message: err.response?.data?.error || 'Failed to update profile',
        type: 'error'
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm_password) {
      addNotification({
        title: 'Password Mismatch',
        message: 'New password and confirmation do not match',
        type: 'error'
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await authService.changePassword({
        current_password: passwords.current_password,
        new_password: passwords.new_password
      });
      addNotification({
        title: 'Password Changed',
        message: 'Your password has been changed successfully.',
        type: 'success'
      });
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      addNotification({
        title: 'Password Change Failed',
        message: err.response?.data?.error || 'Failed to change password',
        type: 'error'
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const getRoleVariant = (role) => {
    switch (role) {
      case 'Admin': return 'admin';
      case 'Developer': return 'developer';
      case 'Tester': return 'tester';
      case 'Project Manager': return 'manager';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Profile Banner Card */}
      <Card className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <img
          src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
          alt={user?.full_name}
          className="w-24 h-24 rounded-full ring-4 ring-indigo-500/30 object-cover bg-slate-900 shadow-2xl"
        />
        <div className="text-center md:text-left flex-1 space-y-2">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            <h2 className="text-2xl font-black text-slate-100">{user?.full_name}</h2>
            <Badge variant={getRoleVariant(user?.role)} size="lg">
              {user?.role}
            </Badge>
          </div>
          <p className="text-xs text-slate-400 font-mono flex items-center justify-center md:justify-start gap-2">
            <Mail className="w-3.5 h-3.5 text-indigo-400" />
            <span>{user?.email}</span>
            <span className="text-slate-600">•</span>
            <span>@{user?.username}</span>
          </p>
          <div className="flex flex-wrap gap-2 pt-1 justify-center md:justify-start">
            {user?.skills && (Array.isArray(user.skills) ? user.skills : user.skills.split(',')).map((sk, idx) => (
              <span key={idx} className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-300 border border-slate-700">
                {sk.trim()}
              </span>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Profile Settings Form */}
        <div className="md:col-span-7 space-y-6">
          <Card className="p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
              <User className="w-4 h-4 text-indigo-400" />
              <span>Personal Details & Preferences</span>
            </h3>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <Input
                label="Full Name"
                value={profileData.full_name}
                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                icon={User}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Department"
                  value={profileData.department}
                  onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                  icon={Building2}
                />
                <Input
                  label="Phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  icon={Phone}
                />
              </div>

              <Input
                label="Skills / Stack"
                value={profileData.skills}
                onChange={(e) => setProfileData({ ...profileData, skills: e.target.value })}
                icon={Wrench}
                helperText="Comma separated: React, Python, PostgreSQL"
              />

              {/* Theme Preference Radio Group */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-2">
                  Preferred UI Color Theme
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: THEMES.DARK, name: 'Dark Slate', bg: 'bg-slate-900 border-slate-700 text-slate-200' },
                    { id: THEMES.LIGHT, name: 'Clean Light', bg: 'bg-slate-100 border-slate-300 text-slate-900' },
                    { id: THEMES.BLUE, name: 'Deep Blue', bg: 'bg-blue-950 border-blue-800 text-blue-200' },
                    { id: THEMES.PURPLE, name: 'Neon Purple', bg: 'bg-purple-950 border-purple-800 text-purple-200' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setProfileData({ ...profileData, theme_preference: t.id });
                        setTheme(t.id);
                      }}
                      className={`p-2.5 rounded-lg border text-xs font-medium flex items-center justify-between transition-colors ${t.bg} ${
                        profileData.theme_preference === t.id ? 'ring-2 ring-indigo-500 font-bold' : ''
                      }`}
                    >
                      <span>{t.name}</span>
                      {profileData.theme_preference === t.id && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                isLoading={isUpdatingProfile}
                icon={Save}
                className="w-full"
              >
                Save Profile Changes
              </Button>
            </form>
          </Card>
        </div>

        {/* Change Password & Role Permissions Panel */}
        <div className="md:col-span-5 space-y-6">
          <Card className="p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
              <Key className="w-4 h-4 text-cyan-400" />
              <span>Change Security Password</span>
            </h3>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                value={passwords.current_password}
                onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
                icon={Lock}
                required
              />

              <Input
                label="New Password"
                type="password"
                value={passwords.new_password}
                onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                icon={Lock}
                required
              />

              <Input
                label="Confirm New Password"
                type="password"
                value={passwords.confirm_password}
                onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
                icon={Lock}
                required
              />

              <Button
                type="submit"
                variant="secondary"
                isLoading={isUpdatingPassword}
                icon={Shield}
                className="w-full"
              >
                Update Password
              </Button>
            </form>
          </Card>

          {/* Role Capabilities Summary */}
          <Card className="p-6 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Your Role Capabilities ({user?.role})</span>
            </h4>
            <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside leading-relaxed">
              {user?.role === 'Admin' && (
                <>
                  <li>Full system configuration and RBAC control</li>
                  <li>User account creation, deactivation, and role updates</li>
                  <li>Create, edit, and archive bug projects</li>
                  <li>View enterprise-wide AI analytics & reports</li>
                </>
              )}
              {user?.role === 'Developer' && (
                <>
                  <li>View assigned issues and update bug status</li>
                  <li>Access Gemini AI Solution copilot and code fixes</li>
                  <li>Add discussion comments and file attachments</li>
                  <li>Resolve bugs and upload fixes</li>
                </>
              )}
              {user?.role === 'Tester' && (
                <>
                  <li>Create bug reports manually or via Gemini Vision OCR</li>
                  <li>Upload bug screenshots for multi-modal analysis</li>
                  <li>Edit reported issues and track verification</li>
                </>
              )}
              {user?.role === 'Project Manager' && (
                <>
                  <li>Monitor project timelines, health, and progress</li>
                  <li>Assign issues and manage developer allocations</li>
                  <li>Generate release notes and summary reports</li>
                </>
              )}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};
