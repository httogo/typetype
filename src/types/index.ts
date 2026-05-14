export interface TypingResult {
  id: string;
  timestamp: number;
  wpm: number;
  accuracy: number;
  duration: number; // 秒
  totalChars: number;
  correctChars: number;
  incorrectChars: number;
  mode: 'timed' | 'full';
  timedDuration?: number; // 限时模式的时长
  textPreview: string; // 文本前30字符预览
  errorMap?: Record<string, { errors: number; total: number }>;
}

export interface TextItem {
  id: string;
  content: string;
  difficulty: 'easy' | 'medium' | 'hard';
  title: string;
}

export interface Settings {
  fontSize: number; // px
  showLiveStats: boolean;
  theme: 'light' | 'dark';
  difficulty: 'easy' | 'medium' | 'hard';
  mode: PracticeMode;
  timedDuration: TimedDuration;
  soundEnabled: boolean; // 是否启用音效
  soundVolume: number; // 音量 0-1
  phraseHighlight: boolean; // 是否高亮显示词组
}

export type CharStatus = 'correct' | 'incorrect' | 'current' | 'pending';

export interface CharState {
  char: string;
  status: CharStatus;
  typed?: string; // 用户实际输入的字符
}

export type PracticeMode = 'timed' | 'full';
export type TimedDuration = 15 | 30 | 60 | 120;

export interface TypingState {
  chars: CharState[];
  currentIndex: number;
  isStarted: boolean;
  isFinished: boolean;
  startTime: number | null;
  endTime: number | null;
  correctCount: number;
  incorrectCount: number;
  totalTyped: number;
}
