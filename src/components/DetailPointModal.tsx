import React, { useState, useEffect } from 'react';
import { MatchState, ShotCategory, StrokeType, ErrorDetail, Player } from '../types/tennis';
import { Flame, AlertOctagon, X, Check, Award, Users } from 'lucide-react';

interface DetailPointModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'winner' | 'error';
  initialTeam: 'team1' | 'team2';
  match: MatchState;
  onConfirm: (
    winner: 'team1' | 'team2',
    category: ShotCategory,
    details: {
      stroke?: StrokeType;
      winnerPlayerName?: string;
      errorTeam?: 'team1' | 'team2';
      errorPlayerName?: string;
      errorStroke?: StrokeType;
      errorDetail?: ErrorDetail;
    }
  ) => void;
}

export const DetailPointModal: React.FC<DetailPointModalProps> = ({
  isOpen,
  onClose,
  mode,
  initialTeam,
  match,
  onConfirm,
}) => {
  // Selected player / team
  const [targetTeam, setTargetTeam] = useState<'team1' | 'team2'>(initialTeam);
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>('');
  const [selectedStroke, setSelectedStroke] = useState<StrokeType>('forehand');
  const [selectedErrorStroke, setSelectedErrorStroke] = useState<StrokeType>('forehand');
  const [selectedErrorDetail, setSelectedErrorDetail] = useState<ErrorDetail>('net');

  const isDoubles = match.settings.type === 'doubles';

  // Helper to extract players list for a team
  const getTeamPlayers = (teamKey: 'team1' | 'team2'): Player[] => {
    const team = match[teamKey];
    const extracted: Player[] = [];

    // 1. Check if team.players array has items with valid names
    if (team.players && team.players.length > 0) {
      team.players.forEach((p, idx) => {
        if (p && p.name && p.name.trim()) {
          extracted.push(p);
        }
      });
    }

    // 2. If empty or missing, try splitting team name if it contains delimiter
    if (extracted.length === 0) {
      const rawName = team.name || '';
      if (rawName.includes('/') || rawName.includes('&') || rawName.includes(',')) {
        const parts = rawName.split(/[/&,]/).map((s) => s.trim()).filter(Boolean);
        parts.forEach((part, idx) => {
          extracted.push({
            id: `${teamKey}_p${idx + 1}`,
            name: part,
            shortName: part.slice(0, 4),
          });
        });
      } else {
        extracted.push({
          id: `${teamKey}_p1`,
          name: rawName || (teamKey === 'team1' ? 'นักกีฬา 1' : 'นักกีฬา 2'),
          shortName: (rawName || (teamKey === 'team1' ? 'P1' : 'P2')).slice(0, 4),
        });
      }
    }

    // 3. If doubles and only 1 player found, add partner slot so all 4 exist
    if (isDoubles && extracted.length === 1) {
      extracted.push({
        id: `${teamKey}_p2`,
        name: teamKey === 'team1' ? 'คู่หูทีม 1' : 'คู่หูทีม 2',
        shortName: 'คู่หู',
      });
    }

    return extracted;
  };

  const team1Players = getTeamPlayers('team1');
  const team2Players = getTeamPlayers('team2');

  // Initialize selection when opened or when initialTeam changes
  useEffect(() => {
    if (isOpen) {
      setTargetTeam(initialTeam);
      const players = initialTeam === 'team1' ? team1Players : team2Players;
      if (players.length > 0) {
        setSelectedPlayerName(players[0].name);
      }
    }
  }, [isOpen, initialTeam]);

  if (!isOpen) return null;

  // Determine winner team:
  // If mode === 'winner', targetTeam won the point.
  // If mode === 'error', targetTeam made the error, so opponent wins the point!
  const winnerTeam = mode === 'winner' ? targetTeam : targetTeam === 'team1' ? 'team2' : 'team1';

  const effectivePlayerName =
    selectedPlayerName ||
    (targetTeam === 'team1' ? team1Players[0]?.name : team2Players[0]?.name) ||
    match[targetTeam].name;

  const handleSelectPlayer = (team: 'team1' | 'team2', playerName: string) => {
    setTargetTeam(team);
    setSelectedPlayerName(playerName);
  };

  const handleSave = () => {
    if (mode === 'winner') {
      onConfirm(winnerTeam, 'winner', {
        stroke: selectedStroke,
        winnerPlayerName: effectivePlayerName,
      });
    } else {
      onConfirm(winnerTeam, 'unforced_error', {
        errorTeam: targetTeam,
        errorPlayerName: effectivePlayerName,
        errorStroke: selectedErrorStroke,
        errorDetail: selectedErrorDetail,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl p-4 sm:p-5 text-slate-100 flex flex-col gap-3.5 animate-in fade-in zoom-in-95 duration-150 max-h-[96vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow ${
                mode === 'winner'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              }`}
            >
              {mode === 'winner' ? <Flame className="w-4 h-4" /> : <AlertOctagon className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{mode === 'winner' ? 'ระบุรายละเอียดลูกวินเนอร์' : 'ระบุรายละเอียดคนตีเสีย'}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    mode === 'winner'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      : 'bg-rose-950 text-rose-300 border border-rose-700'
                  }`}
                >
                  {mode === 'winner' ? 'ได้แต้ม' : 'เสียแต้ม'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {mode === 'winner'
                  ? 'แตะเลือกคนที่ตีวินเนอร์ได้ทันทีจากรายชื่อทั้ง 4 คน'
                  : 'แตะเลือกคนที่ตีเสียได้ทันทีจากรายชื่อทั้ง 4 คน'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. SHOW ALL 4 PLAYERS DIRECTLY (Or 2 for singles) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {mode === 'winner'
                  ? 'ใครเป็นคนตีวินเนอร์ (แตะเลือกผู้เล่น 1 ใน 4 คน):'
                  : 'ใครเป็นคนตีเสีย (แตะเลือกผู้เล่น 1 ใน 4 คน):'}
              </span>
            </label>
            <span className="text-[10px] text-amber-300/90 font-medium">
              แตะชื่อได้ทันที ไม่ต้องกดสลับทีม
            </span>
          </div>

          {/* Side-by-side Columns: Team 1 & Team 2 showing ALL players at once */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Column Team 1 */}
            <div
              className={`rounded-xl p-2.5 border transition-all ${
                targetTeam === 'team1'
                  ? 'bg-slate-900/90 border-emerald-500/70 shadow-md ring-1 ring-emerald-500/30'
                  : 'bg-slate-950/60 border-slate-800 opacity-90'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400 mb-2 pb-1.5 border-b border-slate-800">
                <span className="truncate">ทีม 1: {match.team1.name}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 font-bold shrink-0">
                  {targetTeam === 'team1' ? 'เลือกอยู่' : 'ทีม 1'}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {team1Players.map((player) => {
                  const isSelected = targetTeam === 'team1' && selectedPlayerName === player.name;
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => handleSelectPlayer('team1', player.name)}
                      className={`w-full py-2.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between border cursor-pointer ${
                        isSelected
                          ? mode === 'winner'
                            ? 'bg-emerald-600 border-emerald-300 text-white shadow-lg ring-2 ring-emerald-400/60 scale-[1.02]'
                            : 'bg-rose-600 border-rose-300 text-white shadow-lg ring-2 ring-rose-400/60 scale-[1.02]'
                          : 'bg-slate-800/90 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-xs shrink-0">👤</span>
                        <span className="truncate">{player.name}</span>
                      </div>
                      {isSelected ? (
                        <Check className="w-4 h-4 shrink-0 text-white font-black animate-in zoom-in-75 duration-100" />
                      ) : (
                        <span className="text-[10px] text-slate-400/70 shrink-0 font-normal">แตะเลือก</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Column Team 2 */}
            <div
              className={`rounded-xl p-2.5 border transition-all ${
                targetTeam === 'team2'
                  ? 'bg-slate-900/90 border-sky-500/70 shadow-md ring-1 ring-sky-500/30'
                  : 'bg-slate-950/60 border-slate-800 opacity-90'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-sky-400 mb-2 pb-1.5 border-b border-slate-800">
                <span className="truncate">ทีม 2: {match.team2.name}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-800/80 font-bold shrink-0">
                  {targetTeam === 'team2' ? 'เลือกอยู่' : 'ทีม 2'}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {team2Players.map((player) => {
                  const isSelected = targetTeam === 'team2' && selectedPlayerName === player.name;
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => handleSelectPlayer('team2', player.name)}
                      className={`w-full py-2.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between border cursor-pointer ${
                        isSelected
                          ? mode === 'winner'
                            ? 'bg-sky-600 border-sky-300 text-white shadow-lg ring-2 ring-sky-400/60 scale-[1.02]'
                            : 'bg-rose-600 border-rose-300 text-white shadow-lg ring-2 ring-rose-400/60 scale-[1.02]'
                          : 'bg-slate-800/90 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-xs shrink-0">👤</span>
                        <span className="truncate">{player.name}</span>
                      </div>
                      {isSelected ? (
                        <Check className="w-4 h-4 shrink-0 text-white font-black animate-in zoom-in-75 duration-100" />
                      ) : (
                        <span className="text-[10px] text-slate-400/70 shrink-0 font-normal">แตะเลือก</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 2. MODE: WINNER STROKES */}
        {mode === 'winner' && (
          <div>
            <label className="text-xs font-semibold text-emerald-300 block mb-1.5">
              ตีลูกอะไรได้วินเนอร์:
            </label>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              {[
                { id: 'forehand', label: '🎾 โฟร์แฮนด์ (FH)' },
                { id: 'backhand', label: '🎾 แบ็คแฮนด์ (BH)' },
                { id: 'smash', label: '💥 สแมช / ลูกตบ' },
                { id: 'volley', label: '⚡ วอลเลย์หน้าเน็ต' },
                { id: 'drop_shot', label: '🪶 ดรอปช็อต' },
                { id: 'return_winner', label: '🎯 รีเทิร์นวินเนอร์' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedStroke(item.id as StrokeType)}
                  className={`py-2 px-1 rounded-lg border font-semibold transition text-center cursor-pointer ${
                    selectedStroke === item.id
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow font-bold'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3. MODE: ERROR STROKES & ERROR DETAIL */}
        {mode === 'error' && (
          <div className="space-y-3">
            {/* What stroke was missed */}
            <div>
              <label className="text-xs font-semibold text-rose-300 block mb-1.5">
                ตีลูกอะไรเสีย:
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-xs">
                {[
                  { id: 'forehand', label: 'โฟร์แฮนด์' },
                  { id: 'backhand', label: 'แบ็คแฮนด์' },
                  { id: 'smash', label: '💥 สแมช' },
                  { id: 'volley', label: '⚡ วอลเลย์' },
                  { id: 'return_winner', label: '🎯 รับเสิร์ฟ' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedErrorStroke(item.id as StrokeType)}
                    className={`py-2 px-1 rounded-lg border font-semibold transition text-center cursor-pointer ${
                      selectedErrorStroke === item.id
                        ? 'bg-rose-500/25 border-rose-400 text-rose-200 shadow font-bold'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* How did it fail: Net / Wide / Long */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                ลักษณะที่ตีเสีย:
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {[
                  { id: 'net', label: 'ติดเน็ต (Net)' },
                  { id: 'wide', label: 'ออกข้าง (Wide)' },
                  { id: 'long', label: 'ออกหลัง (Long)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedErrorDetail(item.id as ErrorDetail)}
                    className={`py-2 px-2 rounded-lg border font-semibold transition text-center cursor-pointer ${
                      selectedErrorDetail === item.id
                        ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleSave}
          className={`w-full py-2.5 px-3 rounded-xl font-bold text-white text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 active:scale-98 transition mt-1 cursor-pointer ${
            mode === 'winner'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
              : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500'
          }`}
        >
          <Award className="w-4 h-4 shrink-0" />
          <span className="truncate">
            {mode === 'winner'
              ? `บันทึกวินเนอร์ของ "${effectivePlayerName}" (แต้มให้ ${match[winnerTeam].name})`
              : `บันทึกตีเสียของ "${effectivePlayerName}" (แต้มให้ ${match[winnerTeam].name})`}
          </span>
        </button>
      </div>
    </div>
  );
};
