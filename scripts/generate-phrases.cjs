/**
 * 生成高频英语词组数据并合并到 dict.json
 *
 * 用法：node scripts/generate-phrases.cjs
 */

const path = require('path');
const fs = require('fs');

const outputPath = path.resolve(__dirname, '..', 'public', 'dict.json');

// ========== 词组数据 ==========

const phraseData = {
  // === 1.1 动词短语 (Phrasal Verbs) ===

  // get 系列
  'get up': '起床；起立',
  'get out': '出去；离开',
  'get over': '克服；恢复',
  'get along': '相处；进展',
  'get rid of': '摆脱；除去',
  'get through': '通过；完成',
  'get off': '下车；离开',
  'get into': '进入；陷入',
  'get back': '回来；取回',
  'get away': '逃离；离开',

  // take 系列
  'take off': '起飞；脱下；成功',
  'take over': '接管；接收',
  'take up': '占据；开始从事',
  'take care of': '照顾；处理',
  'take part in': '参加；参与',
  'take place': '发生；举行',
  'take advantage of': '利用',
  'take into account': '考虑到',
  'take on': '承担；呈现',
  'take out': '取出；带出去',

  // come 系列
  'come up': '出现；被提及',
  'come across': '偶遇；被理解为',
  'come up with': '想出；提出',
  'come out': '出来；出版；结果是',
  'come from': '来自；源于',
  'come back': '回来；恢复',
  'come down': '下来；降低',
  'come along': '一起来；进展',

  // go 系列
  'go on': '继续；发生',
  'go through': '经历；仔细检查',
  'go ahead': '前进；开始吧',
  'go over': '检查；复习',
  'go back': '回去；追溯',
  'go out': '出去；熄灭',
  'go off': '爆炸；响起；变质',
  'go up': '上升；建起',

  // turn 系列
  'turn out': '结果是；出席',
  'turn off': '关闭',
  'turn on': '打开；开启',
  'turn up': '出现；调大',
  'turn down': '拒绝；调小',
  'turn into': '变成',
  'turn around': '转身；好转',
  'turn over': '翻转；移交',

  // look 系列
  'look for': '寻找',
  'look up': '查阅；好转',
  'look after': '照顾',
  'look forward to': '期待',
  'look into': '调查',
  'look at': '看；考虑',
  'look like': '看起来像',
  'look out': '小心；注意',

  // make 系列
  'make up': '组成；编造；化妆',
  'make sure': '确保',
  'make sense': '有道理',
  'make use of': '利用',
  'make a difference': '有影响；起作用',
  'make up for': '弥补',
  'make it': '成功；赶上',
  'make progress': '取得进步',

  // put 系列
  'put up with': '忍受',
  'put off': '推迟',
  'put on': '穿上；上演',
  'put forward': '提出',
  'put out': '扑灭；发布',
  'put together': '组合；拼凑',
  'put away': '收好；储存',
  'put down': '放下；记下',

  // break 系列
  'break down': '分解；故障；崩溃',
  'break out': '爆发',
  'break through': '突破',
  'break up': '分手；拆散',
  'break in': '闯入；插嘴',
  'break off': '折断；中断',

  // give 系列
  'give up': '放弃',
  'give in': '屈服；让步',
  'give away': '赠送；泄露',
  'give rise to': '引起；导致',
  'give off': '发出；释放',
  'give out': '分发；用完',

  // set 系列
  'set up': '建立；设置',
  'set off': '出发；引发',
  'set out': '出发；着手',
  'set back': '推迟；阻碍',

  // carry 系列
  'carry out': '执行；实施',
  'carry on': '继续',

  // work 系列
  'work out': '解决；锻炼；计算',
  'work on': '从事；致力于',

  // bring 系列
  'bring up': '提出；抚养',
  'bring about': '导致；引起',
  'bring out': '推出；使显现',

  // keep 系列
  'keep up': '跟上；保持',
  'keep on': '继续',
  'keep up with': '跟上',

  // pick 系列
  'pick up': '拿起；学会；接人',
  'pick out': '挑选',

  // run 系列
  'run out': '用完',
  'run into': '偶遇；遇到(问题)',

  // hold 系列
  'hold on': '等一下；坚持',
  'hold up': '举起；阻碍',

  // figure/find 系列
  'figure out': '弄明白',
  'find out': '发现；查明',

  // point/cut 系列
  'point out': '指出',
  'cut off': '切断',
  'cut down': '减少',

  // stand/end 系列
  'stand for': '代表',
  'stand out': '突出',
  'end up': '最终成为',

  // === 1.2 固定搭配 (Collocations) ===

  // 动词+名词
  'pay attention': '注意',
  'take action': '采取行动',
  'do harm': '造成伤害',
  'have access to': '有权使用',
  'reach a conclusion': '得出结论',
  'meet the needs': '满足需求',
  'raise awareness': '提高意识',
  'face challenges': '面对挑战',
  'solve problems': '解决问题',
  'achieve goals': '实现目标',
  'gain experience': '获得经验',
  'play a role': '发挥作用',
  'draw attention': '引起注意',
  'make a decision': '做出决定',
  'take responsibility': '承担责任',

  // 形容词+名词
  'common sense': '常识',
  'public opinion': '公众舆论',
  'social media': '社交媒体',
  'key factor': '关键因素',
  'strong evidence': '有力证据',
  'significant impact': '重大影响',
  'major role': '主要角色',
  'wide range': '广泛范围',
  'growing concern': '日益关注',
  'natural resources': '自然资源',
  'mental health': '心理健康',
  'climate change': '气候变化',
  'global warming': '全球变暖',
  'artificial intelligence': '人工智能',
  'side effect': '副作用',
  'long term': '长期',

  // === 1.3 连接/过渡词组 ===

  'in addition': '此外',
  'on the other hand': '另一方面',
  'as a result': '因此',
  'in terms of': '就...而言',
  'for example': '例如',
  'in fact': '事实上',
  'at least': '至少',
  'so far': '到目前为止',
  'by the way': '顺便说一下',
  'as well as': '以及',
  'rather than': '而不是',
  'regardless of': '不管',
  'in spite of': '尽管',
  'as long as': '只要',
  'in order to': '为了',
  'due to': '由于',
  'according to': '根据',
  'based on': '基于',
  'in general': '总的来说',
  'for instance': '例如',
  'on the contrary': '相反',
  'in other words': '换句话说',
  'as a matter of fact': '事实上',
  'in the meantime': '与此同时',
  'on behalf of': '代表',
  'with regard to': '关于',
  'in comparison with': '与...相比',
  'in contrast to': '与...形成对比',
  'to some extent': '在某种程度上',
  'first of all': '首先',
  'last but not least': '最后同样重要的',
  'after all': '毕竟',
  'above all': '最重要的是',
  'all in all': '总而言之',
  'as far as': '就...而言',
  'from time to time': '偶尔',
  'once in a while': '偶尔',
  'more or less': '或多或少',
  'sooner or later': '迟早',
  'little by little': '逐渐地',

  // === 1.4 日常高频表达 ===

  'a lot of': '许多',
  'a couple of': '几个',
  'kind of': '有点',
  'sort of': '有点',
  'right now': '现在',
  'all the time': '一直',
  'no longer': '不再',
  'at the same time': '同时',
  'no matter': '无论',
  'not only': '不仅',
  'each other': '彼此',
  'up to': '取决于；多达',
  'used to': '过去常常',
  'had better': '最好',
  'would rather': '宁愿',
  'a number of': '一些；若干',
  'the number of': '...的数量',
  'a great deal of': '大量',
  'in the end': '最终',
  'by the time': '到...时候',
  'on time': '准时',
  'in time': '及时',
  'at first': '起初',
  'at last': '终于',
  'by chance': '偶然',
  'on purpose': '故意',
  'in advance': '提前',
  'in charge of': '负责',
  'in favor of': '赞成',
  'in case of': '万一',
  'on average': '平均',
  'for good': '永远',
  'for free': '免费',
  'at once': '立刻',
  'all of a sudden': '突然',
  "on one's own": '独自',
  'by oneself': '独自',
  'in person': '亲自',
  'in public': '公开地',
  'in private': '私下地',
  'on the whole': '总的来说',
  'to be honest': '说实话',
  'as usual': '像往常一样',
  'so called': '所谓的',

  // === 2.1 更多动词短语 (think/talk/ask 系列) ===
  'think about': '考虑',
  'think of': '想到；认为',
  'think over': '仔细考虑',
  'talk about': '谈论',
  'talk to': '与...交谈',
  'ask for': '请求；要求',
  'ask about': '询问',

  // try/start/stop 系列
  'try on': '试穿',
  'try out': '试用',
  'start over': '重新开始',
  'stop by': '顺便拜访',

  // hang/check/fill 系列
  'hang out': '闲逛',
  'hang on': '等一下；坚持',
  'hang up': '挂断电话',
  'check in': '登记入住',
  'check out': '退房；查看',
  'fill in': '填写',
  'fill out': '填写（表格）',
  'fill up': '装满',

  // pass/pull/show/shut/slow/speed/throw/watch/wear/wind 系列
  'pass away': '去世',
  'pass by': '经过',
  'pass on': '传递',
  'pull over': '靠边停车',
  'pull out': '退出；拔出',
  'show up': '出现',
  'show off': '炫耀',
  'shut down': '关闭',
  'shut up': '闭嘴',
  'slow down': '减速',
  'speed up': '加速',
  'throw away': '扔掉',
  'throw up': '呕吐',
  'watch out': '小心',
  'wear out': '磨损；精疲力竭',
  'wind up': '结束；上发条',

  // call/drop/fall/leave/let/live/log/move/pay/rule/sign/sort/stay/step/sum/switch/take/tell/use/wait/wake/write 系列
  'call back': '回电话',
  'call off': '取消',
  'call for': '要求；需要',
  'drop off': '放下；送人',
  'drop out': '退出',
  'fall apart': '崩溃；散架',
  'fall behind': '落后',
  'fall down': '跌倒',
  'fall for': '上当；爱上',
  'leave out': '遗漏',
  'let down': '让人失望',
  'let go': '放手',
  'live up to': '达到；不辜负',
  'log in': '登录',
  'log out': '登出',
  'move on': '继续前进',
  'move in': '搬入',
  'move out': '搬出',
  'pay off': '还清；得到回报',
  'pay for': '为...付出代价',
  'rule out': '排除',
  'sign up': '注册；报名',
  'sign in': '登录',
  'sort out': '整理；解决',
  'stay up': '熬夜',
  'step back': '退后；反思',
  'step up': '加紧；挺身而出',
  'sum up': '总结',
  'switch off': '关闭',
  'switch on': '打开',
  'tell apart': '区分',
  'use up': '用完',
  'wait for': '等待',
  'wake up': '醒来',
  'write down': '写下',

  // === 2.2 学术/职场搭配 ===
  'carry out research': '进行研究',
  'conduct a study': '进行研究',
  'draw a conclusion': '得出结论',
  'meet a deadline': '赶上截止日期',
  'solve a problem': '解决问题',
  'raise a question': '提出问题',
  'follow instructions': '遵循指示',
  'break the rules': '违反规则',
  'catch attention': '引起注意',
  'hold a meeting': '举行会议',
  'deliver a speech': '发表演讲',
  'submit a report': '提交报告',
  'launch a project': '启动项目',
  'reach an agreement': '达成协议',
  'keep a record': '保持记录',
  'bear in mind': '记住',
  'come to terms with': '接受；妥协',
  'pave the way': '铺平道路',
  'shed light on': '阐明',
  'take into consideration': '考虑到',
  'bring to light': '揭露',
  'have an impact on': '对...有影响',
  'put into practice': '付诸实践',
  'take for granted': '想当然',
  "do one's best": '尽力',
  'make an effort': '努力',
  'keep in touch': '保持联系',
  'lose track of': '忘记；失去线索',
  'run out of': '用完',
  'give a hand': '帮忙',
  'have no idea': '不知道',
  'make room for': '为...腾出空间',
  'keep an eye on': '注意；看守',
  'take a break': '休息一下',
  'take a look': '看一看',
  'take notes': '记笔记',
  'take turns': '轮流',
  'make friends': '交朋友',
  'lose weight': '减肥',
  'gain weight': '增重',
  'save time': '节省时间',
  'waste time': '浪费时间',
  'spend time': '花时间',
  'kill time': '消磨时间',

  // === 2.3 日常口语词组 ===
  'at the moment': '此刻',
  'at the end': '最后',
  'in the beginning': '起初',
  'in the middle': '在中间',
  'on the way': '在路上',
  'all over': '到处',
  'over and over': '反复地',
  'one by one': '一个接一个',
  'day by day': '一天天地',
  'step by step': '一步一步地',
  'side by side': '并肩',
  'face to face': '面对面',
  'hand in hand': '手牵手',
  'back and forth': '来回地',
  'up and down': '上上下下',
  'now and then': '偶尔',
  'here and there': '到处',
  'more and more': '越来越多',
  'again and again': '反复地',
  'time after time': '一次又一次',
  'as soon as': '一...就',
  'even though': '即使',
  'in case': '万一',
  'so that': '以便',
  'such as': '例如',
  'that is': '即；也就是说',
  'and so on': '等等',
  'or so': '大约',
  'if only': '要是...就好了',
  'what if': '如果...怎么办',
  'how come': '怎么回事',
  'no wonder': '难怪',
  'by far': '到目前为止；远远地',
  'for sure': '确定地',
  'for real': '真的',
  'on top of': '除...之外',
  'in the long run': '从长远来看',
  'in the short run': '短期内',
  'at all costs': '不惜一切代价',
  'at any rate': '无论如何',
  'by all means': '当然可以',
  'by no means': '绝不',
  'in no way': '决不',
  'under no circumstances': '在任何情况下都不',
  'on second thought': '再想想',
  'for the time being': '暂时',
  'once and for all': '一劳永逸',
  'all at once': '突然；同时',
  'out of the question': '不可能',
  'out of date': '过时的',
  'up to date': '最新的',
  'in touch with': '与...联系',
  'out of touch': '失去联系',
  'in common': '共同',
  'in particular': '特别是',
  'in return': '作为回报',
  'in vain': '徒劳',
  'in theory': '理论上',
  'in practice': '实际上',
  'at risk': '处于危险中',
  'at stake': '处于危险中；利害攸关',
  'at ease': '自在地',
  'at random': '随机地',
  'by accident': '偶然地',
  'by heart': '凭记忆',
  'by mistake': '错误地',
  'on duty': '值班',
  'off duty': '下班',
  'in progress': '进行中',
  'in demand': '有需求',
  'in trouble': '有麻烦',
  'out of order': '出故障',
  'out of control': '失控',
  'under pressure': '在压力下',
  'under construction': '在建设中',
  'beyond doubt': '毫无疑问',
  'without doubt': '毫无疑问',
  'in the mood': '有心情',
  'on the spot': '当场',
  'behind the scenes': '幕后',
  'ahead of time': '提前',
  'from scratch': '从头开始',
  'in a hurry': '匆忙',
  'in a row': '连续地',
  'in the dark': '不知情',
  'on the go': '忙碌中',
  'off the top of my head': '不假思索地',
  'to the point': '中肯的；切题的',

  // === 2.4 科技/互联网相关词组 ===
  'sign up for': '注册',
  'opt in': '选择参加',
  'opt out': '选择退出',
  'back up': '备份',
  'plug in': '插入',
  'boot up': '启动',
  'scroll down': '向下滚动',
  'scroll up': '向上滚动',
  'zoom in': '放大',
  'zoom out': '缩小',
  'click on': '点击',
  'drag and drop': '拖放',
  'pop up': '弹出',
  'open source': '开源',
  'real time': '实时',
  'machine learning': '机器学习',
  'deep learning': '深度学习',
  'big data': '大数据',
  'cloud computing': '云计算',
  'user interface': '用户界面',
  'user experience': '用户体验',
  'data analysis': '数据分析',
  'version control': '版本控制',
  'pull request': '拉取请求',
  'code review': '代码审查',
  'best practice': '最佳实践',
  'use case': '用例',
  'end user': '最终用户',
  'front end': '前端',
  'back end': '后端',
  'full stack': '全栈',
  'single page': '单页',
  'cross platform': '跨平台',
  'high performance': '高性能',
  'plug and play': '即插即用',
  'cut and paste': '剪切粘贴',
  'trial and error': '反复试验',

  // === 2.5 补充动词短语 ===

  // burn/blow/bump/calm/clear/close/count/cross/cut/die/do/dress/eat/fix/fly
  'burn down': '烧毁',
  'burn out': '精疲力竭；燃尽',
  'blow up': '爆炸；放大',
  'blow out': '吹灭',
  'bump into': '撞到；偶遇',
  'calm down': '平静下来',
  'clear up': '清理；放晴',
  'close down': '关闭；停业',
  'count on': '依赖；指望',
  'cross out': '划掉',
  'cut back': '削减',
  'die out': '灭绝；消失',
  'do without': '没有...也行',
  'do away with': '废除；去掉',
  'dress up': '穿着正式；打扮',
  'eat out': '外出就餐',
  'fix up': '修理；安排',
  'fly away': '飞走',

  // get 补充
  'get along with': '与...相处',
  'get around': '四处走动；规避',
  'get by': '勉强度日',
  'get in': '进入；到达',
  'get on': '上车；进展',
  'get together': '聚会',
  'get used to': '习惯于',

  // give/go 补充
  'give back': '归还',
  'go along with': '同意；配合',
  'go for': '争取；喜欢',
  'go with': '搭配；伴随',
  'go without': '没有...也行',
  'go down': '下降；沉没',

  // hand/head/help/iron/join/jump/keep/kick/knock/lay/lean
  'hand in': '交上；提交',
  'hand out': '分发',
  'hand over': '移交',
  'head for': '朝...方向去',
  'help out': '帮忙',
  'iron out': '解决；消除',
  'join in': '参加',
  'jump in': '加入；插话',
  'keep away': '远离',
  'keep back': '隐瞒；留下',
  'keep out': '不让进入',
  'kick off': '开始；开球',
  'knock down': '击倒；拆除',
  'knock out': '击晕；淘汰',
  'lay off': '解雇；停止',
  'lean on': '依靠',

  // line/live/lock/look/mark/mess/mix/narrow
  'line up': '排队',
  'live on': '以...为生；继续活着',
  'lock up': '锁上；监禁',
  'look down on': '看不起',
  'look up to': '尊敬',
  'mark down': '降价；记下',
  'mess up': '搞砷',
  'mix up': '混淆；弄混',
  'narrow down': '缩小范围',

  // open/own/phase/pile/pin/point/print/push/put
  'open up': '打开；开始营业',
  'own up': '承认',
  'phase out': '逐步淘汰',
  'pile up': '堆积',
  'pin down': '确定；压住',
  'point to': '指向；表明',
  'print out': '打印出',
  'push ahead': '推进',
  'put aside': '放到一边；储蓄',

  // ring/rip/round/run/rush/save/sell/send
  'ring up': '打电话',
  'rip off': '敲竹杠；撇下',
  'round up': '聚集；四舍五入',
  'run away': '逃跑',
  'run over': '碾过；快速查看',
  'rush into': '仓促做决定',
  'save up': '储蓄',
  'sell out': '卖光',
  'send back': '退回',
  'send off': '送别；寄出',

  // settle/shake/shop/sink/sit/slip/snap/speak/split/stick/stir
  'settle down': '定居；平静下来',
  'shake off': '摆脱',
  'shop around': '货比三家',
  'sink in': '完全理解',
  'sit down': '坐下',
  'slip away': '悄悄离开',
  'snap up': '抢购',
  'speak up': '大声说；发言',
  'split up': '分手；分裂',
  'stick to': '坚持',
  'stick out': '伸出；突出',
  'stir up': '激起；搞动',

  // take/tear/think/touch/track/trade/turn/warm/wipe/work/wrap/zone
  'take after': '长得像；性格像',
  'take apart': '拆开',
  'take back': '收回；退货',
  'tear down': '拆除；拆毁',
  'tear up': '撕碎',
  'think back': '回想',
  'touch on': '提及；涉及',
  'track down': '追踪到',
  'trade in': '折价贴换',
  'turn away': '拒绝；转身',
  'warm up': '热身；加热',
  'wipe out': '彻底消灭',
  'work off': '通过运动消除',
  'wrap up': '完成；包裹',
  'zone out': '走神；发呆',

  // === 2.6 补充学术/商务词组 ===
  'set a goal': '设定目标',
  'take a risk': '冒险',
  'take a chance': '碰运气',
  'change direction': '改变方向',
  'gain knowledge': '获取知识',
  'share ideas': '分享想法',
  'exchange views': '交换观点',
  'express opinions': '表达意见',
  'build confidence': '建立信心',
  'develop skills': '发展技能',
  'improve performance': '提高表现',
  'reduce costs': '降低成本',
  'increase profits': '增加利润',
  'expand business': '扩展业务',
  'manage time': '管理时间',
  'set priorities': '设定优先级',
  'provide feedback': '提供反馈',
  'seek advice': '寻求建议',
  'close a deal': '达成交易',
  'strike a balance': '取得平衡',
  'broaden horizons': '开阔视野',
  'overcome obstacles': '克服障礙',
  'seize the opportunity': '抓住机会',
  'weigh the pros and cons': '权衡利弊',

  // === 2.7 补充日常/情感词组 ===
  'get married': '结婚',
  'fall asleep': '入睡',
  'catch a cold': '感冒',
  'feel like': '想要；感觉像',
  'look forward': '期待',
  'come true': '实现',
  'grow up': '长大',
  'give birth': '生孩子',
  'pass the exam': '通过考试',
  'fail the exam': '考试不及格',
  'miss the bus': '错过公交车',
  'catch the bus': '赶上公交车',
  'do homework': '做作业',
  'go shopping': '去购物',
  'go swimming': '去游泳',
  'have lunch': '吃午饭',
  'have dinner': '吃晚饭',
  'take a shower': '洗澡',
  'get dressed': '穿衣服',
  'brush teeth': '刷牙',
  'do the dishes': '洗碗',
  'take a walk': '散步',
  'take a nap': '小睡',
  'stay home': '待在家',
  'come home': '回家',
  'go to bed': '上床睡觉',
  'wake up early': '早起',
  'stay in shape': '保持身材',
  'work hard': '努力工作',
  'take it easy': '放轻松',
  'cheer up': '振作起来',
  'give up hope': '放弃希望',
  'change mind': '改变主意',
  'make up mind': '下定决心',
  'keep calm': '保持冷静',
  'break the ice': '打破僵局',
  'hit the road': '出发',
  'go the extra mile': '格外努力',
  'bite the bullet': '硬着头皮做',
  'spill the beans': '泄露秘密',
  'a piece of cake': '小菜一碟',
  'once in a lifetime': '一生一次',
  'the bottom line': '关键是；底线',
  'a blessing in disguise': '塞翁失马',
  'actions speak louder': '行动胜于言语',
  'better late than never': '迟做总比不做好',
  'easier said than done': '说起来容易做起来难',
};

// ========== 关联词组数据（非连续词组） ==========

let correlativePhrases = [
  { pattern: ['as', '*', 'as'], t: '和...一样（as + adj/adv + as）', maxGap: 3 },
  { pattern: ['not', 'only', '*', 'but', 'also'], t: '不仅...而且', maxGap: 5 },
  { pattern: ['either', '*', 'or'], t: '要么...要么', maxGap: 5 },
  { pattern: ['neither', '*', 'nor'], t: '既不...也不', maxGap: 5 },
  { pattern: ['both', '*', 'and'], t: '两者都', maxGap: 5 },
  { pattern: ['whether', '*', 'or'], t: '是否...还是', maxGap: 8 },
  { pattern: ['so', '*', 'that'], t: '如此...以至于', maxGap: 5 },
  { pattern: ['such', '*', 'that'], t: '如此...以至于', maxGap: 5 },
  { pattern: ['no', 'sooner', '*', 'than'], t: '一...就', maxGap: 5 },
  { pattern: ['hardly', '*', 'when'], t: '刚...就', maxGap: 5 },
  { pattern: ['not', '*', 'but'], t: '不是...而是', maxGap: 3 },
  { pattern: ['from', '*', 'to'], t: '从...到', maxGap: 3 },
  { pattern: ['between', '*', 'and'], t: '在...之间', maxGap: 5 },
];

// ========== 处理逻辑 ==========

// 读取 exam-phrases.json
const examPhrasesPath = path.join(__dirname, 'exam-phrases.json');
let examData = { consecutive: [], correlative: [] };
if (fs.existsSync(examPhrasesPath)) {
  try {
    examData = JSON.parse(fs.readFileSync(examPhrasesPath, 'utf-8'));
    console.log(`已读取 exam-phrases.json：`);
    console.log(`  连续词组: ${examData.consecutive.length} 条`);
    console.log(`  关联词组: ${examData.correlative.length} 条`);
  } catch (err) {
    console.error('读取 exam-phrases.json 失败:', err.message);
  }
}

// 读取现有 dict.json
let existingDict = {};
if (fs.existsSync(outputPath)) {
  try {
    existingDict = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    console.log(`\n已读取现有词典，包含 ${Object.keys(existingDict).length} 条词条`);
  } catch (err) {
    console.error('读取现有词典失败，将创建新文件:', err.message);
  }
}

// 处理内置词组数据
const phrases = {};
const keys = Object.keys(phraseData);
let duplicates = 0;
const seen = new Set();

for (const key of keys) {
  const normalizedKey = key.toLowerCase().trim();
  if (seen.has(normalizedKey)) {
    duplicates++;
    continue;
  }
  seen.add(normalizedKey);
  phrases[normalizedKey] = {
    p: '',
    t: phraseData[key],
  };
}

console.log(`\n内置词组统计：`);
console.log(`  总条目: ${keys.length}`);
console.log(`  去重后: ${Object.keys(phrases).length}`);
console.log(`  重复项: ${duplicates}`);

// 合并 exam-phrases.json 中的连续词组（去重）
let examConsecutiveAdded = 0;
for (const item of examData.consecutive) {
  const key = item.phrase.toLowerCase().trim();
  if (!seen.has(key)) {
    seen.add(key);
    phrases[key] = { p: '', t: item.t };
    examConsecutiveAdded++;
  }
}

console.log(`\n考试词组合并（连续词组）：`);
console.log(`  exam-phrases 连续词组总数: ${examData.consecutive.length}`);
console.log(`  新增（去重后）: ${examConsecutiveAdded}`);
console.log(`  已存在跳过: ${examData.consecutive.length - examConsecutiveAdded}`);
console.log(`  合并后连续词组总数: ${Object.keys(phrases).length}`);

// 合并 exam-phrases.json 中的关联词组（基于 pattern 去重）
const existingCorrelativeKeys = new Set(
  correlativePhrases.map(item => item.pattern.join('|'))
);
let examCorrelativeAdded = 0;
for (const item of examData.correlative) {
  const patternKey = item.pattern.join('|');
  if (!existingCorrelativeKeys.has(patternKey)) {
    existingCorrelativeKeys.add(patternKey);
    correlativePhrases.push(item);
    examCorrelativeAdded++;
  }
}

console.log(`\n考试词组合并（关联词组）：`);
console.log(`  exam-phrases 关联词组总数: ${examData.correlative.length}`);
console.log(`  新增（去重后）: ${examCorrelativeAdded}`);
console.log(`  已存在跳过: ${examData.correlative.length - examCorrelativeAdded}`);
console.log(`  合并后关联词组模式总数: ${correlativePhrases.length}`);

// 合并到现有词典（先添加关联词组特殊 key）
const merged = { __correlative__: correlativePhrases, ...existingDict, ...phrases };

const newCount = Object.keys(merged).length - Object.keys(existingDict).length;
console.log(`\n总合并统计：`);
console.log(`  原词典: ${Object.keys(existingDict).length} 条`);
console.log(`  新增词组: ${newCount} 条`);
console.log(`  覆盖已有: ${Object.keys(phrases).length - newCount} 条`);
console.log(`  合并后总计: ${Object.keys(merged).length} 条（含 __correlative__ 字段）`);
console.log(`  总连续词组数: ${Object.keys(phrases).length}`);
console.log(`  总关联词组模式数: ${correlativePhrases.length}`);

// 写入文件
const json = JSON.stringify(merged);
fs.writeFileSync(outputPath, json, 'utf-8');

const stats = fs.statSync(outputPath);
const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
const sizeKB = (stats.size / 1024).toFixed(2);

console.log(`\n✅ 生成成功！`);
console.log(`   输出文件: ${outputPath}`);
console.log(`   文件大小: ${sizeKB} KB (${sizeMB} MB)`);
console.log(`   dict.json 总词条数: ${Object.keys(merged).length}`);

// 打印一些词组示例
console.log(`\n📖 词组示例：`);
const sampleKeys = Object.keys(phrases).slice(0, 10);
for (const key of sampleKeys) {
  console.log(`   "${key}": ${phrases[key].t}`);
}
