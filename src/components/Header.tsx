import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, LogOut, Settings, Download, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import logo from '@/assets/logo.jpg';

const Header = () => {
  const { isLoggedIn, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const { isInstallable, isInstalled, isInstalling, isIOS, showIOSGuide, setShowIOSGuide, handleInstall } = useInstallPrompt();

  return (
    <header className="header-gradient shadow-lg sticky top-0 z-50 w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 min-w-0">
          <img src={logo} alt="MNR Group" className="w-10 h-10 rounded-full bg-primary-foreground object-cover flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold text-primary-foreground tracking-tight truncate">IP Phone Directory</h1>
            <p className="text-xs text-primary-foreground/70 hidden sm:block">MNR Group</p>
          </div>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {isInstallable && !isInstalled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleInstall}
              disabled={isInstalling}
              className="text-primary-foreground hover:bg-primary-foreground/10"
              title="Install this app for offline access"
            >
              <Download className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">{isInstalling ? 'Installing...' : 'Install'}</span>
            </Button>
          )}
          {isIOS && !isInstalled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowIOSGuide(true)}
              className="text-primary-foreground hover:bg-primary-foreground/10"
              title="How to install on iOS"
            >
              <HelpCircle className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Install</span>
            </Button>
          )}
          <ThemeSwitcher isHeader={true} />
          {isLoggedIn && isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin')}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Settings className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Admin</span>
            </Button>
          )}
          {isLoggedIn ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { logout(); navigate('/login'); }}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/login')}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogIn className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Login</span>
            </Button>
          )}
        </div>
      </div>

      {/* iOS Install Guide Dialog */}
      <Dialog open={showIOSGuide} onOpenChange={setShowIOSGuide}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Install App on iOS</DialogTitle>
            <DialogDescription>
              Follow these steps to install this app on your iPhone or iPad
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              <p className="font-semibold">Step 1: Open Share Menu</p>
              <p className="text-slate-600 dark:text-slate-400">Tap the share icon (rectangle with arrow) at the bottom of the page</p>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-semibold">Step 2: Add to Home Screen</p>
              <p className="text-slate-600 dark:text-slate-400">Scroll down and select "Add to Home Screen"</p>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-semibold">Step 3: Confirm</p>
              <p className="text-slate-600 dark:text-slate-400">Name the app and tap "Add" in the top-right corner</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-900 dark:text-blue-100">
                ✓ The app will be added to your home screen and works offline once installed!
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default Header;
