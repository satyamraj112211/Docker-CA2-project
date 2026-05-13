"use client";

import { useState } from "react";
import { twMerge } from "tailwind-merge";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/Button";
import logoImage from "@/assets/images/logo.svg";
import { Link, useNavigate } from "react-router-dom";

const navLinks = [
  { label: "Landing", href: "/" },
  { label: "Dashboard", href: "/Home" },
  { label: "Create Note", href: "/create" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <section className="fixed w-full top-0 py-4 lg:py-8 z-50 pointer-events-none">
        <div className="container max-w-5xl pointer-events-auto">
          <div className="border border-white/15 rounded-[27px] md:rounded-full bg-neutral-950/70 backdrop-blur">
            <div className="grid grid-cols-2 lg:grid-cols-3 p-2 px-4 md:pr-2 items-center">
              <div>
                <img
                  src={logoImage}
                  alt="Logo"
                  className="w-auto h-9 md:h-auto"
                />
              </div>
              <div className="lg:flex justify-center items-center hidden">
                <nav className="flex gap-6 font-medium">
                  {navLinks.map((link) => (
                    <Link to={link.href} key={link.label} className="text-white/70 hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </div>
              <div className="flex justify-end gap-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="feather feather-menu md:hidden cursor-pointer"
                  onClick={() => setIsOpen(!isOpen)}
                >
                  <line
                    x1="3"
                    y1="6"
                    x2="21"
                    y2="6"
                    className={twMerge(
                      "origin-left transition",
                      isOpen && "rotate-45 -translate-y-1"
                    )}
                  />
                  <line
                    x1="3"
                    y1="12"
                    x2="21"
                    y2="12"
                    className={twMerge("transition", isOpen && "opacity-0")}
                  />
                  <line
                    x1="3"
                    y1="18"
                    x2="21"
                    y2="18"
                    className={twMerge(
                      "origin-left transition",
                      isOpen && "-rotate-45 translate-y-1"
                    )}
                  />
                </svg>
                <Button
                  variant="secondary"
                  className="hidden md:inline-flex items-center"
                  onClick={() => navigate('/login')}
                >
                  Log In
                </Button>
                <Button
                  variant="primary"
                  className="hidden md:inline-flex items-center"
                  onClick={() => navigate('/register')}
                >
                  Sign Up
                </Button>
              </div>
            </div>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col items-center gap-4 py-4">
                    {navLinks.map((link) => (
                      <Link to={link.href} key={link.label} className="text-white/70 hover:text-white" onClick={() => setIsOpen(false)}>
                        {link.label}
                      </Link>
                    ))}
                    <Button variant="secondary" onClick={() => { setIsOpen(false); navigate('/login'); }}>Log In</Button>
                    <Button variant="primary" onClick={() => { setIsOpen(false); navigate('/register'); }}>Sign Up</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>
      <div className="pb-[86px] md:pb-[98px] lg:pb-[130px]"></div>
    </>
  );
}
