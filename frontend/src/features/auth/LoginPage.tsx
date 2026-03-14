import { useState, type SubmitEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../../components/ui/Spinner';

export default function LoginPage(){

    const {login , loading} = useAuth();

    const [form , setForm] = useState({email: '' , password : ''});
    const [errors , setErrors] = useState<Record<string , string>>({});

    const validate = () => {
        const e: Record<string , string > = {};
        if(!form.email) e.email = 'Email is required';
        if(!form.password) e.password = 'Password is required';
        if(form.email && !/\S+@\S+\.\S+/.test(form.email)){
            e.email = 'Enter a valid email';
        }
        return e ;
    }

    const handleSubmit = async ( e : SubmitEvent) => {
        e.preventDefault();
        const validation = validate();
        if(Object.keys(validation).length > 0){
            setErrors(validation);
            return ;
        }
        setErrors({});
        await login(form.email , form.password);
    };
    return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-orange-500">🍽 QuickBite</h1>
          <p className="text-gray-500 mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="you@example.com"
              className={`w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition
                ${errors.email
                  ? 'border-red-400 focus:ring-2 focus:ring-red-300'
                  : 'border-gray-300 focus:ring-2 focus:ring-orange-400'
                }`}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              className={`w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition
                ${errors.password
                  ? 'border-red-400 focus:ring-2 focus:ring-red-300'
                  : 'border-gray-300 focus:ring-2 focus:ring-orange-400'
                }`}
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60
                       text-white font-semibold py-2.5 rounded-lg transition"
          >
            {loading ? <Spinner size="sm" /> : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-orange-500 font-medium hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}