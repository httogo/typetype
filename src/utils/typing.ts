// 计算 WPM (每分钟单词数，标准：5个字符=1个单词)
export function calculateWPM(correctChars: number, elapsedSeconds: number): number {
  if (elapsedSeconds <= 0) return 0;
  const minutes = elapsedSeconds / 60;
  const words = correctChars / 5;
  return Math.round(words / minutes);
}

// 计算准确率
export function calculateAccuracy(correctChars: number, totalTyped: number): number {
  if (totalTyped <= 0) return 0;
  return Math.round((correctChars / totalTyped) * 100);
}

// 生成唯一 ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}
