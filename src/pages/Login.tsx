import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Wifi, WifiOff } from 'lucide-react';
import logo from '@/assets/logo.jpg';
import { toast } from 'sonner';
import { isOnline } from '@/lib/offlineDb';

const Login = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(isOnline());
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error('Please enter your Access ID');
      return;
    }
    setLoading(true);
    const { error } = await login(code.trim());
    if (error) {
      toast.error(error);
    } else {
      toast.success('Login successful!');
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center px-3 sm:px-4 py-4 sm:py-8">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-8">
          <div className="text-center mb-6 sm:mb-10">
            <div className="mb-4 sm:mb-6 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full blur opacity-75"></div>
                <img src={logo} alt="MNR Group" className="relative w-16 sm:w-24 h-16 sm:h-24 rounded-full border-4 border-white dark:border-slate-800 object-cover shadow-lg" />
              </div>
            </div>
            <h1 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50 mb-1 sm:mb-2">IP Phone Directory</h1>
            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">MNR Group - Access Portal</p>
            <div className="flex items-center justify-center gap-2 mt-2 sm:mt-4 bg-slate-50 dark:bg-slate-900 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
              {online ? (
                <>
                  <Wifi className="w-3 sm:w-4 h-3 sm:h-4 text-green-500" />
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 sm:w-4 h-3 sm:h-4 text-red-500" />
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">Offline Mode</span>
                </>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <Label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 sm:mb-2 block">Access ID *</Label>
              <Input
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="Enter your Access ID"
                className="h-9 sm:h-12 rounded-lg text-center text-base sm:text-lg tracking-widest font-semibold bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600"
                autoFocus
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full h-9 sm:h-12 rounded-lg text-sm sm:text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
            >
              {loading ? (
                <span className="flex items-center gap-1 sm:gap-2">
                  <span className="animate-spin">⟳</span> <span className="hidden sm:inline">Logging in...</span>
                </span>
              ) : (
                <><KeyRound className="w-4 sm:w-5 h-4 sm:h-5 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Login</span></>
              )}
            </Button>
          </form>

          <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t-2 border-blue-400 dark:border-blue-600">
            <p className="text-xs text-slate-600 dark:text-slate-400 text-center mb-2 sm:mb-3">
              Don't have an access ID yet?
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 rounded-lg p-3 sm:p-4">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-50 mb-1 sm:mb-2">
                Contact your Web App Assistant:
              </p>
              <p className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400">
                Nabab Sharif
              </p>
              <a 
                href="tel:01838047391"
                className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-0.5 sm:gap-1"
              >
                📱 01838047391
              </a>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-600 dark:text-slate-400">
          <p>© 2026 MNR Group - All rights reserved</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
