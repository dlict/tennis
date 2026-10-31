import React from 'react';
import { MatchState } from '../types/tennis';
import { calculateMatchStats } from '../utils/tennisEngine';
import { Trophy, Award, ExternalLink, RefreshCw, BarChart2, Share2 } from 'lucide-react';

interface PostMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: MatchState;
  activeSheetUrl: string | null;
  onOpenAnalytics: () => void;
  onOpenInfographic: () => void;
  onNewMatch: () => void;
}

export const PostMatchModal: React.FC<PostMatchModalProps> = ({
  isOpen,
  onClose,
  match,
  activeSheetUrl,
  onOpenAnalytics,
  onOpenInfographic,
  onNewMatch,
}) => {
  if (!isOpen || !match.isFinished) return null;

  const winnerTeam = match.matchWinner || 'team1';
  const winnerName = match[winnerTeam].name;
  const runnerUpTeam = winnerTeam === 'team1' ? 'team2' : 'team1';
  const runnerUpName = match[runnerUpTeam].name;

  const stats = calculateMatchStats(match.pointsHistory, match.sets);
  const winnerStats = winnerTeam === 'team1' ? stats.team1 : stats.team2;
  const runnerUpStats = runnerUpTeam === 'team1' ? stats.team1 : stats.team2;

  // Set score summary
  const setResults = match.sets
    .filter((s) => s.winner)
    .map((s, idx) => ({
      setNum: idx + 1,
      wGames: winnerTeam === 'team1' ? s.team1Games : s.team2Games,
      rGames: winnerTeam === 'team1' ? s.team2Games : s.team1Games,
      tbPts:
        winnerTeam === 'team1'
          ? s.team2TiebreakPoints
          : s.team1TiebreakPoints,
    }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 overflow-y-auto">
      <div className="w-full max-w-xl bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl p-5 text-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Trophy & Winner Badge */}
        <div className="flex flex-col items-center text-center pt-2">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-lg shadow-amber-500/30 flex items-center justify-center mb-2">
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-yellow-400 animate-pulse" />
            </div>
          </div>

          <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-600/50">
            MATCH COMPLETED (จบการแข่งขัน)
          </span>

          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
            {winnerName} ชนะการแข่งขัน!
          </h2>

          <p className="text-xs text-slate-400 mt-0.5">
            พบกับ {runnerUpName} • {match.settings.format} • คอร์ต {match.settings.courtSurface}
          </p>
        </div>

        {/* Set Scores Board */}
        <div className="bg-slate-950/80 rounded-2xl p-3 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 mb-1.5 text-center">
            สรุปสกอร์เซต (Set Scores)
          </div>
          <div className="flex items-center justify-center gap-2">
            {setResults.map((res, i) => (
              <div
                key={i}
                className="flex flex-col items-center px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 min-w-[54px]"
              >
                <span className="text-[10px] text-slate-400 font-semibold">Set {res.setNum}</span>
                <span className="text-base font-black text-emerald-400">
                  {res.wGames} - {res.rGames}
                  {res.tbPts !== undefined && (
                    <sup className="text-[10px] text-amber-300 ml-0.5">({res.tbPts})</sup>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Post-Match Visual Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
            <div className="text-[10px] text-slate-400">แต้มรวมที่ได้</div>
            <div className="text-sm font-bold text-white mt-0.5">
              {winnerStats.totalPointsWon} <span className="text-xs text-slate-500 font-normal">vs</span> {runnerUpStats.totalPointsWon}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
            <div className="text-[10px] text-slate-400">เอซ (Aces)</div>
            <div className="text-sm font-bold text-amber-400 mt-0.5">
              {winnerStats.aces} <span className="text-xs text-slate-500 font-normal">vs</span> {runnerUpStats.aces}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
            <div className="text-[10px] text-slate-400">วินเนอร์ (Winners)</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">
              {winnerStats.winners} <span className="text-xs text-slate-500 font-normal">vs</span> {runnerUpStats.winners}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
            <div className="text-[10px] text-slate-400">อันฟอร์ซเออเร่อร์</div>
            <div className="text-sm font-bold text-rose-400 mt-0.5">
              {winnerStats.unforcedErrors} <span className="text-xs text-slate-500 font-normal">vs</span> {runnerUpStats.unforcedErrors}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          {activeSheetUrl && (
            <a
              href={activeSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition"
            >
              <ExternalLink className="w-4 h-4" />
              <span>เปิดดูรายงานสรุปผลและแต้มทั้งหมดใน Google Sheets</span>
            </a>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenInfographic();
              }}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-400/50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition"
            >
              <Award className="w-4 h-4 text-amber-300" />
              <span>สร้างภาพสรุปสถิติ (Infographic)</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenAnalytics();
              }}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <BarChart2 className="w-4 h-4 text-emerald-400" />
              <span>ดูกราฟและแผนผังช็อต</span>
            </button>
          </div>

          <button
            onClick={onNewMatch}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>เริ่มแมตช์ใหม่ (New Match)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
