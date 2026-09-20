import React, { useState } from 'react';
import { Download, Share2, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const PWAInstallButton: React.FC<{ variant?: 'header' | 'sidebar' | 'banner' }> = ({
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Suppress if already running in standalone/installed mode
  if (isInstalled) {
    return null;
  }

  const renderIOSGuideDialog = () => (
    <Dialog open={showIOSGuide} onOpenChange={setShowIOSGuide}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">Install on iPad or iPhone</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-3 text-xs text-foreground">
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-[10px] shrink-0">
              1
            </span>
            <p>
              Tap the <Share2 className="w-3.5 h-3.5 inline text-primary mx-0.5" /> <strong>Share</strong> button in your Safari navigation bar.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-[10px] shrink-0">
              2
            </span>
            <p>
              Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-[10px] shrink-0">
              3
            </span>
            <p>
              MonoPOS will launch in full-screen standalone mode directly from your home screen.
            </p>
          </div>
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={() => setShowIOSGuide(false)}
          className="w-full"
        >
          Got It
        </Button>
      </DialogContent>
    </Dialog>
  );

  if (isInstallable) {
    if (variant === 'sidebar') {
      return (
        <Button
          variant="secondary"
          size="sm"
          onClick={install}
          className="w-full justify-between h-9 px-3 text-xs font-semibold"
        >
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" />
            <span>Install App (PWA)</span>
          </div>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
            Desktop / Mobile
          </Badge>
        </Button>
      );
    }

    return (
      <Button
        variant="outline"
        size="sm"
        onClick={install}
        title="Install MonoPOS to Desktop / Home Screen"
        className="hidden sm:inline-flex items-center gap-1.5 h-8 text-xs font-semibold"
      >
        <Download className="w-3.5 h-3.5 text-primary" />
        <span>Install App</span>
      </Button>
    );
  }

  if (isIOS) {
    if (variant === 'sidebar') {
      return (
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowIOSGuide(true)}
            className="w-full justify-between h-9 px-3 text-xs font-semibold"
          >
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-primary" />
              <span>Install on iPad / iPhone</span>
            </div>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
              PWA
            </Badge>
          </Button>
          {renderIOSGuideDialog()}
        </>
      );
    }

    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowIOSGuide(true)}
          title="Install MonoPOS on iPad / iPhone"
          className="hidden sm:inline-flex items-center gap-1.5 h-8 text-xs font-semibold"
        >
          <Smartphone className="w-3.5 h-3.5 text-primary" />
          <span>Install</span>
        </Button>
        {renderIOSGuideDialog()}
      </>
    );
  }

  return null;
};
