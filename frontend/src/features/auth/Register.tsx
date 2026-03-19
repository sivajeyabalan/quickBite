import { useState, type SubmitEvent as FormEvent} from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../../components/ui/Spinner';

export default function RegisterPage() {
  const { register, loading } = useAuth();

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name)     e.name     = 'Name is required';
    if (!form.email)    e.email    = 'Email is required';
    if (!form.password) e.password = 'Password is required';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) {
      e.email = 'Enter a valid email';
    }
    if (form.password && form.password.length < 6) {
      e.password = 'Password must be at least 6 characters';
    }
    if (form.password !== form.confirmPassword) {
      e.confirmPassword = 'Passwords do not match';
    }
    if (form.phone && !/^[+\d][\d\s()-]{6,19}$/.test(form.phone)) {
      e.phone = 'Enter a valid phone number';
    }
    return e;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validation = validate();
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    setErrors({});
    await register({
      name:     form.name,
      email:    form.email,
      password: form.password,
      phone:    form.phone || undefined,
    });
  };

  const field = (
    label: string,
    key: keyof typeof form,
    type = 'text',
    placeholder = '',
  ) => (
    <div>
      <label className="block font-ui text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        inputMode={key === 'phone' ? 'tel' : undefined}
        pattern={key === 'phone' ? '^[+\\d][\\d\\s()-]{6,19}$' : undefined}
        className={`w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition
          ${errors[key]
            ? 'border-red-400 focus:ring-2 focus:ring-red-300'
            : 'border-gray-300 focus:ring-2 focus:ring-orange-400'
          }`}
      />
      {errors[key] && (
        <p className="text-red-500 text-xs mt-1">{errors[key]}</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">

        <div className="text-center mb-8">
          <h1 className="heading-2 text-orange-500"> QuickBite</h1>
          <p className="body-text-sm text-gray-500 mt-1">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {field('Full Name',        'name',            'text',     'SJB')}
          {field('Email',            'email',           'email',    'you@example.com')}
          {field('Phone (optional)', 'phone',           'tel',      '+91 9999999999')}
          {field('Password',         'password',        'password', '••••••••')}
          {field('Confirm Password', 'confirmPassword', 'password', '••••••••')}

          <button
            type="submit"
            disabled={loading}
            className="button-text w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60
                       text-white py-2.5 rounded-lg transition"
          >
            {loading ? <Spinner size="sm" /> : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-orange-500 font-medium hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}