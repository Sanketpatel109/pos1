import React, { useState } from 'react';
import { Download, Share2, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ variant?: 'header' | 'sidebar' | 'banner' }> = ({
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Suppress if already running in standalone/installed mode
  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    if (variant === 'sidebar') {
      return (
        <button
          onClick={install}
          className="w-full flex items-center justify-between p-2.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-98"
        >
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Install App (PWA)</span>
          </div>
          <span className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded ">
            Desktop / Mobile
          </span>
        </button>
      );
    }

    return (
      <button
        onClick={install}
        title="Install MonoPOS to Desktop / Home Screen"
        className="hidden sm:flex items-center gap-1.5 bg-zinc-900 hover:bg-black text-white rounded-xl px-2.5 py-1 text-xs font-semibold shadow-xs transition-colors cursor-pointer active:scale-95"
      >
        <Download className="w-3.5 h-3.5 text-emerald-400" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    if (variant === 'sidebar') {
      return (
        <>
          <button
            onClick={() => setShowIOSGuide(true)}
            className="w-full flex items-center justify-between p-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-zinc-700" />
              <span>Install on iPad / iPhone</span>
            </div>
            <span className="text-[10px] text-zinc-500 ">PWA</span>
          </button>

          {showIOSGuide && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
              <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-zinc-200">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                  <h3 className="text-sm font-bold text-zinc-900">Install on iPad or iPhone</h3>
                  <button
                    onClick={() => setShowIOSGuide(false)}
                    className="p-1 text-zinc-400 hover:text-zinc-600 rounded-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="py-4 space-y-3 text-xs text-zinc-700">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                      1
                    </span>
                    <p>
                      Tap the <Share2 className="w-3.5 h-3.5 inline text-blue-600 mx-0.5" /> <strong>Share</strong> button in your Safari navigation bar.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                      2
                    </span>
                    <p>
                      Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                      3
                    </span>
                    <p>
                      MonoPOS will launch in full-screen offline mode directly from your home screen.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="w-full py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors"
                >
                  Got It
                </button>
              </div>
            </div>
          )}
        </>
      );
    }

    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          title="Install MonoPOS on iPad / iPhone"
          className="hidden sm:flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 rounded-xl px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer active:scale-95"
        >
          <Smartphone className="w-3.5 h-3.5 text-zinc-600" />
          <span>Install</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-zinc-200">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <h3 className="text-sm font-bold text-zinc-900">Install on iPad or iPhone</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-zinc-400 hover:text-zinc-600 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="py-4 space-y-3 text-xs text-zinc-700">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                    1
                  </span>
                  <p>
                    Tap the <Share2 className="w-3.5 h-3.5 inline text-blue-600 mx-0.5" /> <strong>Share</strong> button in your Safari navigation bar.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                    2
                  </span>
                  <p>
                    Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                    3
                  </span>
                  <p>
                    MonoPOS will launch in full-screen standalone mode directly from your home screen.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
