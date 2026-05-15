/**
 * 拆分词典：将 dict.json 拆分为 dict-common.json（高频+中频词）和保留完整 dict.json
 * dict-common.json 包含频率为 h 或 m 的词条 + __correlative__ 关联词组模式
 * 用于首屏快速加载，完整词典延迟加载
 */
const fs = require('fs');
const path = require('path');

const dictPath = path.resolve(__dirname, '../public/dict.json');
const commonPath = path.resolve(__dirname, '../public/dict-common.json');

const raw = fs.readFileSync(dictPath, 'utf8');
const dict = JSON.parse(raw);

// 提取关联词组模式（需要在常用词典中也包含）
const correlative = dict['__correlative__'] || [];

const common = {};
let commonCount = 0;

// 保留 __correlative__ 模式到常用词典
if (correlative.length > 0) {
  common['__correlative__'] = correlative;
}

// 提取高频和中频词
for (const [word, entry] of Object.entries(dict)) {
  if (word === '__correlative__') continue;
  if (entry.f === 'h' || entry.f === 'm') {
    common[word] = entry;
    commonCount++;
  }
}

const commonJson = JSON.stringify(common);
fs.writeFileSync(commonPath, commonJson);

const commonSizeKB = (commonJson.length / 1024).toFixed(0);
const fullSizeKB = (raw.length / 1024).toFixed(0);

console.log(`✓ dict-common.json: ${commonCount} entries, ${commonSizeKB}KB`);
console.log(`  (includes ${correlative.length} correlative patterns)`);
console.log(`  Full dict.json: ${Object.keys(dict).length - 1} entries, ${fullSizeKB}KB`);
