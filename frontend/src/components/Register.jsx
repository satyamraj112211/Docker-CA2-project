import React, { useState } from "react";
import api from '../utils/api';
import { Link } from 'react-router-dom';
import Navbar from '../sections/Navbar';
import { Button } from './Button';

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    try {
      const response = await api.post("/api/register", { email, password });
      setMessage("Account created successfully!");
      console.log("Response from server:", response.data); 
    } catch (error) {
      console.error("Error:", error.response?.data || error.message);
      setMessage("An error occurred while creating the account.");
    }
  };

  return (
    <section className="bg-neutral-950 text-white min-h-screen flex flex-col pt-32 pb-24 relative overflow-clip font-sans antialiased">
      <Navbar />
      
      <div className="container max-w-md mx-auto px-4 z-10 flex-grow flex flex-col justify-center">
        <div className="bg-neutral-900/50 backdrop-blur border border-white/10 rounded-3xl p-8 shadow-2xl w-full">
          <h1 className="text-3xl font-medium text-center mb-8">
            Create an account
          </h1>
          <form className="space-y-6" onSubmit={handleSubmit}>
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent border border-white/15 rounded-full px-4 py-3 w-full outline-none focus:border-lime-400 transition-colors placeholder-white/30"
                placeholder="name@company.com"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-transparent border border-white/15 rounded-full px-4 py-3 w-full outline-none focus:border-lime-400 transition-colors placeholder-white/30"
                required
              />
            </div>
            <div className="flex items-start pl-4">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  aria-describedby="terms"
                  type="checkbox"
                  className="w-4 h-4 rounded bg-transparent border-white/15 focus:ring-lime-400"
                  required
                />
              </div>
              <div className="ml-3 text-sm">
                <label
                  htmlFor="terms"
                  className="font-light text-white/50"
                >
                  I accept the{" "}
                  <a
                    className="font-medium text-lime-400 hover:text-lime-300 transition-colors"
                    href="#"
                  >
                    Terms and Conditions
                  </a>
                </label>
              </div>
            </div>
            <Button
              type="submit"
              variant="primary"
              className="w-full flex justify-center !mt-8"
            >
              Create an account
            </Button>
            {message && (
              <p className="text-sm font-medium text-lime-400 mt-4 text-center">
                {message}
              </p>
            )}
            <p className="text-sm text-center text-white/50 mt-6 mt-8">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-lime-400 hover:text-lime-300 transition-colors"
              >
                Login here
              </Link>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Register;
