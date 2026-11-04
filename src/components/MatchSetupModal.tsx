import React, { useState } from 'react';
import { MatchFormat, MatchSettings, MatchType } from '../types/tennis';
import { Users, User as UserIcon, Play, Settings2, X, Trash2, Plus, UserPlus } from 'lucide-react';
import {
  getSavedPlayerRoster,
  addPlayerToRoster,
  saveMultiplePlayersToRoster,
  removePlayerFromRoster,
  clearAllSavedRoster,
} from '../utils/playerRoster';

interface MatchSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartMatch: (
    settings: MatchSettings,
    t1Name: string,
    t2Name: string,
    t1DoublesPartner?: string,
    t2DoublesPartner?: string,
    initialServer?: 'team1' | 'team2'
  ) => void;
}

export const MatchSetupModal: React.FC<MatchSetupModalProps> = ({
  isOpen,
  onClose,
  onStartMatch,
}) => {
  const [matchType, setMatchType] = useState<MatchType>('singles');
  const [format, setFormat] = useState<MatchFormat>('3sets');
  const [adRule, setAdRule] = useState<'advantage' | 'no-ad'>('advantage');
  const [finalSetTiebreak, setFinalSetTiebreak] = useState<'standard' | 'super'>('standard');
  const [courtSurface, setCourtSurface] = useState<'hard' | 'clay' | 'grass'>('hard');

  // Input states start empty so user types their own player names
  const [t1Name, setT1Name] = useState('');
  const [t2Name, setT2Name] = useState('');
  const [t1Partner, setT1Partner] = useState('');
  const [t2Partner, setT2Partner] = useState('');
  const [initialServer, setInitialServer] = useState<'team1' | 'team2'>('team1');

  // Custom player roster states
  const [savedRoster, setSavedRoster] = useState<string[]>(() => getSavedPlayerRoster());
  const [showRosterManager, setShowRosterManager] = useState<boolean>(false);
  const [newPlayerInput, setNewPlayerInput] = useState<string>('');

  if (!isOpen) return null;

  const handleAddNewPlayer = () => {
    const trimmed = newPlayerInput.trim();
    if (!trimmed) return;
    const updated = addPlayerToRoster(trimmed);
    setSavedRoster([...updated]);
    setNewPlayerInput('');
  };

  const handleDeleteRoster = (name: string) => {
    const updated = removePlayerFromRoster(name);
    setSavedRoster([...updated]);
    // Clear from form inputs if currently set to the deleted name
    if (t1Name === name) setT1Name('');
    if (t2Name === name) setT2Name('');
    if (t1Partner === name) setT1Partner('');
    if (t2Partner === name) setT2Partner('');
  };

  const handleClearAllRoster = () => {
    const updated = clearAllSavedRoster();
    setSavedRoster([...updated]);
    setShowRosterManager(false);
  };

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    const finalT1Name = t1Name.trim() || 'ผู้เล่น 1';
    const finalT2Name = t2Name.trim() || 'ผู้เล่น 2';
    const finalT1Partner = matchType === 'doubles' ? t1Partner.trim() || 'คู่หู 1' : undefined;
    const finalT2Partner = matchType === 'doubles' ? t2Partner.trim() || 'คู่หู 2' : undefined;

    // Automatically remember custom player names in roster for future matches
    saveMultiplePlayersToRoster([
      t1Name.trim() || undefined,
      t2Name.trim() || undefined,
      t1Partner.trim() || undefined,
      t2Partner.trim() || undefined,
    ]);

    const settings: MatchSettings = {
      type: matchType,
      format,
      tiebreakFormat: 'standard7',
      adRule,
      finalSetTiebreak,
      courtSurface,
    };

    onStartMatch(
      settings,
      finalT1Name,
      finalT2Name,
      finalT1Partner,
      finalT2Partner,
      initialServer
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 text-slate-100 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">ตั้งค่าแมตช์การแข่งขันใหม่</h3>
              <p className="text-xs text-slate-400">ระบุรายชื่อผู้เล่น กฎกติกา และประเภทแมตช์</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleStart} className="space-y-4">
          {/* Singles vs Doubles */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              ประเภทการแข่งขัน:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMatchType('singles')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition ${
                  matchType === 'singles'
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-md'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                <span>ประเภทเดี่ยว (Singles)</span>
              </button>

              <button
                type="button"
                onClick={() => setMatchType('doubles')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition ${
                  matchType === 'doubles'
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-md'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>ประเภทคู่ (Doubles)</span>
              </button>
            </div>
          </div>

          {/* Manage Roster Header & Toggle */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>สมุดรายชื่อผู้เล่นของฉัน ({savedRoster.length})</span>
              </div>
              <button
                type="button"
                onClick={() => setShowRosterManager(!showRosterManager)}
                className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 transition"
              >
                {showRosterManager ? '▲ ซ่อนจัดการรายชื่อ' : '▼ เพิ่ม / ลบ รายชื่อ'}
              </button>
            </div>

            {/* Expandable Add / Delete Roster Panel */}
            {showRosterManager && (
              <div className="pt-2 border-t border-slate-800 space-y-2">
                {/* Add New Player Input */}
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={newPlayerInput}
                    onChange={(e) => setNewPlayerInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewPlayer();
                      }
                    }}
                    placeholder="พิมพ์ชื่อผู้เล่นใหม่ที่นี่..."
                    className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddNewPlayer}
                    disabled={!newPlayerInput.trim()}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 shrink-0 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มชื่อ</span>
                  </button>
                </div>

                {/* List of saved players */}
                {savedRoster.length > 0 ? (
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
                      <span className="text-[10px] text-slate-400 font-semibold">รายชื่อที่บันทึกไว้:</span>
                      <button
                        type="button"
                        onClick={handleClearAllRoster}
                        className="text-[10px] font-bold text-rose-400 hover:text-rose-300 hover:underline"
                      >
                        ล้างทั้งหมด (Clear All)
                      </button>
                    </div>
                    {savedRoster.map((name) => (
                      <div
                        key={name}
                        className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs"
                      >
                        <span className="text-slate-200 font-medium truncate max-w-[200px]">{name}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (!t1Name) setT1Name(name);
                              else if (!t2Name) setT2Name(name);
                              else if (matchType === 'doubles' && !t1Partner) setT1Partner(name);
                              else if (matchType === 'doubles' && !t2Partner) setT2Partner(name);
                              else setT1Name(name);
                            }}
                            className="text-[10px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/60 px-2 py-0.5 rounded transition font-semibold"
                          >
                            ใช้ชื่อนี้
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRoster(name)}
                            className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 px-2 py-0.5 rounded transition text-[11px] font-bold flex items-center gap-1"
                            title={`ลบ "${name}" ออกจากระบบ`}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>ลบ</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 text-center py-2">
                    ยังไม่มีรายชื่อที่บันทึกไว้ คุณสามารถพิมพ์ชื่อด้านบนแล้วกด "เพิ่มชื่อ" ได้เลย
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Player Names Section */}
          <div className="space-y-3">
            {/* Team 1 */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-emerald-900/50 space-y-2">
              <span className="text-xs font-bold text-emerald-400 block">
                {matchType === 'doubles' ? '🎾 ฝ่ายที่ 1 (ทีม 1)' : '🎾 ฝ่ายที่ 1 (ผู้เล่น 1)'}
              </span>
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full">
                  <input
                    type="text"
                    value={t1Name}
                    onChange={(e) => setT1Name(e.target.value)}
                    placeholder={matchType === 'doubles' ? 'ระบุชื่อผู้เล่น 1 (คนแรก)' : 'ระบุชื่อผู้เล่น 1'}
                    className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                  />
                  {savedRoster.length > 0 && (
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) setT1Name(e.target.value);
                      }}
                      className="w-full sm:w-36 px-2 py-2 rounded-xl bg-slate-800 border border-slate-700 text-[11px] text-slate-300 focus:outline-hidden shrink-0"
                    >
                      <option value="">📂 เลือกจากรายชื่อ...</option>
                      {savedRoster.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {matchType === 'doubles' && (
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full">
                    <input
                      type="text"
                      value={t1Partner}
                      onChange={(e) => setT1Partner(e.target.value)}
                      placeholder="ระบุชื่อคู่หูทีม 1"
                      className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                    />
                    {savedRoster.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) setT1Partner(e.target.value);
                        }}
                        className="w-full sm:w-36 px-2 py-2 rounded-xl bg-slate-800 border border-slate-700 text-[11px] text-slate-300 focus:outline-hidden shrink-0"
                      >
                        <option value="">📂 เลือกจากรายชื่อ...</option>
                        {savedRoster.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Team 2 */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-sky-900/50 space-y-2">
              <span className="text-xs font-bold text-sky-400 block">
                {matchType === 'doubles' ? '🎾 ฝ่ายที่ 2 (ทีม 2)' : '🎾 ฝ่ายที่ 2 (ผู้เล่น 2)'}
              </span>
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full">
                  <input
                    type="text"
                    value={t2Name}
                    onChange={(e) => setT2Name(e.target.value)}
                    placeholder={matchType === 'doubles' ? 'ระบุชื่อผู้เล่น 2 (คนแรก)' : 'ระบุชื่อผู้เล่น 2'}
                    className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-sky-500"
                  />
                  {savedRoster.length > 0 && (
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) setT2Name(e.target.value);
                      }}
                      className="w-full sm:w-36 px-2 py-2 rounded-xl bg-slate-800 border border-slate-700 text-[11px] text-slate-300 focus:outline-hidden shrink-0"
                    >
                      <option value="">📂 เลือกจากรายชื่อ...</option>
                      {savedRoster.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {matchType === 'doubles' && (
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full">
                    <input
                      type="text"
                      value={t2Partner}
                      onChange={(e) => setT2Partner(e.target.value)}
                      placeholder="ระบุชื่อคู่หูทีม 2"
                      className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-sky-500"
                    />
                    {savedRoster.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) setT2Partner(e.target.value);
                        }}
                        className="w-full sm:w-36 px-2 py-2 rounded-xl bg-slate-800 border border-slate-700 text-[11px] text-slate-300 focus:outline-hidden shrink-0"
                      >
                        <option value="">📂 เลือกจากรายชื่อ...</option>
                        {savedRoster.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Format & Rules Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Match Format */}
            <div>
              <label className="font-semibold text-slate-300 block mb-1">จำนวนเซต:</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as MatchFormat)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-emerald-500"
              >
                <option value="1set">1 เซตจบ (1 Set)</option>
                <option value="3sets">ชนะ 2 ใน 3 เซต (Best of 3)</option>
                <option value="5sets">ชนะ 3 ใน 5 เซต (Best of 5)</option>
                <option value="pro8">โปรเซต 8 เกม (Pro Set 8)</option>
              </select>
            </div>

            {/* Deuce rule */}
            <div>
              <label className="font-semibold text-slate-300 block mb-1">กฎดิวซ์ (Deuce):</label>
              <select
                value={adRule}
                onChange={(e) => setAdRule(e.target.value as 'advantage' | 'no-ad')}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-emerald-500"
              >
                <option value="advantage">Advantage (มีได้เปรียบ)</option>
                <option value="no-ad">No-Ad (แต้มตัดสินทันที)</option>
              </select>
            </div>

            {/* Court surface */}
            <div>
              <label className="font-semibold text-slate-300 block mb-1">พื้นผิวคอร์ต:</label>
              <select
                value={courtSurface}
                onChange={(e) => setCourtSurface(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-emerald-500"
              >
                <option value="hard">ฮาร์ดคอร์ต (Hard Court)</option>
                <option value="clay">คอร์ตดิน (Clay Court)</option>
                <option value="grass">คอร์ตหญ้า (Grass Court)</option>
              </select>
            </div>

            {/* Initial Server */}
            <div>
              <label className="font-semibold text-slate-300 block mb-1">ผู้เริ่มเสิร์ฟเกมแรก:</label>
              <select
                value={initialServer}
                onChange={(e) => setInitialServer(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-emerald-500"
              >
                <option value="team1">{t1Name || 'ฝ่ายที่ 1'}</option>
                <option value="team2">{t2Name || 'ฝ่ายที่ 2'}</option>
              </select>
            </div>
          </div>

          {/* Start Match Button */}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-bold text-white text-sm shadow-xl flex items-center justify-center gap-2 active:scale-98 transition mt-2"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>เริ่มนับแต้มแมตช์นี้ (Start Match)</span>
          </button>
        </form>
      </div>
    </div>
  );
};
