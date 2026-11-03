import React, { useState } from 'react';
import { Download, Smartphone, X, ExternalLink, CheckCircle } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // If already running in standalone / installed mode, hide the button
  if (isInstalled) {
    return null;
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

  const isAndroid =
    typeof navigator !== 'undefined' &&
    /android/i.test(navigator.userAgent || '');

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-[11px] font-bold transition shadow-sm"
        title="ติดตั้งแอปลงในมือถือ (Samsung Galaxy / Android / iOS)"
      >
        <Download className="w-3.5 h-3.5 text-white shrink-0" />
        <span>ติดตั้งแอป</span>
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
                    ติดตั้ง TennisPro ลงบน {isAndroid ? 'Samsung Galaxy / Android' : isIOS ? 'iPhone / iPad' : 'อุปกรณ์'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    ติดตั้งเป็น Web App ทันสมัย ปลอดภัย 100% ไม่ต้องลงไฟล์ APK
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
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs text-slate-300">
              {/* Note about Play Protect */}
              <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-[11px] leading-relaxed">
                💡 <strong>สำหรับ Samsung Galaxy S24 Ultra:</strong> การติดตั้งผ่านเมนูของเบราว์เซอร์จะเป็นเวอร์ชัน PWA ล่าสุด 100% ไม่ใช่ไฟล์ APK เก่า จะไม่มีคำเตือนจาก Google Play Protect มากวนใจ
              </div>

              {/* Samsung Internet steps (Primary for S24 Ultra) */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-white text-xs text-emerald-400">
                  <span>📱 วิธีที่ 1: ผ่าน Samsung Internet (เบราว์เซอร์หลักของ Galaxy)</span>
                </div>
                <div className="space-y-2 text-[11px] text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      1
                    </span>
                    <p>
                      มองหาไอคอน <strong>ลูกศรดาวน์โหลด (⬇️)</strong> ตรงช่องแถบที่อยู่ด้านบน หรือแตะเมนู <strong>☰ (3 ขีดที่มุมล่างขวา)</strong>
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      2
                    </span>
                    <p>
                      เลือก <strong>"เพิ่มหน้าไปยัง" (Add page to)</strong> จากนั้นเลือก <strong>"หน้าจอหลัก" (Home screen)</strong> หรือ <strong>"ติดตั้งแอป" (Install app)</strong>
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      3
                    </span>
                    <p>
                      กด <strong>"เพิ่ม" (Add)</strong> ตัวแอปจะไปอยู่ที่หน้าจอโฮมของคุณ เปิดใช้งานแบบแนวนอนเต็มจอได้ทันที
                    </p>
                  </div>
                </div>
              </div>

              {/* Chrome on Android steps */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-white text-xs text-sky-400">
                  <span>🌐 วิธีที่ 2: ผ่าน Google Chrome บน Android</span>
                </div>
                <div className="space-y-2 text-[11px] text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      1
                    </span>
                    <p>แตะที่เมนู <strong>⋮ (จุด 3 จุดมุมบนขวา)</strong></p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      2
                    </span>
                    <p>เลือก <strong>"ติดตั้งแอป" (Install app)</strong> หรือ <strong>"เพิ่มลงในหน้าจอหลัก"</strong></p>
                  </div>
                </div>
              </div>

              {/* iOS Guide if on iOS */}
              {isIOS && (
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="font-bold text-white text-xs text-blue-400">
                    🍏 สำหรับ iPhone / iPad (Safari)
                  </div>
                  <p className="text-[11px]">
                    แตะปุ่มแชร์ <strong>⎋ (Share)</strong> ด้านล่าง แล้วเลือก <strong>"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-end shrink-0">
              <button
                onClick={() => setShowGuide(false)}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white transition active:scale-98"
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
