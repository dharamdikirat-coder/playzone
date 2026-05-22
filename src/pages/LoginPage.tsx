import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ChevronRight,
  Gamepad2,
  BookOpen,
  PartyPopper,
  Gift,
  Smile,
  Instagram,
  Star
} from 'lucide-react';
import { usePlayZone } from '../hooks/usePlayZone';
import { cn } from '../lib/utils';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const { businessProfile, login } = usePlayZone();
  const [showPassword, setShowPassword] = useState(false);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(false);
    
    setTimeout(() => {
      const success = login(userId, password);
      if (success) {
        onLogin();
      } else {
        setIsLoading(false);
        setError(true);
      }
    }, 800);
  };

  const navItems = [
    { icon: <Gamepad2 size={24} />, label: 'PLAY' },
    { icon: <BookOpen size={24} />, label: 'LEARN' },
    { icon: <PartyPopper size={24} />, label: 'PARTY' },
    { icon: <Gift size={24} />, label: 'CELEBRATE' },
    { icon: <Smile size={24} />, label: 'ENJOY' },
    { icon: <Instagram size={24} />, label: 'MEMORIES' },
  ];

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 overflow-hidden font-sans bg-sky-400">
      {/* Dynamic Playground Background */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2093&auto=format&fit=crop" 
          alt="Playground Background" 
          className="w-full h-full object-cover opacity-60 mix-blend-overlay"
          referrerPolicy="no-referrer"
        />
        {/* Animated Bunting Flags */}
        <div className="absolute top-0 left-0 w-full flex justify-around p-2">
            {[...Array(12)].map((_, i) => (
                <motion.div 
                    key={i}
                    animate={{ rotate: [i % 2 === 0 ? -5 : 5, i % 2 === 0 ? 5 : -5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className={cn(
                        "w-8 h-10 clip-triangle shadow-sm",
                        ["bg-red-500", "bg-yellow-500", "bg-green-500", "bg-blue-500"][i % 4]
                    )}
                    style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
                />
            ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-sky-400/20 to-sky-400/40" />
      </div>

      {/* Side Billboard - Left (Play Learn Grow) */}
      <motion.div 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="absolute left-10 top-1/2 -translate-y-1/2 hidden xl:flex flex-col items-center z-10"
      >
        <div className="bg-white p-6 rounded-3xl border-8 border-amber-400 shadow-2xl rotate-[-5deg]">
          <h3 className="text-2xl font-black text-sky-500 mb-1">PLAY</h3>
          <h3 className="text-2xl font-black text-[#4CAF50] mb-1 uppercase">LEARN</h3>
          <h3 className="text-2xl font-black text-red-500 uppercase">GROW</h3>
        </div>
        <div className="w-4 h-20 bg-amber-800 rounded-full -mt-2 shadow-lg" />
      </motion.div>

      {/* Side Billboard - Right (Birthday Party) */}
      <motion.div 
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="absolute right-10 top-1/2 -translate-y-1/2 hidden xl:flex flex-col items-center z-10"
      >
        <div className="bg-white p-6 rounded-3xl border-8 border-red-500 shadow-2xl rotate-[5deg] text-center max-w-[200px]">
          <h3 className="text-2xl font-black text-red-500 leading-none">BIRTHDAY</h3>
          <h3 className="text-3xl font-black text-[#5E42A6] italic">PARTY</h3>
          <p className="text-[10px] font-bold text-red-400 mt-2">CELEBRATE • ENJOY • MEMORIES</p>
        </div>
        <div className="w-4 h-20 bg-[#5E42A6] rounded-full -mt-2 shadow-lg" />
      </motion.div>

      {/* Main Login Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-xl bg-white rounded-[3.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] p-8 md:p-12 flex flex-col items-center border-[12px] border-white/80"
      >
        {/* Boy & Girl Characters Placeholder Row */}
        <div className="flex items-center gap-6 mb-2">
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-20 h-20 bg-emerald-100 rounded-[2rem] flex items-center justify-center overflow-hidden border-4 border-emerald-50 shadow-lg"
          >
             <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4" alt="Boy" />
          </motion.div>
          
          <div className="text-center relative">
            <h1 className="text-6xl font-black tracking-tight flex items-center justify-center">
              <span className="text-[#FF4D4D]">K</span>
              <span className="text-[#FFA500] relative">
                i
                <Star className="absolute -top-4 -right-1 text-emerald-500 fill-emerald-500" size={24} />
              </span>
              <span className="text-[#4CAF50]">d</span>
              <span className="text-[#2196F3]">s</span>
            </h1>
            <p className="text-[12px] font-black tracking-[0.3em] text-[#5E42A6] uppercase mt-[-4px]">MANAGEMENT</p>
          </div>

          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            className="w-20 h-20 bg-pink-100 rounded-[2rem] flex items-center justify-center overflow-hidden border-4 border-pink-50 shadow-lg"
          >
             <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Anya&backgroundColor=ffdfbf" alt="Girl" />
          </motion.div>
        </div>

        <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-emerald-500 to-amber-500 italic tracking-tighter mb-4 uppercase drop-shadow-sm">
          FUN ZONE
        </h2>

        {/* Ribbon */}
        <div className="relative mb-6">
            <div className="bg-[#5E42A6] text-white font-black text-sm uppercase tracking-widest italic py-3 px-12 rounded-lg relative z-10 shadow-lg">
                Zone Management System
                {/* Ribbon corners */}
                <div className="absolute top-1/2 -left-4 w-6 h-6 bg-[#4A328C] -translate-y-1/2 -rotate-45 -z-10" />
                <div className="absolute top-1/2 -right-4 w-6 h-6 bg-[#4A328C] -translate-y-1/2 rotate-45 -z-10" />
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-[110%] h-1 bg-[#5E42A6]/20 blur-sm rounded-full" />
        </div>

        <div className="flex items-center gap-4 mb-8 w-full">
            <div className="h-px flex-1 bg-slate-200" />
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest text-center whitespace-nowrap">
                by <span className="text-[#5E42A6]">Digital Communique Private Limited</span>
            </p>
            <div className="h-px flex-1 bg-slate-200" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4 max-w-[360px]">
          <div className="relative flex items-stretch">
            <div className="bg-[#5E42A6] text-white w-14 flex items-center justify-center rounded-l-2xl shadow-lg">
              <User size={24} />
            </div>
            <input 
              type="text" 
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="User ID"
              className="flex-1 py-4 px-6 bg-white border-2 border-slate-100 border-l-0 rounded-r-2xl outline-none focus:border-[#5E42A6]/30 transition-all font-bold text-slate-700 shadow-sm"
            />
          </div>

          <div className="relative flex items-stretch">
            <div className="bg-[#5E42A6] text-white w-14 flex items-center justify-center rounded-l-2xl shadow-lg">
              <Lock size={24} />
            </div>
            <div className="flex-1 relative">
                <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full py-4 px-6 bg-white border-2 border-slate-100 border-l-0 rounded-r-2xl outline-none focus:border-[#5E42A6]/30 transition-all font-bold text-slate-700 shadow-sm"
                />
                <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#5E42A6] transition-colors"
                >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
            </div>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-[11px] font-black uppercase text-center w-full"
            >
              Invalid ID or Password
            </motion.p>
          )}

          <div className="flex items-center justify-between px-2 pt-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-5 h-5 rounded-md border-2 border-[#5E42A6]/20 checked:bg-[#5E42A6] accent-[#5E42A6] cursor-pointer"
              />
              <span className="text-[11px] font-black text-slate-500 group-hover:text-[#5E42A6] transition-colors uppercase tracking-tight">Remember Me</span>
            </label>
            <button type="button" className="text-[11px] font-black text-[#5E42A6] hover:underline uppercase tracking-tight">
              Forgot Password?
            </button>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-5 bg-[#5E42A6] text-white font-black text-2xl rounded-2xl shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-[0.1em] mt-4 disabled:opacity-50"
          >
            {isLoading ? "..." : "Login"}
            {!isLoading && <ChevronRight size={28} className="translate-y-[1px]" />}
          </button>
        </form>

        <footer className="mt-10 text-center opacity-70">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">
            © 2024 Digital Communique Private Limited.<br />
            All rights reserved.
          </p>
        </footer>
      </motion.div>

      {/* Bottom Circular Navigation Icons */}
      <div className="relative z-10 mt-10 w-full max-w-4xl flex justify-center gap-2 md:gap-4 flex-wrap">
        {navItems.map((item, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * idx }}
            className="flex flex-col items-center gap-1 group cursor-pointer"
          >
            <div className="w-16 h-16 md:w-20 md:h-20 bg-[#5E42A6] rounded-full flex items-center justify-center text-white border-4 border-white/20 group-hover:scale-110 group-hover:bg-[#4A328C] transition-all shadow-xl">
              {item.icon}
            </div>
            <span className="text-[10px] font-black text-white uppercase tracking-widest drop-shadow-md">
              {item.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
