import React from 'react';
import { MatchState, PointRecord } from '../types/tennis';
import { History, X, RotateCcw, Zap, AlertTriangle, Flame, ShieldAlert } from 'lucide-react';

interface PointHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: MatchState;
  onUndoToPoint?: () => void;
}

export const PointHistoryModal: React.FC<PointHistoryModalProps> = ({
  isOpen,
  onClose,
  match,
  onUndoToPoint,
}) => {
  if (!isOpen) return null;

  const { pointsHistory, team1, team2 } = match;
  const reversedHistory = [...pointsHistory].reverse();

  const getShotBadge = (point: PointRecord) => {
    switch (point.category) {
      case 'ace':
        return (
          <span className="flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded text-[10px] font-bold">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>เอซ (Ace)</span>
          </span>
        );
      case 'double_fault':
        return (
          <span className="flex items-center gap-1 bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded text-[10px] font-bold">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span>ดับเบิ้ลฟอลต์ (Double Fault)</span>
          </span>
        );
      case 'winner':
        return (
          <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded text-[10px] font-bold">
            <Flame className="w-3 h-3 text-emerald-400" />
            <span>วินเนอร์ ({point.stroke || 'Winner'})</span>
          </span>
        );
      case 'unforced_error':
        return (
          <span className="flex items-center gap-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded text-[10px] font-bold">
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            <span>ตีเสีย ({point.errorDetail || point.stroke || 'UE'})</span>
          </span>
        );
      default:
        return (
          <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-medium">
            แต้มปกติ
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3">
      <div className="w-full max-w-lg max-h-[85vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 text-slate-100 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <History className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">ประวัติแต้มย้อนหลัง (Point Log)</h3>
              <p className="text-[11px] text-slate-400">
                รวม {pointsHistory.length} แต้มในแมตช์นี้ (แสดงแต้มล่าสุดด้านบน)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Points */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[55vh]">
          {reversedHistory.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              ยังไม่มีการบันทึกแต้มในแมตช์นี้
            </div>
          ) : (
            reversedHistory.map((pt, idx) => {
              const pointNumber = pointsHistory.length - idx;
              const isT1Winner = pt.winnerTeam === 'team1';
              const winnerName = isT1Winner ? team1.name : team2.name;

              return (
                <div
                  key={pt.id}
                  className={`p-2 rounded-xl border flex items-center justify-between transition ${
                    isT1Winner
                      ? 'bg-emerald-950/20 border-emerald-900/50 hover:bg-emerald-950/30'
                      : 'bg-sky-950/20 border-sky-900/50 hover:bg-sky-950/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                      #{pointNumber}
                    </span>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-black ${
                            isT1Winner ? 'text-emerald-400' : 'text-sky-400'
                          }`}
                        >
                          {winnerName}
                        </span>
                        <span className="text-[10px] text-slate-400">ได้แต้ม</span>
                        {getShotBadge(pt)}
                      </div>

                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>
                          สกอร์ก่อนหน้า: {pt.scoreBefore.game.team1}-{pt.scoreBefore.game.team2}
                        </span>
                        <span>•</span>
                        <span>เสิร์ฟ: {pt.servingTeam === 'team1' ? team1.name : team2.name}</span>
                        {pt.rallyLength && (
                          <>
                            <span>•</span>
                            <span>แรลลี่ {pt.rallyLength} ครั้ง</span>
                          </>
                        )}
                        {pt.timestamp && (
                          <span className="text-slate-500 text-[9px]">
                            {new Date(pt.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {idx === 0 && onUndoToPoint && (
                    <button
                      onClick={() => {
                        onUndoToPoint();
                        onClose();
                      }}
                      className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-[11px] flex items-center gap-1 active:scale-95"
                      title="ย้อนกลับแต้มล่าสุดนี้"
                    >
                      <RotateCcw className="w-3 h-3 text-amber-400" />
                      <span>ถอยแต้มนี้</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">
            * แต้มทั้งหมดถูกบันทึกเรียงตามเวลาการแข่งขัน
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
