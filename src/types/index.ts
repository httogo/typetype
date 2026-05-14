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
  // 词频相关设置
  freqHighlight: { h: boolean; m: boolean; l: boolean }; // 各频率是否着色标记
  freqAnnotation: { h: boolean; m: boolean; l: boolean }; // 各频率是否显示注释
  freqDimLow: boolean; // 是否灰色标记低频词(8001-20000)
  freqDimUltraLow: boolean; // 是否灰色标记超低频词(20000以外)
}

export type FreqLevel = 'h' | 'm' | 'l' | 'u';

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

export interface Chapter {
  id: string;       // 章节唯一 ID（如 "ch-1"）
  title: string;    // 章节标题
  content: string;  // 章节内容
}

export interface SavedArticle {
  id: string;         // 唯一 ID（时间戳或 UUID）
  title: string;      // 文章标题
  content: string;    // 文章正文（保留完整内容，向后兼容）
  source?: string;    // 来源（URL 或 "手动输入"）
  createdAt: number;  // 保存时间戳
  chapters?: Chapter[]; // 章节列表（可选）
}

export interface ExtractResponse {
  title: string;
  content: string;
  length: number;
}
