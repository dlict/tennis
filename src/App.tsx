import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  MatchFormat,
  MatchSettings,
  MatchState,
  PointRecord,
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
  setServerTeam,
  updatePlayerNames,
} from './utils/tennisEngine';
import { initAuth } from './services/firebaseAuth';
import { offlineSync } from './services/offlineSync';
import { updateMatchSummarySheet } from './services/googleSheets';
import { saveMatchToFirestore } from './services/firestore';
import { sound } from './utils/soundEffects';

import { LandscapeScoreboard } from './components/LandscapeScoreboard';
import { AnalyticsView } from './components/AnalyticsView';
import { MatchInfographicCard } from './components/MatchInfographicCard';
import { DetailPointModal } from './components/DetailPointModal';
import { EditPlayerModal } from './components/EditPlayerModal';
import { SheetsSyncModal } from './components/SheetsSyncModal';
import { MatchSetupModal } from './components/MatchSetupModal';
import { PostMatchModal } from './components/PostMatchModal';

import { Smartphone, RotateCcw, X, WifiOff } from 'lucide-react';

export default function App() {
  // 1. Match State
  const [match, setMatch] = useState<MatchState>(() => {
    const saved = offlineSync.getLocallySavedMatch();
    if (saved) return saved;

    const defaultSettings: MatchSettings = {
      type: 'singles',
      format: '3sets',
      tiebreakFormat: 'standard7',
      adRule: 'advantage',
      finalSetTiebreak: 'standard',
      courtSurface: 'hard',
    };
    return createInitialMatch(defaultSettings, 'นักกีฬา 1', 'นักกีฬา 2');
  });

  // 2. Modals state
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isInfographicOpen, setIsInfographicOpen] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isPostMatchOpen, setIsPostMatchOpen] = useState(false);
  const [isEditPlayersOpen, setIsEditPlayersOpen] = useState(false);

  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    mode: 'winner' | 'error';
    team: 'team1' | 'team2';
  }>({
    isOpen: false,
    mode: 'winner',
    team: 'team1',
  });

  // 3. Google Auth & Sheets connection
  const [user, setUser] = useState<User | null>(null);
  const [activeSheetId, setActiveSheetId] = useState<string | null>(() => {
    return localStorage.getItem('tennispro_active_sheet_id');
  });
  const [activeSheetUrl, setActiveSheetUrl] = useState<string | null>(() => {
    return localStorage.getItem('tennispro_active_sheet_url');
  });

  // 4. Online / Offline & Sync Queue
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() =>
    offlineSync.getPendingCount()
  );

  // 5. Orientation Detection
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [dismissPortraitWarning, setDismissPortraitWarning] = useState<boolean>(false);

  // Initialize Auth & Network Listeners
  useEffect(() => {
    const unsubAuth = initAuth(
      (currentUser) => setUser(currentUser),
      () => setUser(null)
    );

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
      unsubAuth();
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
      if (activeSheetId) {
        updateMatchSummarySheet(activeSheetId, match).catch(console.error);
      }
    }
  }, [match.isFinished, activeSheetId, match]);

  // Handle Point Awarding
  const handleAwardPoint = async (
    winner: 'team1' | 'team2',
    category: ShotCategory = 'regular_point',
    details?: {
      stroke?: StrokeType;
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
      errorTeam: details?.errorTeam,
      errorPlayerName: details?.errorPlayerName,
      errorStroke: details?.errorStroke,
      errorDetail: details?.errorDetail,
      rallyLength: 1,
    });

    setMatch(updatedMatch);

    // Save locally & Firestore
    offlineSync.saveMatchLocally(updatedMatch);
    saveMatchToFirestore(updatedMatch, user?.uid);

    // Sync to Google Sheet if active
    if (activeSheetId) {
      const lastPoint = updatedMatch.pointsHistory[updatedMatch.pointsHistory.length - 1];
      if (lastPoint) {
        offlineSync.queuePoint(activeSheetId, lastPoint, updatedMatch);
      }
    }
  };

  // Undo Last Point
  const handleUndo = () => {
    if (match.pointsHistory.length === 0) return;
    const previousMatch = undoLastPoint(match);
    setMatch(previousMatch);
    offlineSync.saveMatchLocally(previousMatch);
    saveMatchToFirestore(previousMatch, user?.uid);
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
    saveMatchToFirestore(updated, user?.uid);

    if (activeSheetId) {
      const lastPoint = updated.pointsHistory[updated.pointsHistory.length - 1];
      if (lastPoint) {
        offlineSync.queuePoint(activeSheetId, lastPoint, updated);
      }
    }
  };

  // Reset 1st Serve Fault (Let / Re-serve)
  const handleResetServeFault = () => {
    setMatch((prev) => ({
      ...prev,
      isFirstServeFault: false,
    }));
  };

  // Toggle Server
  const handleToggleServer = () => {
    const nextServer: 'team1' | 'team2' = match.currentServerTeam === 'team1' ? 'team2' : 'team1';
    const updated = setServerTeam(match, nextServer);
    setMatch(updated);
    offlineSync.saveMatchLocally(updated);
  };

  // Save Player Names & Server
  const handleSavePlayers = (
    t1Name: string,
    t2Name: string,
    serverTeam: 'team1' | 'team2',
    t1Players?: string[],
    t2Players?: string[]
  ) => {
    let updated = updatePlayerNames(match, t1Name, t2Name, t1Players, t2Players);
    updated = setServerTeam(updated, serverTeam);
    setMatch(updated);
    offlineSync.saveMatchLocally(updated);
    saveMatchToFirestore(updated, user?.uid);
    if (activeSheetId) {
      updateMatchSummarySheet(activeSheetId, updated).catch(console.error);
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
    const newMatch = createInitialMatch(settings, t1Name, t2Name, t1DoublesPartner, t2DoublesPartner);
    newMatch.currentServerTeam = initialServer;
    setMatch(newMatch);
    offlineSync.saveMatchLocally(newMatch);
    saveMatchToFirestore(newMatch, user?.uid);
    setIsPostMatchOpen(false);
    if (activeSheetId) {
      updateMatchSummarySheet(activeSheetId, newMatch).catch(console.error);
    }
  };

  // Reset Match to 0-0 with Current Players & Rules
  const handleResetCurrentMatch = () => {
    const t1Name = match.team1.players[0]?.name || match.team1.name;
    const t2Name = match.team2.players[0]?.name || match.team2.name;
    const t1Partner = match.team1.players[1]?.name;
    const t2Partner = match.team2.players[1]?.name;
    const newMatch = createInitialMatch(match.settings, t1Name, t2Name, t1Partner, t2Partner);
    newMatch.currentServerTeam = match.currentServerTeam;
    setMatch(newMatch);
    offlineSync.saveMatchLocally(newMatch);
    saveMatchToFirestore(newMatch, user?.uid);
    setIsPostMatchOpen(false);
    if (activeSheetId) {
      updateMatchSummarySheet(activeSheetId, newMatch).catch(console.error);
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
        onOpenDetailModal={(mode, team) => setDetailModal({ isOpen: true, mode, team })}
        onOpenEditPlayers={() => setIsEditPlayersOpen(true)}
        onUndo={handleUndo}
        onFirstServeFault={handleFirstServeFault}
        onSecondServeFault={handleSecondServeFault}
        onResetServeFault={handleResetServeFault}
        onToggleServer={handleToggleServer}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
        onOpenInfographic={() => setIsInfographicOpen(true)}
        onOpenSheetsSync={() => setIsSheetsModalOpen(true)}
        onOpenSettings={() => setIsSetupOpen(true)}
        onResetMatch={handleResetCurrentMatch}
        isOnline={isOnline}
        activeSheetUrl={activeSheetUrl}
        pendingSyncCount={pendingSyncCount}
      />

      {/* Floating Offline Notification */}
      {!isOnline && (
        <div className="fixed bottom-2 left-2 z-40 flex items-center gap-2 bg-amber-500/90 text-slate-950 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-lg backdrop-blur-xs">
          <WifiOff className="w-3.5 h-3.5" />
          <span>โหมดออฟไลน์: แต้มจะซิงค์ขึ้นชีตอัตโนมัติเมื่อต่อเน็ต</span>
        </div>
      )}

      {/* Detailed Point Breakdown Modal (Winner or Error) */}
      {detailModal.isOpen && (
        <DetailPointModal
          isOpen={detailModal.isOpen}
          onClose={() => setDetailModal((prev) => ({ ...prev, isOpen: false }))}
          mode={detailModal.mode}
          initialTeam={detailModal.team}
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

      {/* Infographic Generator Modal */}
      {isInfographicOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3">
          <div className="w-full max-w-2xl h-[92vh]">
            <MatchInfographicCard match={match} onClose={() => setIsInfographicOpen(false)} />
          </div>
        </div>
      )}

      {/* Analytics & Form Visualizer Modal */}
      {isAnalyticsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3">
          <div className="w-full max-w-2xl h-[92vh]">
            <AnalyticsView match={match} onClose={() => setIsAnalyticsOpen(false)} />
          </div>
        </div>
      )}

      {/* Google Sheets Sync Modal */}
      {isSheetsModalOpen && (
        <SheetsSyncModal
          isOpen={isSheetsModalOpen}
          onClose={() => setIsSheetsModalOpen(false)}
          user={user}
          onUserChange={setUser}
          activeSheetUrl={activeSheetUrl}
          activeSheetId={activeSheetId}
          onSheetCreated={(id, url) => {
            setActiveSheetId(id);
            setActiveSheetUrl(url);
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
