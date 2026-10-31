import React, { useState } from 'react';
import { MatchState } from '../types/tennis';
import { UserCheck, X, Check, Edit3 } from 'lucide-react';
import { getSavedPlayerRoster, saveMultiplePlayersToRoster } from '../utils/playerRoster';

interface EditPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: MatchState;
  onSave: (
    t1Name: string,
    t2Name: string,
    serverTeam: 'team1' | 'team2',
    t1Players?: string[],
    t2Players?: string[]
  ) => void;
}

export const EditPlayerModal: React.FC<EditPlayerModalProps> = ({
  isOpen,
  onClose,
  match,
  onSave,
}) => {
  const isDoubles = match.settings.type === 'doubles';

  const [t1P1, setT1P1] = useState(match.team1.players[0]?.name || match.team1.name || 'Player 1');
  const [t1P2, setT1P2] = useState(match.team1.players[1]?.name || 'Partner 1');

  const [t2P1, setT2P1] = useState(match.team2.players[0]?.name || match.team2.name || 'Player 2');
  const [t2P2, setT2P2] = useState(match.team2.players[1]?.name || 'Partner 2');

  const [serverTeam, setServerTeamState] = useState<'team1' | 'team2'>(match.currentServerTeam);
  const [savedRoster] = useState<string[]>(() => getSavedPlayerRoster());

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isDoubles) {
      const p1 = t1P1.trim() || 'Player 1';
      const p2 = t1P2.trim() || 'Partner 1';
      const p3 = t2P1.trim() || 'Player 2';
      const p4 = t2P2.trim() || 'Partner 2';
      const team1DisplayName = `${p1} / ${p2}`;
      const team2DisplayName = `${p3} / ${p4}`;

      saveMultiplePlayersToRoster([p1, p2, p3, p4]);
      onSave(team1DisplayName, team2DisplayName, serverTeam, [p1, p2], [p3, p4]);
    } else {
      const p1 = t1P1.trim() || 'Player 1';
      const p2 = t2P1.trim() || 'Player 2';

      saveMultiplePlayersToRoster([p1, p2]);
      onSave(p1, p2, serverTeam, [p1], [p2]);
    }
    onClose();
  };

  const previewT1 = isDoubles ? `${t1P1 || 'P1'} / ${t1P2 || 'P2'}` : t1P1 || 'ทีม 1';
  const previewT2 = isDoubles ? `${t2P1 || 'P3'} / ${t2P2 || 'P4'}` : t2P1 || 'ทีม 2';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 text-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Edit3 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">แก้ไขชื่อนักกีฬา & กำหนดผู้เสิร์ฟ</h3>
              <p className="text-[11px] text-slate-400">
                {isDoubles ? 'แก้ไขรายชื่อผู้เล่นประเภทคู่' : 'แก้ไขชื่อผู้เล่นเดี่ยว'} และกำหนดคนเสิร์ฟ
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Player 1 / Team 1 */}
          <div className="p-3 bg-slate-950/70 rounded-xl border border-emerald-900/60 space-y-2">
            <label className="text-xs font-semibold text-emerald-400 block">
              {isDoubles ? '🎾 ทีม 1 (Doubles Team 1):' : '🎾 ผู้เล่น 1 (Player 1):'}
            </label>
            <div>
              <input
                type="text"
                value={t1P1}
                onChange={(e) => setT1P1(e.target.value)}
                placeholder={isDoubles ? 'ผู้เล่นคนที่ 1' : 'กรอกชื่อผู้เล่น 1'}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                required
              />
              <div className="flex gap-1 overflow-x-auto mt-1 py-0.5 no-scrollbar">
                {savedRoster.slice(0, 6).map((name, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setT1P1(name)}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-emerald-900/60 hover:text-emerald-300 text-slate-400 border border-slate-700/60 shrink-0"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {isDoubles && (
              <div>
                <input
                  type="text"
                  value={t1P2}
                  onChange={(e) => setT1P2(e.target.value)}
                  placeholder="ผู้เล่นคนที่ 2 (คู่หู)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  required
                />
                <div className="flex gap-1 overflow-x-auto mt-1 py-0.5 no-scrollbar">
                  {savedRoster.slice(0, 6).map((name, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setT1P2(name)}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-emerald-900/60 hover:text-emerald-300 text-slate-400 border border-slate-700/60 shrink-0"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Player 2 / Team 2 */}
          <div className="p-3 bg-slate-950/70 rounded-xl border border-sky-900/60 space-y-2">
            <label className="text-xs font-semibold text-sky-400 block">
              {isDoubles ? '🎾 ทีม 2 (Doubles Team 2):' : '🎾 ผู้เล่น 2 (Player 2):'}
            </label>
            <div>
              <input
                type="text"
                value={t2P1}
                onChange={(e) => setT2P1(e.target.value)}
                placeholder={isDoubles ? 'ผู้เล่นคนที่ 1' : 'กรอกชื่อผู้เล่น 2'}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-sky-500"
                required
              />
              <div className="flex gap-1 overflow-x-auto mt-1 py-0.5 no-scrollbar">
                {savedRoster.slice(0, 6).map((name, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setT2P1(name)}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-sky-900/60 hover:text-sky-300 text-slate-400 border border-slate-700/60 shrink-0"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {isDoubles && (
              <div>
                <input
                  type="text"
                  value={t2P2}
                  onChange={(e) => setT2P2(e.target.value)}
                  placeholder="ผู้เล่นคนที่ 2 (คู่หู)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-sky-500"
                  required
                />
                <div className="flex gap-1 overflow-x-auto mt-1 py-0.5 no-scrollbar">
                  {savedRoster.slice(0, 6).map((name, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setT2P2(name)}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-sky-900/60 hover:text-sky-300 text-slate-400 border border-slate-700/60 shrink-0"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Who Serves Now / Who Serves First */}
          <div>
            <label className="text-xs font-semibold text-amber-300 block mb-1.5">
              🎾 กำหนดผู้เสิร์ฟ (เลือกฝ่ายที่กำลังเสิร์ฟ):
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setServerTeamState('team1')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  serverTeam === 'team1'
                    ? 'bg-yellow-400 text-slate-950 border-yellow-300 shadow-md font-black'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <span>🎾 {previewT1} เสิร์ฟ</span>
              </button>

              <button
                type="button"
                onClick={() => setServerTeamState('team2')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  serverTeam === 'team2'
                    ? 'bg-yellow-400 text-slate-950 border-yellow-300 shadow-md font-black'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <span>🎾 {previewT2} เสิร์ฟ</span>
              </button>
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-bold text-white text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 active:scale-98 transition mt-2"
          >
            <Check className="w-4 h-4" />
            <span>บันทึกการเปลี่ยนแปลง</span>
          </button>
        </form>
      </div>
    </div>
  );
};
