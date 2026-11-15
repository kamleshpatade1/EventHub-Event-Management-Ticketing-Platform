import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import AuthLayout, { PasswordVisibilityIcon } from './AuthLayout.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../auth/useAuth.js';
import { getSafeRedirectDestination } from '../auth/redirectUtils.js';

const inputClassName =
  'h-11 w-full rounded-xl border border-[#d4c7b9] bg-white px-3.5 text-sm text-[#211c18] outline-none placeholder:text-[#8c7d70] focus:border-[#9f3b27] focus:ring-1 focus:ring-[#9f3b27] transition-colors';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const { setUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  async function handleSubmit(e) {
    e.preventDefault();

    const nextErrors = {};
    const cleanEmail = email.trim();

    if (!cleanEmail) nextErrors.email = 'Enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!password) nextErrors.password = 'Enter your password.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);

    try {
      const response = await api('/auth/login', {
        method: 'POST',
        body: { email: cleanEmail, password },
      });

      setUser(response.data);

      navigate(
        getSafeRedirectDestination(location.state?.from, params.get('next')),
        { replace: true }
      );
    } catch (error) {
      setErrors({
        password:
          error.status === 401 ? 'Invalid email or password.' : undefined,
        form:
          error.status === 401 ? undefined : error.message || 'Login failed.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Enter your email and password to access your account."
      footer={
        <>
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="font-semibold text-[#9f3b27] hover:underline"
          >
            Register now.
          </Link>
        </>
      }
    >
      <form className="space-y-4" noValidate onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label
            htmlFor="login-email"
            className="block text-xs font-semibold uppercase tracking-wider text-[#63564b]"
          >
            Email
          </label>
          <input
            id="login-email"
            className={inputClassName}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((old) => ({
                ...old,
                email: undefined,
                form: undefined,
              }));
            }}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="text-xs text-[#9f3b27]">{errors.email}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="login-password"
            className="block text-xs font-semibold uppercase tracking-wider text-[#63564b]"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              className={`${inputClassName} pr-11`}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((old) => ({
                  ...old,
                  password: undefined,
                  form: undefined,
                }));
              }}
              aria-invalid={!!errors.password}
            />
            <button
              type="button"
              className="absolute right-3 top-3 text-[#8c7d70] hover:text-[#211c18]"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <PasswordVisibilityIcon visible={showPassword} />
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-[#9f3b27]">{errors.password}</p>
          )}
        </div>

        {errors.form && (
          <p
            role="alert"
            className="rounded-lg border border-[#f4bebe] bg-[#fbebe8] p-2.5 text-xs text-[#9f3b27]"
          >
            {errors.form}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 text-xs">
          <label className="flex items-center gap-2 text-[#63564b] cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="size-4 rounded accent-[#9f3b27]"
            />
            Remember me
          </label>
          <a href="#forgot-password" className="text-[#9f3b27] hover:underline">
            Forgot password?
          </a>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 h-11 w-full rounded-full bg-[#9f3b27] font-semibold text-[#fff4e8] transition hover:bg-[#852f1e] disabled:cursor-not-allowed disabled:opacity-60 shadow-xs"
        >
          {loading ? 'Logging in...' : 'Log in'}
        </button>
      </form>
    </AuthLayout>
  );
}

export default Login;
