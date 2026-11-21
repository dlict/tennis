import React, { useState } from 'react';
import { Download, Smartphone, X, ExternalLink, Copy, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  fullWidth?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ fullWidth = false }) => {
  const { isInstallable, isInstalled, isIOS, isInIframe, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);

  // If already running in standalone / installed mode
  if (isInstalled) {
    if (!fullWidth) return null;
    return (
      <div className="w-full py-2.5 px-3 rounded-xl bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
        <Check className="w-4 h-4 text-emerald-400" />
        <span>ติดตั้งแอป TennisPro บนอุปกรณ์นี้แล้ว</span>
      </div>
    );
  }

  const handleClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (!ok) {
        setShowGuide(true);
      }
    } else {
      setShowGuide(true);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const isAndroid =
    typeof navigator !== 'undefined' &&
    /android/i.test(navigator.userAgent || '');

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`flex items-center justify-center gap-1.5 rounded-xl text-white font-bold transition shadow-sm shrink-0 active:scale-95 ${
          fullWidth
            ? 'w-full py-2.5 px-3 text-xs'
            : 'px-2 py-1 rounded-lg text-[11px]'
        } ${
          isInstallable
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 ring-1 ring-emerald-300'
            : 'bg-emerald-600 hover:bg-emerald-500'
        }`}
        title="ติดตั้งแอปลงในมือถือ (Samsung Galaxy / Android / iOS)"
      >
        <Download className="w-3.5 h-3.5 text-white shrink-0" />
        <span>
          {fullWidth
            ? isInstallable
              ? 'ติดตั้งแอป TennisPro ลงมือถือทันที'
              : 'ติดตั้งแอป TennisPro ลงมือถือ (PWA)'
            : isInstallable
            ? 'ติดตั้งแอปทันที'
            : 'ติดตั้งแอป'}
        </span>
      </button>

      {/* Installation Guide Modal for S24 Ultra, Samsung Internet, Android & iOS */}
      {showGuide && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGuide(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 overflow-y-auto animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md max-h-[92vh] rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl text-slate-100 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3.5 bg-slate-900 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    ติดตั้ง TennisPro ลงบน {isAndroid ? 'Samsung Galaxy / Android' : isIOS ? 'iPhone / iPad' : 'มือถือ / แท็บเล็ต'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    ติดตั้งเป็นแอปเต็มหน้าจอ (PWA) ใช้งานออฟไลน์ได้ทันที
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs text-slate-300">
              {/* If inside iframe, explain & offer direct open-in-tab button */}
              {isInIframe && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-100 space-y-2">
                  <div className="font-bold text-xs text-rose-300">
                    ⚠️ กำลังเปิดอยู่ในหน้าต่างตัวอย่าง (Preview Frame)
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    ระบบมือถือไม่อนุญาตให้ติดตั้งแอปจากภายในกรอบตัวอย่าง กรุณากดเปิดลิงก์แบบเต็มหน้าต่างด้านล่างใน Chrome หรือ Samsung Internet ก่อนกดติดตั้งครับ:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <a
                      href={currentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-[140px] py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>เปิดหน้าเต็มเพื่อติดตั้ง</span>
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyUrl}
                      className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold text-[11px] flex items-center gap-1.5 transition"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300">คัดลอกแล้ว</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>คัดลอกลิงก์</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Direct install trigger if prompt became available */}
              {isInstallable && (
                <button
                  type="button"
                  onClick={install}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg transition"
                >
                  <Download className="w-4 h-4" />
                  <span>กดติดตั้งแอป TennisPro ลงเครื่องทันที</span>
                </button>
              )}

              {/* Note about Chrome/Samsung */}
              <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-[11px] leading-relaxed">
                💡 <strong>แนะนำสำหรับ Samsung Galaxy / Android:</strong> เปิดด้วย <strong>Google Chrome</strong> หรือ <strong>Samsung Internet</strong> (หลีกเลี่ยงการเปิดผ่านหน้าต่างของแอป LINE/Facebook)
              </div>

              {/* Chrome on Android steps */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-sky-400">
                  <span>🌐 วิธีที่ 1: ผ่าน Google Chrome บน Android</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      1
                    </span>
                    <p>แตะเมนู <strong>⋮ (จุด 3 จุดมุมบนขวา)</strong></p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      2
                    </span>
                    <p>เลือก <strong>"เพิ่มลงในหน้าจอหลัก" (Add to Home screen)</strong> แล้วเลือก <strong>"ติดตั้ง" (Install)</strong></p>
                  </div>
                </div>
              </div>

              {/* Samsung Internet steps */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-400">
                  <span>📱 วิธีที่ 2: ผ่าน Samsung Internet (S24 Ultra)</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      1
                    </span>
                    <p>
                      แตะไอคอน <strong>ลูกศรดาวน์โหลด (⬇️)</strong> ที่ช่อง URL ด้านบน หรือแตะเมนู <strong>☰ (3 ขีดมุมล่างขวา)</strong>
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      2
                    </span>
                    <p>
                      เลือก <strong>"เพิ่มหน้าไปยัง" (Add page to)</strong> → <strong>"หน้าจอหลัก" (Home screen)</strong> → กด <strong>เพิ่ม</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* iOS Guide */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                <div className="font-bold text-xs text-blue-400">
                  🍏 สำหรับ iPhone / iPad (Safari)
                </div>
                <p className="text-[11px]">
                  เปิดใน <strong>Safari</strong> → แตะปุ่มแชร์ <strong>⎋ (Share)</strong> → เลื่อนลงแล้วแตะ <strong>"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</strong>
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
              {!isInIframe && (
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">คัดลอกลิงก์แล้ว</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>คัดลอกลิงก์</span>
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => setShowGuide(false)}
                className="ml-auto px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white transition active:scale-98"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
