import React, { useEffect, useState, useMemo } from 'react';
import { MatchState } from '../types/tennis';
import { offlineSync } from '../services/offlineSync';
import {
  History,
  X,
  Trophy,
  BarChart2,
  Image as ImageIcon,
  Play,
  Trash2,
  Search,
  Calendar,
  Users,
  User as UserIcon,
} from 'lucide-react';

interface MatchHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMatchId: string;
  onSelectAnalytics: (match: MatchState) => void;
  onSelectInfographic: (match: MatchState) => void;
  onLoadMatch: (match: MatchState) => void;
}

export const MatchHistoryModal: React.FC<MatchHistoryModalProps> = ({
  isOpen,
  onClose,
  currentMatchId,
  onSelectAnalytics,
  onSelectInfographic,
  onLoadMatch,
}) => {
  const [matches, setMatches] = useState<MatchState[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'finished' | 'ongoing'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setMatches(offlineSync.getMatchHistory());
  }, [isOpen]);

  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (filterStatus === 'finished' && !m.isFinished) return false;
      if (filterStatus === 'ongoing' && m.isFinished) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const t1Names = [m.team1.name, ...m.team1.players.map((p) => p.name)]
          .join(' ')
          .toLowerCase();
        const t2Names = [m.team2.name, ...m.team2.players.map((p) => p.name)]
          .join(' ')
          .toLowerCase();
        return t1Names.includes(q) || t2Names.includes(q);
      }
      return true;
    });
  }, [matches, filterStatus, searchQuery]);

  if (!isOpen) return null;

  const handleDelete = (matchId: string) => {
    offlineSync.deleteMatchFromHistory(matchId);
    setMatches((prev) => prev.filter((m) => m.id !== matchId));
  };

  const formatSetScores = (m: MatchState) => {
    return (m.sets || [])
      .filter((s) => s.winner || s.team1Games > 0 || s.team2Games > 0)
      .map((s) => {
        let str = `${s.team1Games}-${s.team2Games}`;
        if (s.team1TiebreakPoints !== undefined && s.team2TiebreakPoints !== undefined) {
          str += `(${Math.min(s.team1TiebreakPoints, s.team2TiebreakPoints)})`;
        }
        return str;
      })
      .join('  ');
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3"
    >
      <div className="w-full max-w-2xl h-[90vh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <History className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                ประวัติการแข่งขันทั้งหมด ({matches.length})
              </h2>
              <p className="text-[11px] text-slate-400">
                ดูผลย้อนหลัง กราฟสถิติ ภาพสรุป หรือเปิดแมตช์กลับมาเล่นต่อ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="px-3 py-2.5 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center gap-2 shrink-0">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อผู้เล่นหรือทีม..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1">
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'finished', label: 'แข่งจบแล้ว' },
              { id: 'ongoing', label: 'ยังไม่จบ' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                  filterStatus === tab.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Match List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filteredMatches.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <History className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-300">
                ยังไม่มีประวัติการแข่งขัน
              </p>
              <p className="text-xs text-slate-500">
                เมื่อเริ่มนับแต้มหรือแข่งจบ ระบบจะบันทึกประวัติแมตช์ไว้ให้อัตโนมัติ
              </p>
            </div>
          ) : (
            filteredMatches.map((m) => {
              const isCurrent = m.id === currentMatchId;
              const isDoubles = m.settings?.type === 'doubles';
              const t1Label = isDoubles
                ? m.team1.players.map((p) => p.name).join(' / ')
                : m.team1.name;
              const t2Label = isDoubles
                ? m.team2.players.map((p) => p.name).join(' / ')
                : m.team2.name;
              const setScoreStr = formatSetScores(m) || '0-0';

              return (
                <div
                  key={m.id}
                  className={`p-3 rounded-2xl border transition ${
                    isCurrent
                      ? 'bg-emerald-950/30 border-emerald-600/60'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Metadata Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80 text-[11px]">
                    <div className="flex items-center gap-2 text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(m.updatedAt || m.createdAt).toLocaleString('th-TH', {
                          day: '2-digit',
                          month: 'short',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold flex items-center gap-1">
                        {isDoubles ? (
                          <Users className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <UserIcon className="w-3 h-3 text-sky-400" />
                        )}
                        {isDoubles ? 'คู่ (Doubles)' : 'เดี่ยว (Singles)'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                        {m.settings?.courtSurface || 'hard'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                          แมตช์ปัจจุบัน
                        </span>
                      )}
                      {m.isFinished ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                          <Trophy className="w-3 h-3" />
                          จบแล้ว
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 text-[10px] font-bold">
                          กำลังแข่ง ({m.pointsHistory?.length || 0} แต้ม)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Teams & Score Row */}
                  <div className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs sm:text-sm font-bold break-words ${
                            m.matchWinner === 'team1' ? 'text-emerald-400' : 'text-slate-100'
                          }`}
                        >
                          {t1Label}
                        </span>
                        {m.matchWinner === 'team1' && (
                          <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs sm:text-sm font-bold break-words ${
                            m.matchWinner === 'team2' ? 'text-sky-400' : 'text-slate-200'
                          }`}
                        >
                          {t2Label}
                        </span>
                        {m.matchWinner === 'team2' && (
                          <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono text-base sm:text-lg font-black text-amber-300 tracking-wide">
                        {setScoreStr}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        รวม {m.pointsHistory?.length || 0} แต้ม
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="pt-2 border-t border-slate-800/70 flex flex-wrap items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSelectAnalytics(m)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-300 text-[11px] font-bold flex items-center gap-1 transition"
                    >
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span>ดูกราฟ / เซฟภาพ</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectInfographic(m)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-700/60 text-emerald-300 text-[11px] font-bold flex items-center gap-1 transition"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>ภาพสรุป</span>
                    </button>

                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => {
                          onLoadMatch(m);
                          onClose();
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 transition"
                      >
                        <Play className="w-3 h-3 fill-white" />
                        <span>{m.isFinished ? 'เปิดดูแมตช์' : 'แข่งต่อ'}</span>
                      </button>
                    )}

                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id)}
                        className="p-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/70 border border-rose-800/60 text-rose-300 transition"
                        title="ลบประวัติแมตช์นี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
