# TypeType - 打字练习

提升你的英文打字速度和准确率。

导航结构：练习 | 阅读 | 导入文章 | 历史记录

## 在线体验

https://typetype-theta.vercel.app/

## 功能特性

### 核心练习
- 极简打字界面，专注于文本输入
- 实时 WPM（每分钟词数）和准确率统计
- 全文模式 / 限时模式
- 简单 / 中等 / 困难三级难度
- 3秒无操作智能暂停计时
- Tab 重新开始 | Enter 下一篇 | Esc 结束

### 词典与学习
- 点击单词查看音标和中文释义（2万词条离线词典）
- 1000+ 高频词组自动标记（覆盖四六级/考研/雅思/托福/GRE/高考）
- 33种关联词组模式识别（as...as, not only...but also 等）
- 词组提示开关可配置

### 词表管理
- 自定义词表：创建多个词表分类管理生词
- 高亮样式：为不同词表配置独立的高亮颜色和样式
- 词形匹配：支持词形变化的智能匹配（复数、时态等）
- 快速操作：左键添加默认词表，右键选择其他词表，−号移除

### 练习数据
- 历史记录与 WPM 趋势图
- 错误按键热力图（QWERTY 键盘可视化）
- 数据导出（JSON/CSV）/ 导入

### 阅读模式
- 独立阅读页面，纯阅读用途（禁用打字输入）
- 词频三级着色：高频（1–3000）/ 中频（3001–8000）/ 低频（8001–20000）
- 低频词 / 超低频词灰色淡化显示
- 词组下划线标记
- 行内括号注释
- 点击查词

### 导入文章
- 手动输入练习文本
- **通过网址自动提取网页正文**（使用 Mozilla Readability 算法）
- 文本集导入导出（JSON 格式）

### 个性化
- 明暗主题切换（平滑过渡）
- 可选打字音效（机械键盘风格）
- 字体大小调节
- PWA 支持（可安装、离线使用）
- 多标签页同步（跨标签页实时同步设置和词表数据）

### 稳定性与体验
- 错误边界：组件级错误捕获，防止单一组件崩溃影响全局
- 网络请求重试：自动重试失败请求，提升弱网环境体验

## 技术栈

- React 19 + TypeScript
- Vite
- Tailwind CSS
- React Router
- Recharts（趋势图）
- Web Audio API（音效）
- vite-plugin-pwa（PWA）
- ECDICT（离线词典数据源）
- Mozilla Readability（网页正文提取）
- Vercel Serverless Functions（生产环境 API）

## 本地开发

```bash
# 安装依赖
npm install

# 开发模式（包含 API 功能）
npm run dev

# 构建
npm run build

# 预览构建结果
npm run preview
```

所有功能（包括网页正文提取）在本地开发模式下均可正常使用。

## 词典数据

词典基于 [ECDICT](https://github.com/skywind3000/ECDICT) 开源数据，包含 2 万高频英文单词及 1000+ 词组。

重新生成词典：
```bash
# 需要先下载 ECDICT SQLite 数据库到 /tmp
node scripts/generate-dict.cjs
node scripts/generate-phrases.cjs
```

## 许可证

MIT
