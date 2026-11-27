import React, { useState, useEffect } from 'react';
import {
  AdRule,
  MatchSettings,
  MatchState,
  ShotCategory,
  StrokeType,
  ErrorDetail,
} from './types/tennis';
import {
  createInitialMatch,
  recordPoint,
  undoLastPoint,
  registerFirstServeFault,
  registerSecondServeFault,
  resetServeFault,
  setDecidingReceiver,
  setServerTeam,
  updateMatchAdRule,
  updateMatchChangeEnds,
  updatePlayerNames,
} from './utils/tennisEngine';
import { isForbiddenName } from './utils/playerRoster';
import { offlineSync } from './services/offlineSync';
import {
  getSavedSheetTitle,
  getSavedSheetUrl,
  getSheetsWebhookUrl,
  loadSheetsConnectionPersistent,
  syncAllPointsToSheet,
  testSheetsConnection,
  updateMatchSummarySheet,
  wasSheetsImportedFromUrl,
} from './services/googleSheets';
import { sound } from './utils/soundEffects';

import { LandscapeScoreboard } from './components/LandscapeScoreboard';
import { AnalyticsView } from './components/AnalyticsView';
import { MatchInfographicCard } from './components/MatchInfographicCard';
import { DetailPointModal } from './components/DetailPointModal';
import { EditPlayerModal } from './components/EditPlayerModal';
import { SheetsSyncModal } from './components/SheetsSyncModal';
import { MatchSetupModal } from './components/MatchSetupModal';
import { PostMatchModal } from './components/PostMatchModal';
import { MatchHistoryModal } from './components/MatchHistoryModal';

import { Smartphone, X, WifiOff, CheckCircle } from 'lucide-react';

export default function App() {
  // 1. Match State
  const [match, setMatch] = useState<MatchState>(() => {
    const saved = offlineSync.getLocallySavedMatch();
    if (saved) {
      // Purge any lingering mock names from previously cached match
      const checkMock = (name?: string) => !name || isForbiddenName(name);
      if (checkMock(saved.team1.name) || checkMock(saved.team2.name)) {
        saved.team1.name = checkMock(saved.team1.name) ? 'ฝ่ายที่ 1' : saved.team1.name;
        saved.team2.name = checkMock(saved.team2.name) ? 'ฝ่ายที่ 2' : saved.team2.name;
        saved.team1.players = (saved.team1.players || []).map((p, i) => ({
          ...p,
          name: checkMock(p.name) ? (i === 0 ? 'ฝ่ายที่ 1' : 'คู่หู 1') : p.name,
        }));
        saved.team2.players = (saved.team2.players || []).map((p, i) => ({
          ...p,
          name: checkMock(p.name) ? (i === 0 ? 'ฝ่ายที่ 2' : 'คู่หู 2') : p.name,
        }));
        saved.team1ServerPlayerIndex = saved.team1ServerPlayerIndex ?? 0;
        saved.team2ServerPlayerIndex = saved.team2ServerPlayerIndex ?? 0;
        offlineSync.saveMatchLocally(saved);
      } else {
        saved.team1ServerPlayerIndex = saved.team1ServerPlayerIndex ?? 0;
        saved.team2ServerPlayerIndex = saved.team2ServerPlayerIndex ?? 0;
      }
      return saved;
    }

    const defaultSettings: MatchSettings = {
      type: 'singles',
      format: '3sets',
      tiebreakFormat: 'standard7',
      adRule: 'advantage',
      finalSetTiebreak: 'standard',
      courtSurface: 'hard',
    };
    return createInitialMatch(defaultSettings, 'ฝ่ายที่ 1', 'ฝ่ายที่ 2');
  });

  // 2. Modals state
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isInfographicOpen, setIsInfographicOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [inspectedMatch, setInspectedMatch] = useState<MatchState | null>(null);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isPostMatchOpen, setIsPostMatchOpen] = useState(false);
  const [isEditPlayersOpen, setIsEditPlayersOpen] = useState(false);

  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    mode: 'winner' | 'error';
    team: 'team1' | 'team2';
    playerName?: string;
  }>({
    isOpen: false,
    mode: 'winner',
    team: 'team1',
  });

  // 3. Always-connected Google Sheets Webhook (No login required)
  const [webhookUrl, setWebhookUrl] = useState<string | null>(() => getSheetsWebhookUrl());
  const [activeSheetUrl, setActiveSheetUrl] = useState<string | null>(() => getSavedSheetUrl());
  const [activeSheetTitle, setActiveSheetTitle] = useState<string | null>(() => getSavedSheetTitle());

  // 4. Online / Offline & Sync Queue
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() =>
    offlineSync.getPendingCount()
  );

  // 5. Orientation Detection & Toast
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [dismissPortraitWarning, setDismissPortraitWarning] = useState<boolean>(false);
  const [sheetsToast, setSheetsToast] = useState<string | null>(null);

  // Initialize Always-On Google Sheets Sync & Network Listeners (No Login Required)
  useEffect(() => {
    let cancelled = false;
    if (wasSheetsImportedFromUrl()) {
      setSheetsToast('เชื่อมต่อ Google Sheet ให้อัตโนมัติแล้ว • พร้อมซิงค์ตลอดเวลา');
      window.setTimeout(() => setSheetsToast(null), 4000);
    }
    loadSheetsConnectionPersistent()
      .then((persisted) => {
        if (cancelled || !persisted?.webhookUrl) return;
        setWebhookUrl(persisted.webhookUrl);
        if (persisted.spreadsheetUrl) setActiveSheetUrl(persisted.spreadsheetUrl);
        if (persisted.title) setActiveSheetTitle(persisted.title);

        if (navigator.onLine) {
          testSheetsConnection(persisted.webhookUrl)
            .then((info) => {
              if (cancelled) return;
              setWebhookUrl(info.webhookUrl);
              if (info.spreadsheetUrl) setActiveSheetUrl(info.spreadsheetUrl);
              if (info.title) setActiveSheetTitle(info.title);
              return offlineSync.processQueue();
            })
            .catch((err) => console.warn('Background Google Sheets check:', err));
        }
      })
      .catch(() => {
        // ignore persistence lookup errors
      });

    const handleOnline = () => {
      setIsOnline(true);
      offlineSync.processQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubSync = offlineSync.subscribe(() => {
      setPendingSyncCount(offlineSync.getPendingCount());
    });

    const checkOrientation = () => {
      if (typeof window !== 'undefined') {
        const isCurrentlyPortrait = window.innerHeight > window.innerWidth && window.innerWidth < 768;
        setIsPortrait(isCurrentlyPortrait);
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);

    return () => {
      cancelled = true;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('resize', checkOrientation);
      unsubSync();
    };
  }, []);

  // Check if match just finished
  useEffect(() => {
    if (match.isFinished) {
      sound.playFanfare();
      setIsPostMatchOpen(true);
      if (webhookUrl) {
        updateMatchSummarySheet(webhookUrl, match).catch((err) => console.warn('Sheets background sync:', err));
      }
    }
  }, [match.isFinished, webhookUrl, match]);

  // Handle Point Awarding
  const handleAwardPoint = async (
    winner: 'team1' | 'team2',
    category: ShotCategory = 'regular_point',
    details?: {
      stroke?: StrokeType;
      winnerPlayerName?: string;
      errorTeam?: 'team1' | 'team2';
      errorPlayerName?: string;
      errorStroke?: StrokeType;
      errorDetail?: ErrorDetail;
    }
  ) => {
    if (match.isFinished) return;

    if (category === 'ace') sound.playAce();
    else if (category === 'winner') sound.playWinner();
    else if (category === 'double_fault' || category === 'unforced_error') sound.playFault();
    else sound.playBallHit();

    const updatedMatch = recordPoint(match, winner, {
      category,
      stroke: details?.stroke,
      winnerPlayerName: details?.winnerPlayerName,
      errorTeam: details?.errorTeam,
      errorPlayerName: details?.errorPlayerName,
      errorStroke: details?.errorStroke,
      errorDetail: details?.errorDetail,
      rallyLength: 1,
    });

    setMatch(updatedMatch);

    // Save locally
    offlineSync.saveMatchLocally(updatedMatch);

    // Sync to Google Sheet if connected (login-free)
    if (webhookUrl) {
      const lastPoint = updatedMatch.pointsHistory[updatedMatch.pointsHistory.length - 1];
      if (lastPoint) {
        offlineSync.queuePoint(webhookUrl, lastPoint, updatedMatch);
      }
    }
  };

  // Undo Last Point
  const handleUndo = () => {
    if (match.pointsHistory.length === 0) return;
    const previousMatch = undoLastPoint(match);
    setMatch(previousMatch);
    offlineSync.saveMatchLocally(previousMatch);
    if (webhookUrl && navigator.onLine) {
      syncAllPointsToSheet(webhookUrl, previousMatch).catch((err) => console.warn('Sheets background sync:', err));
    }
  };

  // 1st Serve Fault
  const handleFirstServeFault = () => {
    sound.playFault();
    const updated = registerFirstServeFault(match);
    setMatch(updated);
    offlineSync.saveMatchLocally(updated);
  };

  // 2nd Serve Fault (Double Fault -> awards point to opponent!)
  const handleSecondServeFault = () => {
    sound.playFault();
    const updated = registerSecondServeFault(match);
    setMatch(updated);
    offlineSync.saveMatchLocally(updated);

    if (webhookUrl) {
      const lastPoint = updated.pointsHistory[updated.pointsHistory.length - 1];
      if (lastPoint) {
        offlineSync.queuePoint(webhookUrl, lastPoint, updated);
      }
    }
  };

  // Reset 1st Serve Fault (Let / Re-serve) - persists to LocalStorage immediately!
  const handleResetServeFault = () => {
    const updated = resetServeFault(match);
    setMatch(updated);
    offlineSync.saveMatchLocally(updated);
  };

  // Select Deciding Point Receiver / Side (3-Deuce #3 or No-Ad 40-40)
  const handleSelectDecidingReceiver = (options: {
    playerIndex?: number;
    serveCourt?: 'deuce' | 'ad';
  }) => {
    const updated = setDecidingReceiver(match, options);
    setMatch(updated);
    offlineSync.saveMatchLocally(updated);
  };

  // Save Player Names, Server, Deuce Rule & Change Ends
  const handleSavePlayers = (
    t1Name: string,
    t2Name: string,
    serverTeam: 'team1' | 'team2',
    t1Players?: string[],
    t2Players?: string[],
    adRule?: AdRule,
    changeEnds?: boolean
  ) => {
    let updated = updatePlayerNames(match, t1Name, t2Name, t1Players, t2Players);
    updated = setServerTeam(updated, serverTeam);
    if (adRule) {
      updated = updateMatchAdRule(updated, adRule);
    }
    if (typeof changeEnds === 'boolean') {
      updated = updateMatchChangeEnds(updated, changeEnds);
    }
    setMatch(updated);
    offlineSync.saveMatchLocally(updated);
    if (webhookUrl) {
      updateMatchSummarySheet(webhookUrl, updated).catch((err) => console.warn('Sheets background sync:', err));
    }
  };

  // Start New Match
  const handleStartNewMatch = (
    settings: MatchSettings,
    t1Name: string,
    t2Name: string,
    t1DoublesPartner?: string,
    t2DoublesPartner?: string,
    initialServer: 'team1' | 'team2' = 'team1'
  ) => {
    if (match.pointsHistory.length > 0 || match.isFinished) {
      offlineSync.saveMatchToHistory(match);
    }
    offlineSync.clearSyncedPointIds();
    const newMatch = createInitialMatch(settings, t1Name, t2Name, t1DoublesPartner, t2DoublesPartner);
    newMatch.currentServerTeam = initialServer;
    setMatch(newMatch);
    offlineSync.saveMatchLocally(newMatch);
    setIsPostMatchOpen(false);
    if (webhookUrl) {
      updateMatchSummarySheet(webhookUrl, newMatch).catch((err) => console.warn('Sheets background sync:', err));
    }
  };

  // Load / Resume Match from History
  const handleLoadMatchFromHistory = (loadedMatch: MatchState) => {
    if (match.id !== loadedMatch.id && (match.pointsHistory.length > 0 || match.isFinished)) {
      offlineSync.saveMatchToHistory(match);
    }
    setMatch(loadedMatch);
    offlineSync.saveMatchLocally(loadedMatch);
    setIsPostMatchOpen(false);
    if (webhookUrl) {
      syncAllPointsToSheet(webhookUrl, loadedMatch).catch((err) => console.warn('Sheets background sync:', err));
    }
  };

  // Reset Match to 0-0 with Current Players & Rules
  const handleResetCurrentMatch = () => {
    if (match.pointsHistory.length > 0 || match.isFinished) {
      offlineSync.saveMatchToHistory(match);
    }
    offlineSync.clearSyncedPointIds();
    const t1Name = match.team1.players[0]?.name || match.team1.name;
    const t2Name = match.team2.players[0]?.name || match.team2.name;
    const t1Partner = match.team1.players[1]?.name;
    const t2Partner = match.team2.players[1]?.name;
    const newMatch = createInitialMatch(match.settings, t1Name, t2Name, t1Partner, t2Partner);
    newMatch.currentServerTeam = match.currentServerTeam;
    setMatch(newMatch);
    offlineSync.saveMatchLocally(newMatch);
    setIsPostMatchOpen(false);
    if (webhookUrl) {
      updateMatchSummarySheet(webhookUrl, newMatch).catch((err) => console.warn('Sheets background sync:', err));
    }
  };

  return (
    <div className="h-full w-full bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden select-none">
      {/* Portrait Mode Advisory Banner for Mobile */}
      {isPortrait && !dismissPortraitWarning && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-3 py-2 text-xs flex items-center justify-between shadow-xl animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 rotate-90 animate-bounce" />
            <span className="font-semibold">
              หมุนโทรศัพท์เป็นแนวนอน (Landscape) เพื่อใช้งานหน้าจอนับแต้มกรรมการแบบเต็มตา
            </span>
          </div>
          <button
            onClick={() => setDismissPortraitWarning(true)}
            className="p-1 rounded bg-black/20 hover:bg-black/30 text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Landscape Scoreboard */}
      <LandscapeScoreboard
        match={match}
        onAwardPoint={handleAwardPoint}
        onOpenDetailModal={(mode, team, playerName) =>
          setDetailModal({ isOpen: true, mode, team, playerName })
        }
        onOpenEditPlayers={() => setIsEditPlayersOpen(true)}
        onUndo={handleUndo}
        onFirstServeFault={handleFirstServeFault}
        onSecondServeFault={handleSecondServeFault}
        onResetServeFault={handleResetServeFault}
        onSelectDecidingReceiver={handleSelectDecidingReceiver}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenAnalytics={() => {
          setInspectedMatch(null);
          setIsAnalyticsOpen(true);
        }}
        onOpenInfographic={() => {
          setInspectedMatch(null);
          setIsInfographicOpen(true);
        }}
        onOpenSheetsSync={() => setIsSheetsModalOpen(true)}
        onOpenSettings={() => setIsSetupOpen(true)}
        onResetMatch={handleResetCurrentMatch}
        isOnline={isOnline}
        isSheetConnected={Boolean(webhookUrl)}
        pendingSyncCount={pendingSyncCount}
      />

      {/* Floating Offline Notification */}
      {!isOnline && (
        <div className="fixed bottom-2 left-2 z-40 flex items-center gap-2 bg-amber-500/90 text-slate-950 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-lg backdrop-blur-xs">
          <WifiOff className="w-3.5 h-3.5" />
          <span>โหมดออฟไลน์: แต้มจะซิงค์ขึ้นชีตอัตโนมัติเมื่อต่อเน็ต</span>
        </div>
      )}

      {/* Brief Auto-Dismiss Confirmation Toast after saving & hiding Google Sheet */}
      {sheetsToast && (
        <div className="fixed top-12 right-3 z-50 flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-2xl border border-emerald-400 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-100 shrink-0" />
          <span>{sheetsToast}</span>
        </div>
      )}

      {/* Detailed Point Breakdown Modal (Winner or Error) */}
      {detailModal.isOpen && (
        <DetailPointModal
          isOpen={detailModal.isOpen}
          onClose={() => setDetailModal((prev) => ({ ...prev, isOpen: false, playerName: undefined }))}
          mode={detailModal.mode}
          initialTeam={detailModal.team}
          initialPlayerName={detailModal.playerName}
          match={match}
          onConfirm={(winner, cat, details) => handleAwardPoint(winner, cat, details)}
        />
      )}

      {/* Edit Player Names & Server Modal */}
      {isEditPlayersOpen && (
        <EditPlayerModal
          isOpen={isEditPlayersOpen}
          onClose={() => setIsEditPlayersOpen(false)}
          match={match}
          onSave={handleSavePlayers}
        />
      )}

      {/* Match History Modal */}
      {isHistoryOpen && (
        <MatchHistoryModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          currentMatchId={match.id}
          onSelectAnalytics={(m) => {
            setInspectedMatch(m);
            setIsAnalyticsOpen(true);
          }}
          onSelectInfographic={(m) => {
            setInspectedMatch(m);
            setIsInfographicOpen(true);
          }}
          onLoadMatch={handleLoadMatchFromHistory}
        />
      )}

      {/* Infographic Generator Modal */}
      {isInfographicOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3">
          <div className="w-full max-w-2xl h-[92vh]">
            <MatchInfographicCard
              match={inspectedMatch || match}
              onClose={() => {
                setIsInfographicOpen(false);
                setInspectedMatch(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Analytics & Form Visualizer (Full-Screen View) */}
      {isAnalyticsOpen && (
        <div className="fixed inset-0 z-50 w-screen h-screen bg-slate-950">
          <AnalyticsView
            match={inspectedMatch || match}
            onClose={() => {
              setIsAnalyticsOpen(false);
              setInspectedMatch(null);
            }}
          />
        </div>
      )}

      {/* Google Sheets Sync Modal (Always-On, No Login) */}
      {isSheetsModalOpen && (
        <SheetsSyncModal
          isOpen={isSheetsModalOpen}
          onClose={() => setIsSheetsModalOpen(false)}
          webhookUrl={webhookUrl}
          activeSheetUrl={activeSheetUrl}
          activeSheetTitle={activeSheetTitle}
          onConnectionUpdated={(info) => {
            setWebhookUrl(info.webhookUrl);
            setActiveSheetUrl(info.sheetUrl);
            setActiveSheetTitle(info.sheetTitle);
          }}
          onSavedAndHidden={() => {
            setSheetsToast('บันทึก Google Sheet ถาวรและซ่อนปุ่มแล้ว • ซิงค์อัตโนมัติตลอดเวลา');
            window.setTimeout(() => setSheetsToast(null), 4000);
          }}
          match={match}
          isOnline={isOnline}
          pendingSyncCount={pendingSyncCount}
        />
      )}

      {/* Match Setup Modal */}
      {isSetupOpen && (
        <MatchSetupModal
          isOpen={isSetupOpen}
          onClose={() => setIsSetupOpen(false)}
          onStartMatch={handleStartNewMatch}
          isSheetConnected={Boolean(webhookUrl)}
          activeSheetTitle={activeSheetTitle}
          onOpenSheetsSync={() => setIsSheetsModalOpen(true)}
        />
      )}

      {/* Post Match Celebration & Summary Modal */}
      {isPostMatchOpen && (
        <PostMatchModal
          isOpen={isPostMatchOpen}
          onClose={() => setIsPostMatchOpen(false)}
          match={match}
          activeSheetUrl={activeSheetUrl}
          onOpenAnalytics={() => {
            setIsPostMatchOpen(false);
            setIsAnalyticsOpen(true);
          }}
          onOpenInfographic={() => {
            setIsPostMatchOpen(false);
            setIsInfographicOpen(true);
          }}
          onNewMatch={() => {
            setIsPostMatchOpen(false);
            setIsSetupOpen(true);
          }}
        />
      )}
    </div>
  );
}
