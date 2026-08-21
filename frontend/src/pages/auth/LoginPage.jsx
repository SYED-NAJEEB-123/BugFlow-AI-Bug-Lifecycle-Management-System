import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Mail, Lock, LogIn, Sparkles } from 'lucide-react';

export const LoginPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier || !password) {
      setError('Please enter your email/username and password');
      return;
    }

    setIsLoading(true);
    try {
      const data = await login({ email_or_username: identifier, password });
      addNotification({
        title: `Welcome back, ${data.user.full_name}!`,
        message: `Authenticated as ${data.user.role}`,
        type: 'success'
      });
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || 
        (err.message === 'Network Error' || !err.response 
          ? 'Network Error: Unable to connect to Flask backend server on port 5000.'
          : 'Authentication failed. Please check your credentials.');
      setError(msg);
      addNotification({
        title: 'Login Error',
        message: msg,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 sm:p-8 border border-slate-800/90 shadow-2xl">
      <div className="mb-6 text-center sm:text-left">
        <h3 className="text-xl font-bold text-slate-100 flex items-center justify-center sm:justify-start gap-2">
          <span>Sign In to BugFlow</span>
          <Sparkles className="w-4 h-4 text-indigo-400" />
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Access your role-based bug tracking workspace & Gemini AI engine
        </p>
      </div>

      {/* Real Authentication Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 font-medium">
            {error}
          </div>
        )}

        <Input
          label="Email or Username"
          placeholder="user@company.com or username"
          icon={Mail}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••••••"
          icon={Lock}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-slate-400">
            <input type="checkbox" className="rounded bg-slate-900 border-slate-800 text-indigo-500 focus:ring-indigo-500/50" />
            <span>Remember me</span>
          </label>
          <a
            href="#forgot"
            onClick={(e) => { e.preventDefault(); alert("Forgot password: Please contact system admin or re-register account."); }}
            className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
          >
            Forgot Password?
          </a>
        </div>

        <Button
          type="submit"
          variant="gradient"
          size="lg"
          className="w-full mt-2"
          isLoading={isLoading}
          icon={LogIn}
        >
          Authenticate Account
        </Button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-400">
        Don't have an account yet?{' '}
        <Link to="/register" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">
          Register New Account
        </Link>
      </div>
    </Card>
  );
};
