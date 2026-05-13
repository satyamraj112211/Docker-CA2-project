import React, { useState } from 'react';
import api from '../utils/api';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../sections/Navbar';
import { Button } from './Button';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate(); 

  const handleLogin = async (e) => {
    e.preventDefault(); 
    try {
      const response = await api.post(
        '/api/login',
        { email, password }
      );
      if (response.data === "logged in") {
        navigate('/Home'); 
      } else {
        setMessage(response.data); 
      }
    } catch (error) {
      setMessage(error.response?.data || 'Something went wrong');
    }
  };

  return (
    <section className="bg-neutral-950 text-white min-h-screen flex flex-col pt-32 pb-24 relative overflow-clip font-sans antialiased">
      <Navbar />
      
      <div className="container max-w-md mx-auto px-4 z-10 flex-grow flex flex-col justify-center">
        <div className="bg-neutral-900/50 backdrop-blur border border-white/10 rounded-3xl p-8 shadow-2xl w-full">
          <h1 className="text-3xl font-medium text-center mb-8">
            Sign in to your account
          </h1>
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label
                htmlFor="email"
                className="block mb-2 text-sm font-medium text-white/50 pl-4"
              >
                Your email
              </label>
              <input
                type="email"
                name="email"
                id="email"
                className="bg-transparent border border-white/15 rounded-full px-4 py-3 w-full outline-none focus:border-lime-400 transition-colors placeholder-white/30"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block mb-2 text-sm font-medium text-white/50 pl-4"
              >
                Password
              </label>
              <input
                type="password"
                name="password"
                id="password"
                placeholder="••••••••"
                className="bg-transparent border border-white/15 rounded-full px-4 py-3 w-full outline-none focus:border-lime-400 transition-colors placeholder-white/30"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              className="w-full flex justify-center !mt-8"
            >
              Sign in
            </Button>
          </form>
          {message && (
            <p className="mt-4 text-sm font-medium text-red-500 text-center">
              {message}
            </p>
          )}
          <p className="text-sm text-center text-white/50 mt-6 mt-8">
            Don’t have an account yet?{' '}
            <Link
              to="/register"
              className="font-medium text-lime-400 hover:text-lime-300 transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Login;
