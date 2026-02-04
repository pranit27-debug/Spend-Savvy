"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  UserPlus,
  LogIn,
} from "lucide-react";
import Image from "next/image";

export default function AuthPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [signInData, setSignInData] = useState({
    email: "",
    password: "",
  });

  const [signUpData, setSignUpData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleSignInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignInData({
      ...signInData,
      [e.target.name]: e.target.value,
    });
    if (error) setError("");
  };

  const handleSignUpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignUpData({
      ...signUpData,
      [e.target.name]: e.target.value,
    });
    if (error) setError("");
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(signInData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        router.push("/dashboard");
      } else {
        setError(data.error || "Sign in failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(signUpData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        router.push("/dashboard");
      } else {
        setError(data.error || "Sign up failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 50 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-white flex items-center justify-center p-8 font-inter relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-72 h-72 bg-green-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-40 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Modal Container - Centered Rectangle */}
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        className="relative bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-5xl h-[600px] grid grid-cols-1 lg:grid-cols-2 border border-gray-200">
        {/* Image Panel */}
        <motion.div
          animate={{
            x: isSignUp ? 0 : 0,
            opacity: 1,
          }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="relative overflow-hidden bg-gray-100">
          <AnimatePresence mode="wait">
            <motion.div
              key={isSignUp ? "signup" : "signin"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0">
              {/* Base Image (hidden initially) */}
              <Image
                src={isSignUp ? "/signup.png" : "/signin.png"}
                alt={isSignUp ? "Sign Up" : "Sign In"}
                fill
                className="object-cover opacity-0"
                priority
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0"></div>

              {/* Image Squares that reveal the actual image */}
              <div className="absolute inset-0 grid grid-cols-6 grid-rows-4">
                {Array.from({ length: 24 }, (_, i) => {
                  const row = Math.floor(i / 6);
                  const col = i % 6;
                  const delay = (row * 6 + col) * 0.08; // 2 second total duration

                  return (
                    <motion.div
                      key={`image-square-${
                        isSignUp ? "signup" : "signin"
                      }-${i}`}
                      initial={{
                        opacity: 0,
                        scale: 0.8,
                        clipPath: "inset(100% 100% 100% 100%)",
                      }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        clipPath: "inset(0% 0% 0% 0%)",
                      }}
                      transition={{
                        duration: 0.6,
                        delay: delay,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      }}
                      className="relative overflow-hidden border border-white/20"
                      style={{
                        backgroundImage: `url(${
                          isSignUp ? "/signup.png" : "/signin.png"
                        })`,
                        backgroundSize: "600% 400%",
                        backgroundPosition: `${col * 20}% ${row * 33.33}%`,
                        backgroundRepeat: "no-repeat",
                      }}>
                      {/* Loading overlay that disappears */}
                      <motion.div
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 0 }}
                        transition={{
                          duration: 0.3,
                          delay: delay + 0.2,
                        }}
                        className={`absolute inset-0 ${
                          isSignUp ? "bg-green-500" : "bg-blue-500"
                        } flex items-center justify-center`}>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        />
                      </motion.div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Form Panel */}
        <div className="p-8 lg:p-10 flex flex-col justify-center relative bg-white">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center justify-center mb-8">
            <div className="w-10 h-10 mr-3">
              <Image
                src="/logo.png"
                alt="SpendSavvy Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">
              SpendSavvy
            </span>
          </motion.div>

          {/* Toggle Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex bg-gray-100 rounded-xl p-1 mb-8">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center ${
                !isSignUp
                  ? "bg-white shadow-md text-green-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}>
              <LogIn size={18} className="mr-2" />
              Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center ${
                isSignUp
                  ? "bg-white shadow-md text-green-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}>
              <UserPlus size={18} className="mr-2" />
              Sign Up
            </button>
          </motion.div>

          {/* Form Container */}
          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait" custom={isSignUp ? 1 : -1}>
              {!isSignUp ? (
                /* Sign In Form */
                <motion.div
                  key="signin"
                  custom={-1}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                  }}
                  className="space-y-6">
                  <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      Welcome Back
                    </h1>
                    <p className="text-gray-600">Sign in to your account</p>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-700 text-sm">{error}</p>
                    </motion.div>
                  )}

                  <form onSubmit={handleSignInSubmit} className="space-y-4">
                    <div>
                      <input
                        type="email"
                        name="email"
                        placeholder="Enter your email"
                        value={signInData.email}
                        onChange={handleSignInChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        required
                        disabled={isLoading}
                      />
                    </div>

                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="Enter your password"
                        value={signInData.password}
                        onChange={handleSignInChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </button>
                    </div>

                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      whileHover={{ scale: isLoading ? 1 : 1.02 }}
                      whileTap={{ scale: isLoading ? 1 : 0.98 }}
                      className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-all duration-300 disabled:opacity-50 flex items-center justify-center">
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Signing In...
                        </>
                      ) : (
                        <>
                          Sign In
                          <ArrowRight size={18} className="ml-2" />
                        </>
                      )}
                    </motion.button>
                  </form>
                </motion.div>
              ) : (
                /* Sign Up Form */
                <motion.div
                  key="signup"
                  custom={1}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                  }}
                  className="space-y-6">
                  <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      Create Account
                    </h1>
                    <p className="text-gray-600">
                      Join us and start your journey
                    </p>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-700 text-sm">{error}</p>
                    </motion.div>
                  )}

                  <form onSubmit={handleSignUpSubmit} className="space-y-4">
                    <div>
                      <input
                        type="text"
                        name="name"
                        placeholder="Enter your full name"
                        value={signUpData.name}
                        onChange={handleSignUpChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        required
                        disabled={isLoading}
                      />
                    </div>

                    <div>
                      <input
                        type="email"
                        name="email"
                        placeholder="Enter your email"
                        value={signUpData.email}
                        onChange={handleSignUpChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        required
                        disabled={isLoading}
                      />
                    </div>

                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="Create a password"
                        value={signUpData.password}
                        onChange={handleSignUpChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </button>
                    </div>

                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      whileHover={{ scale: isLoading ? 1 : 1.02 }}
                      whileTap={{ scale: isLoading ? 1 : 0.98 }}
                      className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-all duration-300 disabled:opacity-50 flex items-center justify-center">
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Creating Account...
                        </>
                      ) : (
                        <>
                          Create Account
                          <ArrowRight size={18} className="ml-2" />
                        </>
                      )}
                    </motion.button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
