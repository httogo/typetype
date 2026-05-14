/**
 * 从 ECDICT SQLite 数据库生成精简的英中词典 JSON 文件
 * 
 * 数据来源：https://github.com/skywind3000/ECDICT
 * 输出：public/dict.json
 * 
 * 用法：node scripts/generate-dict.js [path-to-stardict.db]
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// 数据库路径（默认 /tmp/ecdict/stardict.db）
const dbPath = process.argv[2] || '/tmp/ecdict/stardict.db';
const outputPath = path.resolve(__dirname, '..', 'public', 'dict.json');

if (!fs.existsSync(dbPath)) {
  console.error(`错误：数据库文件不存在: ${dbPath}`);
  console.error('请先下载 ECDICT 的 sqlite 数据库：');
  console.error('  wget "https://github.com/skywind3000/ECDICT/releases/download/1.0.28/ecdict-sqlite-28.zip" -O /tmp/ecdict-sqlite.zip');
  console.error('  unzip /tmp/ecdict-sqlite.zip -d /tmp/ecdict/');
  process.exit(1);
}

console.log(`读取数据库: ${dbPath}`);
const db = new Database(dbPath, { readonly: true });

// 查询高频词条：
// 1. BNC 或 FRQ 排名 <= 20000（即高频词）
// 2. 或者带有考试标签 (cet4/cet6/gk/zk/ky/toefl/ielts)
// 3. translation 非空
// 4. 单词只包含字母（排除含数字、特殊符号的词条）
const query = `
  SELECT word, phonetic, translation, tag, bnc, frq
  FROM stardict
  WHERE translation IS NOT NULL
    AND translation != ''
    AND word GLOB '[a-zA-Z]*'
    AND length(word) > 1
    AND word NOT LIKE '% %'
    AND (
      (bnc > 0 AND bnc <= 20000)
      OR (frq > 0 AND frq <= 20000)
      OR tag LIKE '%cet4%'
      OR tag LIKE '%cet6%'
      OR tag LIKE '%gk%'
      OR tag LIKE '%zk%'
      OR tag LIKE '%ky%'
      OR tag LIKE '%toefl%'
      OR tag LIKE '%ielts%'
    )
  ORDER BY COALESCE(NULLIF(bnc, 0), 99999) ASC
`;

console.log('正在查询高频词条...');
const rows = db.prepare(query).all();
console.log(`查询到 ${rows.length} 条记录`);

// 处理并去重
const dict = {};
let skipped = 0;

for (const row of rows) {
  const word = row.word.toLowerCase().trim();
  
  // 跳过已存在的词（保留频率更高的）
  if (dict[word]) {
    skipped++;
    continue;
  }

  // 处理音标
  let phonetic = row.phonetic || '';
  phonetic = phonetic.trim();
  // 如果音标不带斜杠，加上
  if (phonetic && !phonetic.startsWith('/') && !phonetic.startsWith('[')) {
    phonetic = `/${phonetic}/`;
  }

  // 处理翻译：取第一行或前 60 字符
  let translation = row.translation.trim();
  // 去掉 \r\n 开头的换行
  translation = translation.replace(/^\s+/, '');
  // 取第一行（可能有多个释义用 \n 分隔）
  const lines = translation.split(/\r?\n/).filter(l => l.trim());
  if (lines.length > 0) {
    translation = lines[0].trim();
  }
  // 截断到 60 字符
  if (translation.length > 60) {
    translation = translation.substring(0, 57) + '...';
  }

  // 构建词条
  const entry = { t: translation };
  if (phonetic) {
    entry.p = phonetic;
  }

  dict[word] = entry;
}

db.close();

const totalEntries = Object.keys(dict).length;
console.log(`去重后保留 ${totalEntries} 条（跳过 ${skipped} 条重复）`);

// 如果超过 20000 条，按 BNC 频率排序截断
if (totalEntries > 22000) {
  console.log(`词条数超过 22000，进行截断...`);
  // 已经按 BNC 排序查询，所以前面的词频率更高
  const keys = Object.keys(dict).slice(0, 20000);
  const trimmedDict = {};
  for (const key of keys) {
    trimmedDict[key] = dict[key];
  }
  console.log(`截断后保留 ${Object.keys(trimmedDict).length} 条`);
  
  // 写入文件
  const json = JSON.stringify(trimmedDict);
  fs.writeFileSync(outputPath, json, 'utf-8');
} else {
  // 写入文件（紧凑格式）
  const json = JSON.stringify(dict);
  fs.writeFileSync(outputPath, json, 'utf-8');
}

// 统计输出
const stats = fs.statSync(outputPath);
const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
const finalDict = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
const finalCount = Object.keys(finalDict).length;

console.log(`\n✅ 生成成功！`);
console.log(`   输出文件: ${outputPath}`);
console.log(`   词条数量: ${finalCount}`);
console.log(`   文件大小: ${sizeMB} MB`);

// 打印前 10 个词条示例
console.log(`\n📖 示例词条：`);
const sampleKeys = Object.keys(finalDict).slice(0, 10);
for (const key of sampleKeys) {
  const entry = finalDict[key];
  console.log(`   ${key}: ${entry.p || ''} ${entry.t}`);
}
