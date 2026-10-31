import React, { useState } from 'react';
import { MatchState, ShotCategory, StrokeType, ErrorDetail } from '../types/tennis';
import { Flame, AlertOctagon, X, Check, Award } from 'lucide-react';

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

  const t1Name = match.team1.name;
  const t2Name = match.team2.name;

  // Active players in the selected target team
  const targetPlayers = match[targetTeam].players || [];

  // Update default selected player name when targetTeam changes
  React.useEffect(() => {
    const firstPlayer = match[targetTeam].players[0]?.name || match[targetTeam].name;
    setSelectedPlayerName(firstPlayer);
  }, [targetTeam, match]);

  if (!isOpen) return null;

  // If mode === 'winner', targetTeam is the WINNER
  // If mode === 'error', targetTeam is the person who made the ERROR, so the winner is the OPPONENT!
  const winnerTeam = mode === 'winner' ? targetTeam : targetTeam === 'team1' ? 'team2' : 'team1';

  const handleSave = () => {
    const effectivePlayerName = selectedPlayerName || match[targetTeam].players[0]?.name || match[targetTeam].name;
    if (mode === 'winner') {
      onConfirm(winnerTeam, 'winner', {
        stroke: selectedStroke,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 sm:p-5 text-slate-100 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm ${
                mode === 'winner'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              {mode === 'winner' ? <Flame className="w-4 h-4" /> : <AlertOctagon className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {mode === 'winner' ? 'ระบุรายละเอียดลูกวินเนอร์' : 'ระบุรายละเอียดคนตีเสีย'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {mode === 'winner'
                  ? 'ใครเป็นคนตีวินเนอร์ และตีด้วยลูกอะไร'
                  : 'ใครเป็นคนตีเสีย ตีลูกอะไร และเสียอย่างไร'}
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

        {/* 1. Who hit the shot / Who made the error */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            {mode === 'winner' ? 'ใครเป็นคนตีวินเนอร์ได้แต้ม:' : 'ใครเป็นคนตีเสีย (ฝ่ายเสียแต้ม):'}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTargetTeam('team1')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                targetTeam === 'team1'
                  ? mode === 'winner'
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow'
                    : 'bg-rose-600 border-rose-400 text-white shadow'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
              }`}
            >
              {targetTeam === 'team1' && <Check className="w-3.5 h-3.5" />}
              <span>{t1Name}</span>
            </button>

            <button
              type="button"
              onClick={() => setTargetTeam('team2')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                targetTeam === 'team2'
                  ? mode === 'winner'
                    ? 'bg-sky-600 border-sky-400 text-white shadow'
                    : 'bg-rose-600 border-rose-400 text-white shadow'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
              }`}
            >
              {targetTeam === 'team2' && <Check className="w-3.5 h-3.5" />}
              <span>{t2Name}</span>
            </button>
          </div>

          {/* Sub-selection for Doubles: Specific Player */}
          {targetPlayers.length > 1 && (
            <div className="mt-2 pt-2 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-400 block mb-1">
                {mode === 'winner' ? 'นักกีฬาที่ตีวินเนอร์ (ประเภทคู่):' : 'นักกีฬาที่ตีเสีย (ประเภทคู่):'}
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {targetPlayers.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => setSelectedPlayerName(player.name)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition ${
                      selectedPlayerName === player.name
                        ? 'bg-slate-700 border-emerald-400 text-white'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    👤 {player.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. MODE: WINNER STROKES */}
        {mode === 'winner' && (
          <div>
            <label className="text-xs font-semibold text-emerald-300 block mb-1.5">
              ตีลูกอะไรได้วินเนอร์:
            </label>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              {[
                { id: 'forehand', label: 'โฟร์แฮนด์ (FH)' },
                { id: 'backhand', label: 'แบ็คแฮนด์ (BH)' },
                { id: 'volley', label: 'วอลเลย์หน้าเน็ต' },
                { id: 'smash', label: 'สแมช / ลูกตบ' },
                { id: 'drop_shot', label: 'ดรอปช็อต' },
                { id: 'return_winner', label: 'รีเทิร์นวินเนอร์' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedStroke(item.id as StrokeType)}
                  className={`py-2 px-1 rounded-lg border font-semibold transition text-center ${
                    selectedStroke === item.id
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow'
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
                  { id: 'volley', label: 'วอลเลย์หน้าเน็ต' },
                  { id: 'smash', label: 'สแมช' },
                  { id: 'return_winner', label: 'รับเสิร์ฟ' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedErrorStroke(item.id as StrokeType)}
                    className={`py-2 px-1 rounded-lg border font-semibold transition text-center ${
                      selectedErrorStroke === item.id
                        ? 'bg-rose-500/25 border-rose-400 text-rose-200 shadow'
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
                    className={`py-2 px-2 rounded-lg border font-semibold transition text-center ${
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
          className={`w-full py-2.5 rounded-xl font-bold text-white text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 active:scale-98 transition mt-1 ${
            mode === 'winner'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
              : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>
            {mode === 'winner'
              ? `บันทึกแต้มให้ ${match[winnerTeam].name}`
              : `บันทึกแต้มเสียของ ${match[targetTeam].name} (แต้มให้ ${match[winnerTeam].name})`}
          </span>
        </button>
      </div>
    </div>
  );
};
