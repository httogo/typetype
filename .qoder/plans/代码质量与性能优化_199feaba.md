# 代码质量与性能优化

## Task 1: 提取公共 Hook — 消除 Practice/Reading 重复代码

Practice.tsx（835行）和 Reading.tsx（479行）中 wordGroups、phraseMarkedIndices、wordFrequencies、wordAnnotations 的计算逻辑几乎完全重复。

- 创建 `src/hooks/useTextRendering.ts`，提取共享逻辑：
  - `wordGroups` 分组计算
  - `phraseMarkedIndices` 词组匹配
  - `correlativeMap` 关联词组
  - `wordFrequencies` 词频查询
  - `wordAnnotations` 注解生成
  - 窗口化渲染参数计算（windowStart/windowEnd）
- Practice.tsx 和 Reading.tsx 改为调用该 Hook
- 预计减少 300+ 行重复代码

## Task 2: 拆分 Practice.tsx 子组件

将 Practice.tsx 从 835 行拆分为更小的模块：

- `src/components/PracticeStatsBar.tsx` — 顶部统计信息条（WPM、准确率、进度、计时）
- `src/components/PracticeResultCard.tsx` — 练习完成结果卡片（已有函数，提取为独立组件）
- Practice.tsx 保留核心打字逻辑和文本渲染，目标降至 400 行以内

## Task 3: 优化状态管理

Practice.tsx 中 11+ 个 useState 容易导致状态不一致：

- 将 `isFinished`、`manuallyFinished`、`resultSaved` 等关联状态合并为 useReducer 状态机
- 清理不必要的中间状态
- 简化 useEffect 依赖链

## Task 4: React.memo 优化子组件

减少不必要的重渲染：

- `WordTooltip` 添加 React.memo
- `KeyboardHeatmap` 添加 React.memo
- Task 2 中提取的 `PracticeStatsBar`、`PracticeResultCard` 添加 React.memo
- Layout 设置面板提取为独立 memo 组件

## Task 5: 词典服务优化

- 提取重复的词形还原逻辑为私有方法 `stem()`
- `getFrequency` 复用 `lookup` 结果
- 添加词频查询缓存 `Map<string, FreqLevel>`
- 预计减少 100+ 行重复代码

## Task 6: XSS 安全加固

- 安装 DOMPurify
- 对网页提取的标题和内容进行 sanitize
- 对 WordTooltip 中外部词典数据进行转义

## Task 7: TypeScript strict 模式

- 更新 tsconfig.app.json 开启 `strict: true`、`noImplicitReturns`、`noFallthroughCasesInSwitch`
- 修复由此产生的类型错误
- 补充缺失的类型定义（ExtractResponse、ErrorMap 等）

## Task 8: 存储服务原子化

- `saveResult` + `updateErrorStats` 合并为原子操作
- 添加 try-catch 防止中途中断导致数据不一致

## Task 9: 验证与提交

- `npx tsc --noEmit` 通过
- `npm run build` 通过
- 功能回归验证（打字、阅读、文章导入、历史记录）
- 整理提交并推送