import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { 
  User, Mail, Lock, Phone, Building2, Wrench, Shield, 
  Code, TestTube, Briefcase, UserPlus, Check, FileText
} from 'lucide-react';

export const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    full_name: '',
    role: 'Developer',
    department: 'Engineering',
    phone: '',
    skills: 'React, Python, SQL'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { register } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleSelect = (selectedRole) => {
    setFormData({ ...formData, role: selectedRole });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.username || !formData.password || !formData.full_name) {
      setError('Please fill in all required fields: Full Name, Username, Corporate Email, and Password');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      const data = await register(formData);
      addNotification({
        title: 'Registration Successful!',
        message: `Account created for ${data.user.full_name} (${data.user.role})`,
        type: 'success'
      });
      navigate('/dashboard');
    } catch (err) {
      console.error(
        "Registration failed:",
        err.response?.data || err.message
      );
      const msg = err.response?.data?.error || 
        (err.message === 'Network Error' || !err.response 
          ? 'Network Error: Unable to connect to Flask backend server on port 5000.'
          : 'Registration failed. Please try again.');
      setError(msg);
      addNotification({
        title: 'Registration Error',
        message: msg,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const rolesList = [
    {
      id: 'Admin',
      title: 'Admin',
      icon: Shield,
      desc: 'Full system control, user management, project creation & role policies'
    },
    {
      id: 'Developer',
      title: 'Developer',
      icon: Code,
      desc: 'View assigned bugs, AI solution co-pilot, code fix submissions'
    },
    {
      id: 'Tester',
      title: 'Tester',
      icon: TestTube,
      desc: 'Report bugs, upload screenshots for Gemini Vision OCR & enhancement'
    },
    {
      id: 'Project Manager',
      title: 'Project Manager',
      icon: Briefcase,
      desc: 'Monitor health metrics, developer assignment & release summaries'
    },
    {
      id: 'Reporter',
      title: 'Reporter',
      icon: FileText,
      desc: 'Report and track software defects, upload evidence, and monitor the progress of submitted issues.'
    }
  ];

  return (
    <Card className="p-6 sm:p-8 border border-slate-800/90 shadow-2xl">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-100">Create BugFlow Account</h3>
        <p className="text-xs text-slate-400 mt-1">
          Select your enterprise role and complete profile registration
        </p>
      </div>

      {/* Role Selection Grid */}
      <div className="mb-6">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-2">
          Select Account Role <span className="text-rose-400">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {rolesList.map((r) => {
            const Icon = r.icon;
            const isSelected = formData.role === r.id;

            return (
              <div
                key={r.id}
                onClick={() => handleRoleSelect(r.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-600/15 border-indigo-500 shadow-md shadow-indigo-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-200">{r.title}</span>
                  </div>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">{r.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Registration Fields */}
      <form onSubmit={handleRegister} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Full Name *"
            name="full_name"
            placeholder="Jane Doe"
            icon={User}
            value={formData.full_name}
            onChange={handleInputChange}
            required
          />

          <Input
            label="Username *"
            name="username"
            placeholder="janedoe"
            icon={User}
            value={formData.username}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Corporate Email *"
            type="email"
            name="email"
            placeholder="jane@company.com"
            icon={Mail}
            value={formData.email}
            onChange={handleInputChange}
            required
          />

          <Input
            label="Password *"
            type="password"
            name="password"
            placeholder="Min. 6 characters"
            icon={Lock}
            value={formData.password}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Department"
            name="department"
            placeholder="Quality Assurance / R&D"
            icon={Building2}
            value={formData.department}
            onChange={handleInputChange}
          />

          <Input
            label="Phone Number"
            name="phone"
            placeholder="+1 (555) 000-0000"
            icon={Phone}
            value={formData.phone}
            onChange={handleInputChange}
          />
        </div>

        <Input
          label="Skills / Technical Stack"
          name="skills"
          placeholder="Comma separated: React, Python, Cypress, Docker"
          icon={Wrench}
          value={formData.skills}
          onChange={handleInputChange}
          helperText="Used by Gemini AI for smart defect developer assignment"
        />

        <Button
          type="submit"
          variant="gradient"
          size="lg"
          className="w-full mt-2"
          isLoading={isLoading}
          icon={UserPlus}
        >
          Create Enterprise Account
        </Button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-400">
        Already registered?{' '}
        <Link to="/login" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">
          Sign In Here
        </Link>
      </div>
    </Card>
  );
};
