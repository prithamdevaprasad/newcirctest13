import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('login'); // 'login' or 'signup'

  const navigate = useNavigate();
  const { user, signIn, signUp, signInWithOAuth } = useAuth();
  
  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let result;
      if (mode === 'login') {
        result = await signIn(email, password);
      } else {
        result = await signUp(email, password);
      }

      if (result.error) {
        setError(result.error.message);
      } else if (result.data && result.data.user) {
        // Redirect to home page after successful login
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    setLoading(true);
    setError(null);

    try {
      const result = await signInWithOAuth(provider);
      if (result.error) {
        setError(result.error.message);
      }
      // Note: OAuth redirects are handled by Supabase automatically
      // No need to manually redirect here
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">{mode === 'login' ? 'Log In' : 'Sign Up'}</h2>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleEmailAuth} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="auth-input"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="auth-input"
            />
          </div>
          
          <button 
            type="submit" 
            className="auth-button primary" 
            disabled={loading}
          >
            {loading ? 'Processing...' : mode === 'login' ? 'Log In' : 'Sign Up'}
          </button>
        </form>
        
        <div className="auth-divider">
          <span>OR</span>
        </div>
        
        <div className="oauth-buttons">
          <button 
            onClick={() => handleOAuth('github')} 
            className="auth-button github"
            disabled={loading}
          >
            Continue with GitHub
          </button>
          <button 
            onClick={() => handleOAuth('google')} 
            className="auth-button google"
            disabled={loading}
          >
            Continue with Google
          </button>
        </div>
        
        <div className="auth-toggle">
          {mode === 'login' ? (
            <p>Don't have an account? <button onClick={() => setMode('signup')}>Sign Up</button></p>
          ) : (
            <p>Already have an account? <button onClick={() => setMode('login')}>Log In</button></p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;