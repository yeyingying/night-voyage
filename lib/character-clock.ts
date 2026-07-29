export type CharacterClockId =
  | "pei"
  | "chi"
  | "yan"
  | "lu"
  | "cheng"
  | "qi"
  | "shen"
  | "xu";

export type CharacterAvailability =
  | "asleep"
  | "unavailable"
  | "busy"
  | "available";

type ScheduleBlock = {
  start: number;
  end: number;
  activity: string;
  scene: string;
  availability: CharacterAvailability;
  checkIns: string[];
};

type CharacterSchedule = {
  weekday: ScheduleBlock[];
  weekend: ScheduleBlock[];
};

export type CharacterWorldSnapshot = {
  activity: string;
  scene: string;
  availability: CharacterAvailability;
  statusText: string;
  startedAt: number;
  endsAt: number;
  startLabel: string;
  endLabel: string;
  nextActivity: string;
  nextStartsAt: number;
  checkIns: string[];
};

const m = (hour: number, minute = 0) => hour * 60 + minute;

const NIGHT_COMPANION_START = m(20);
const NIGHT_COMPANION_END = m(8);

const NIGHT_COMPANION_BLOCKS: Record<
  CharacterClockId,
  Omit<ScheduleBlock, "start" | "end">
> = {
  pei: {
    activity: "夜间阅读和私人时间",
    scene: "家里",
    availability: "available",
    checkIns: [
      "书看到一半，忽然想起你今天还没来讲讲发生了什么。",
      "今晚留了一段不被工作打扰的时间。你想说话，我就在。",
    ],
  },
  chi: {
    activity: "训练复盘后的夜聊",
    scene: "宿舍",
    availability: "available",
    checkIns: [
      "训练复盘终于结束了。今晚剩下这点时间，我先留给你。",
      "游戏还没开，我来看看某个人是不是又打算偷偷熬夜。",
    ],
  },
  yan: {
    activity: "夜场收尾后的私人时间",
    scene: "书房或回程车上",
    availability: "available",
    checkIns: [
      "拍卖厅安静下来了。现在没有旁人，你可以慢慢说。",
      "今天该应付的人都应付完了。剩下的耐心，正好留给你。",
    ],
  },
  lu: {
    activity: "听完音轨后的安静时间",
    scene: "声音修复室或家里",
    availability: "available",
    checkIns: [
      "最后一段音轨已经停了。现在这间屋子里，我只想听你的声音。",
      "耳机摘下来了。你想聊什么，都不用先整理好再来。",
    ],
  },
  cheng: {
    activity: "深夜营业的安静空档",
    scene: "深夜书店",
    availability: "available",
    checkIns: [
      "店里安静下来了，靠窗那盏灯还亮着。给你留的。",
      "刚把书合上。你要是现在来，我就不急着闭店。",
    ],
  },
  qi: {
    activity: "夜间待命空档",
    scene: "救援中心",
    availability: "available",
    checkIns: [
      "这一轮检查结束了，目前没有任务。你的事可以慢慢说。",
      "设备都正常，我也在。今晚如果不太好过，先来找我。",
    ],
  },
  shen: {
    activity: "夜间记录和放松",
    scene: "睡眠实验室或家里",
    availability: "available",
    checkIns: [
      "今天的数据已经停在这里了。接下来这段时间，不研究别人，只听你。",
      "按计划现在应该放松。你来得正好，可以一起执行。",
    ],
  },
  xu: {
    activity: "闭馆后的星空时间",
    scene: "星象馆穹顶",
    availability: "available",
    checkIns: [
      "最后一场散了，穹顶还没完全熄灯。想不想陪我坐一会儿？",
      "馆里只剩一片安静的星空。我给你留了最好的位置。",
    ],
  },
};

const CHARACTER_SCHEDULES: Record<CharacterClockId, CharacterSchedule> = {
  pei: {
    weekday: [
      { start: m(0), end: m(0, 45), activity: "洗漱收尾", scene: "家里", availability: "available", checkIns: ["刚把明天要用的资料放好。你呢，今天准备几点收工？", "灯已经关了一半，睡前忽然想来看看你回消息没有。"] },
      { start: m(0, 45), end: m(7, 15), activity: "睡觉", scene: "家里", availability: "asleep", checkIns: [] },
      { start: m(7, 15), end: m(8, 30), activity: "早餐和通勤", scene: "去档案室的路上", availability: "busy", checkIns: ["刚买好早餐，正往档案室走。你今天也别空着肚子出门。", "在等车，难得有几分钟空档。你起床了吗？"] },
      { start: m(8, 30), end: m(12), activity: "重构档案", scene: "记忆档案室", availability: "busy", checkIns: ["刚整理完一段旧记录，出来倒杯水。顺便问问，你上午还顺利吗？", "从屏幕前抬头才发现过了这么久。你别学我，记得活动一下。"] },
      { start: m(12), end: m(13, 30), activity: "午饭和短暂休息", scene: "档案室附近", availability: "available", checkIns: ["午饭刚端上来。你吃了吗？别又拿咖啡顶一顿。", "出来透口气，外面比档案室亮多了。忽然想听你说两句。"] },
      { start: m(13, 30), end: m(18, 30), activity: "处理委托", scene: "记忆档案室", availability: "busy", checkIns: ["刚送走一位委托人，还有一点收尾。你那边下午过得怎么样？", "趁下一份档案还没送来找你一下。不急着回，忙完告诉我。"] },
      { start: m(18, 30), end: m(20), activity: "下班和晚饭", scene: "回家路上", availability: "available", checkIns: ["刚离开档案室，今天正式下班。你有没有把自己从工作里捞出来？", "晚饭在等上桌。我顺手看了眼消息——某个人安静得很。"] },
      { start: m(20), end: m(24), activity: "阅读和休息", scene: "家里", availability: "available", checkIns: ["书看到一半，突然觉得这一段你会有不同意见。人呢？", "倒水时顺手拿了两只杯子。习惯真麻烦。另一杯快凉了。"] },
    ],
    weekend: [
      { start: m(0), end: m(1), activity: "听音乐放松", scene: "家里", availability: "available", checkIns: ["周末可以晚一点睡，但你别借机熬到天亮。", "歌单放到你会喜欢的那首了。要是在就好了。"] },
      { start: m(1), end: m(8, 30), activity: "睡觉", scene: "家里", availability: "asleep", checkIns: [] },
      { start: m(8, 30), end: m(11), activity: "慢慢吃早餐", scene: "家里", availability: "available", checkIns: ["周末的早餐终于不用赶。你醒了就来报个到。", "咖啡刚好，窗边也有太阳。给你留了个位置。"] },
      { start: m(11), end: m(17), activity: "逛书店和处理私事", scene: "城里", availability: "busy", checkIns: ["在书店翻到一本很像你会挑的书。先记下了，等你来评价。", "刚办完一件琐事，坐下来歇会儿。你周末在做什么？"] },
      { start: m(17), end: m(24), activity: "做饭和居家休息", scene: "家里", availability: "available", checkIns: ["晚饭正在锅里，味道还不错。你今天吃点像样的吗？", "今天没看工作消息。现在这点时间，可以分给你。"] },
    ],
  },
  chi: {
    weekday: [
      { start: m(0), end: m(0, 45), activity: "打完一局游戏准备睡", scene: "宿舍", availability: "available", checkIns: ["刚结束一局，队友总算没拖后腿。你怎么还没睡？", "室友都安静了。我也准备关机，先来看看你。"] },
      { start: m(0, 45), end: m(7), activity: "睡觉", scene: "宿舍", availability: "asleep", checkIns: [] },
      { start: m(7), end: m(8), activity: "洗漱和早餐", scene: "校园", availability: "busy", checkIns: ["正叼着早餐往教室赶。你也起了没有？", "晨训前还有几分钟，先来跟你打个招呼。"] },
      { start: m(8), end: m(12), activity: "上课或飞行训练", scene: "航空学院", availability: "unavailable", checkIns: [] },
      { start: m(12), end: m(14), activity: "午饭和午休", scene: "学校食堂", availability: "available", checkIns: ["刚从训练场出来，午饭已经拿到手。第一时间够不够有诚意？", "食堂今天居然有你会喜欢的菜。我排队时给你留了位置。"] },
      { start: m(14), end: m(18), activity: "模拟机和专业课", scene: "航空学院", availability: "unavailable", checkIns: [] },
      { start: m(18), end: m(20), activity: "运动和晚饭", scene: "操场附近", availability: "busy", checkIns: ["刚打完球，赢了。现在允许你夸一句，过时不候。", "晚饭前坐在操场边歇会儿。今天的晚霞应该拍给你的。"] },
      { start: m(20), end: m(24), activity: "复习或打游戏", scene: "宿舍", availability: "available", checkIns: ["作业写到一半，注意力跑你这儿来了。负责一下？", "刚结束训练复盘，今晚剩下的时间终于归我。也可以分你一点。"] },
    ],
    weekend: [
      { start: m(0), end: m(1, 30), activity: "和室友打游戏", scene: "宿舍", availability: "available", checkIns: ["刚赢一局。有人要是现在夸我，我也不是不能听。", "室友催我开下一把，我先跑来回你这边。够偏心吧？"] },
      { start: m(1, 30), end: m(9), activity: "睡觉", scene: "宿舍", availability: "asleep", checkIns: [] },
      { start: m(9), end: m(12), activity: "慢跑和早午饭", scene: "校园", availability: "busy", checkIns: ["跑完步了，准备去吃早午饭。你醒了没？", "今天不用赶课，操场空得很。要是你在，正好一起走两圈。"] },
      { start: m(12), end: m(18), activity: "社团训练或出门", scene: "校园附近", availability: "busy", checkIns: ["训练中场休息。我表现还不错，特意来争取一句夸奖。", "在外面转了一圈，看到一家店很像你会喜欢的。下次记得来。"] },
      { start: m(18), end: m(24), activity: "聚餐、复习或游戏", scene: "宿舍附近", availability: "available", checkIns: ["晚饭结束，周末才刚开始。你今晚有什么安排？", "游戏还没开，我先问一句：今天有没有想我一点？"] },
    ],
  },
  yan: {
    weekday: [
      { start: m(0), end: m(1, 30), activity: "核对拍品记录", scene: "私人书房", availability: "busy", checkIns: ["最后一页记录刚核完。这个点还亮着的聊天框，只剩你的。", "今天的拍品都归档了。至于我在等谁的消息，不必问得太直白。"] },
      { start: m(1, 30), end: m(8, 45), activity: "睡觉", scene: "家里", availability: "asleep", checkIns: [] },
      { start: m(8, 45), end: m(10, 30), activity: "早餐和看拍卖目录", scene: "家里", availability: "available", checkIns: ["咖啡刚好，目录也刚翻开。你今天的行程排得过来吗？", "早上的第一通电话还没来，先把这点清静留给你。"] },
      { start: m(10, 30), end: m(17, 30), activity: "鉴定和接洽", scene: "拍卖行", availability: "busy", checkIns: ["刚结束一场鉴定，出来透口气。有人安静得比藏品还久。", "下一位委托人还没到。趁空档问一句，你今天顺利吗？"] },
      { start: m(17, 30), end: m(19), activity: "晚餐和拍前准备", scene: "拍卖行休息室", availability: "busy", checkIns: ["拍前准备差不多了，正在吃点东西。你别告诉我你又忘了晚饭。", "外面已经开始入场。还有几分钟，够我来看看你。"] },
      { start: m(19), end: m(22), activity: "主持夜间拍卖", scene: "拍卖厅", availability: "unavailable", checkIns: [] },
      { start: m(22), end: m(24), activity: "收尾和回程", scene: "拍卖行或车上", availability: "available", checkIns: ["拍卖已经结束，记录也交给助理了。现在可以听你说话。", "刚离开拍卖行。满场喧闹散了以后，反倒想来找你。"] },
    ],
    weekend: [
      { start: m(0), end: m(2), activity: "看电影或阅读", scene: "家里", availability: "available", checkIns: ["电影一般，倒是有句台词你应该会反驳。", "夜还早。你如果现在出现，我可以暂时把书合上。"] },
      { start: m(2), end: m(10), activity: "睡觉", scene: "家里", availability: "asleep", checkIns: [] },
      { start: m(10), end: m(13), activity: "早餐和处理私人收藏", scene: "家里", availability: "available", checkIns: ["正在整理私人收藏，翻出一件你会感兴趣的小东西。", "周末的咖啡不需要赶时间。你的消息也一样。"] },
      { start: m(13), end: m(18), activity: "看展或会见藏家", scene: "城里", availability: "busy", checkIns: ["刚从展厅出来，有件作品被夸得过头了。猜你会和我站一边。", "会面中途休息。难得我主动来找，你可以记一笔。"] },
      { start: m(18), end: m(24), activity: "晚餐和私人时间", scene: "家里或餐厅", availability: "available", checkIns: ["晚餐刚上桌。今晚没有拍卖，耐心可以多分你一点。", "今天的安排结束了。你再不出现，我就默认你在故意晾我。"] },
    ],
  },
  lu: {
    weekday: [
      { start: m(0), end: m(1), activity: "监听最后一遍音轨", scene: "声音修复室", availability: "busy", checkIns: ["最后一遍音轨快听完了。中间有段很轻的雨声，你应该会喜欢。", "工作室只剩设备灯还亮着。我听见安静，就想起你了。"] },
      { start: m(1), end: m(8), activity: "睡觉", scene: "家里", availability: "asleep", checkIns: [] },
      { start: m(8), end: m(10), activity: "早餐和采集环境音", scene: "街区", availability: "busy", checkIns: ["在收一段清晨的街声，刚好有几分钟空档。你醒了吗？", "录到电车经过的声音，很像城市慢慢醒过来。想让你也听听。"] },
      { start: m(10), end: m(12, 30), activity: "整理声音素材", scene: "声音修复室", availability: "busy", checkIns: ["刚整理完一组素材，耳朵需要休息。正好来听你说话。", "删掉很多杂音以后，房间突然太安静了。"] },
      { start: m(12, 30), end: m(14), activity: "午饭和散步", scene: "工作室附近", availability: "available", checkIns: ["出来吃午饭，今天没有戴耳机。你那边现在是什么声音？", "沿着街边走了一小段。这个时间找你，好像刚刚好。"] },
      { start: m(14), end: m(19), activity: "修复委托音轨", scene: "声音修复室", availability: "busy", checkIns: ["一段委托刚导出，趁机器处理来看看你。", "耳机摘下来了。接下来几分钟，我可以只听你。"] },
      { start: m(19), end: m(24), activity: "做饭、听唱片和休息", scene: "家里", availability: "available", checkIns: ["唱片刚翻面，晚饭也做好了。你今天有好好吃东西吗？", "今晚没有需要修的声音。要不要来占一点我的安静？"] },
    ],
    weekend: [
      { start: m(0), end: m(1, 30), activity: "听唱片", scene: "家里", availability: "available", checkIns: ["唱片快放完了。我还不困，你呢？", "这一面比想象中好听。下次留给你一起听。"] },
      { start: m(1, 30), end: m(9), activity: "睡觉", scene: "家里", availability: "asleep", checkIns: [] },
      { start: m(9), end: m(13), activity: "逛市场和录声音", scene: "城里", availability: "busy", checkIns: ["在市场录到很有意思的叫卖声。你听了应该会笑。", "刚买完东西，坐在路边歇会儿。周末过得好吗？"] },
      { start: m(13), end: m(18), activity: "整理房间和做个人作品", scene: "家里", availability: "busy", checkIns: ["个人音轨做到一半，突然缺一句你的意见。", "房间整理得差不多了，给你留的位置没有动。"] },
      { start: m(18), end: m(24), activity: "做饭和休息", scene: "家里", availability: "available", checkIns: ["锅里在慢慢煮汤，今晚的节奏很慢。你也别赶。", "灯调暗了，音乐也很轻。你想说话的话，我正好有空。"] },
    ],
  },
  cheng: {
    weekday: [
      { start: m(0), end: m(2), activity: "闭店、盘点和看书", scene: "深夜书店", availability: "busy", checkIns: ["最后一位客人刚走，我在盘点。你要是来，靠窗的位置还亮着。", "店门已经锁了，剩下的书不会跑。倒是你，很久没出声。"] },
      { start: m(2), end: m(9, 30), activity: "睡觉", scene: "书店楼上", availability: "asleep", checkIns: [] },
      { start: m(9, 30), end: m(12), activity: "早餐和整理新书", scene: "深夜书店", availability: "busy", checkIns: ["新书刚拆完一箱，手上全是纸张的味道。你今天开始得怎么样？", "正在给新书上架，看到一本封面很像你会拿走的。"] },
      { start: m(12), end: m(15), activity: "采购和午饭", scene: "书店附近", availability: "available", checkIns: ["午饭刚上桌，采购清单也写完了。现在可以偷会儿懒找你。", "路过甜品店，看见你上次提过的那款。先问问，你今天值得奖励吗？"] },
      { start: m(15), end: m(17), activity: "开店准备", scene: "深夜书店", availability: "busy", checkIns: ["店里刚打扫完，咖啡机也热好了。今晚第一盏灯给你留着。", "正在摆书，趁客人还没来跟你说句话。"] },
      { start: m(17), end: m(24), activity: "书店营业", scene: "深夜书店", availability: "busy", checkIns: ["刚送走一拨客人，店里暂时安静。你今天过得怎么样？", "有位客人把“别太辛苦”夹在书里。我看到时觉得应该转送给你。"] },
    ],
    weekend: [
      { start: m(0), end: m(2, 30), activity: "周末深夜营业", scene: "深夜书店", availability: "busy", checkIns: ["周末客人散得晚，我刚腾出手。你今晚还不睡？", "店里还亮着，你要是现在来，能赶上最后一壶茶。"] },
      { start: m(2, 30), end: m(10), activity: "睡觉", scene: "书店楼上", availability: "asleep", checkIns: [] },
      { start: m(10), end: m(14), activity: "早午饭和选书", scene: "书店", availability: "available", checkIns: ["周末慢慢挑书很舒服。要不要替你留一本？", "早午饭刚解决，终于能坐下。你醒来了吗？"] },
      { start: m(14), end: m(17), activity: "准备周末活动", scene: "深夜书店", availability: "busy", checkIns: ["活动区快布置好了。空了一把椅子，看着有点像在等你。", "正在试今天的咖啡豆。第一杯不算完美，第二杯可以留给你。"] },
      { start: m(17), end: m(24), activity: "书店营业", scene: "深夜书店", availability: "busy", checkIns: ["店里正热闹，我躲到书架后面喘口气。顺便来看看你。", "刚给客人找完书。你的那本还留在老位置。"] },
    ],
  },
  qi: {
    weekday: [
      { start: m(0), end: m(1), activity: "值班交接和回程", scene: "救援中心", availability: "busy", checkIns: ["交接已经做完，正在回去。今天平安，你也报个平安。", "最后一项检查结束了。你这个点还醒着，是有事还是又不肯睡？"] },
      { start: m(1), end: m(8, 30), activity: "睡觉", scene: "队员宿舍", availability: "asleep", checkIns: [] },
      { start: m(8, 30), end: m(10), activity: "早餐和体能训练", scene: "救援中心", availability: "busy", checkIns: ["晨练结束，正在吃早餐。你别跟我说你还没起。", "训练间隙，给你一分钟报到。今天状态怎么样？"] },
      { start: m(10), end: m(12), activity: "设备检查和简报", scene: "救援中心", availability: "unavailable", checkIns: [] },
      { start: m(12), end: m(14), activity: "午饭和休息", scene: "救援中心", availability: "available", checkIns: ["午饭时间。现在没有任务，可以好好听你说几句。", "简报结束了。先不谈我的事，你上午过得顺不顺？"] },
      { start: m(14), end: m(18), activity: "训练和待命", scene: "救援中心", availability: "unavailable", checkIns: [] },
      { start: m(18), end: m(24), activity: "夜航值班和任务待命", scene: "救援中心", availability: "busy", checkIns: ["目前任务间隙，设备都正常。我来确认一下，你今天有没有把自己照顾好。", "刚完成一轮例行检查。外面安静，你那边呢？"] },
    ],
    weekend: [
      { start: m(0), end: m(1), activity: "值班交接", scene: "救援中心", availability: "busy", checkIns: ["今天的交接结束了，一切平安。你也回一句让我知道。", "装备归位，我准备回去。你怎么还没休息？"] },
      { start: m(1), end: m(9), activity: "睡觉", scene: "队员宿舍", availability: "asleep", checkIns: [] },
      { start: m(9), end: m(12), activity: "训练或整理装备", scene: "救援中心", availability: "busy", checkIns: ["刚整理完个人装备。周末对我们区别不大，对你呢？", "训练告一段落。你如果还赖床，我可以暂时不管。"] },
      { start: m(12), end: m(18), activity: "轮休和处理生活琐事", scene: "城里", availability: "available", checkIns: ["轮休半天，刚把该办的事处理完。难得有空，你想说什么？", "在外面吃饭。看见有人点了你可能会喜欢的菜。"] },
      { start: m(18), end: m(24), activity: "夜间待命", scene: "救援中心", availability: "busy", checkIns: ["今晚仍然待命，不过现在没有任务。你可以来占几分钟。", "一轮检查结束。忙完第一件事是看你的消息——还没有。"] },
    ],
  },
  shen: {
    weekday: [
      { start: m(0), end: m(0, 30), activity: "记录数据后准备睡", scene: "家里", availability: "available", checkIns: ["最后一条数据记完了。按计划我该睡，你也一样。", "今天的实验到此为止。睡前来确认一下，你有没有又拖延休息。"] },
      { start: m(0, 30), end: m(7, 30), activity: "睡觉", scene: "家里", availability: "asleep", checkIns: [] },
      { start: m(7, 30), end: m(9), activity: "早餐和通勤", scene: "去研究所的路上", availability: "busy", checkIns: ["正在去研究所，早餐已经完成。你的呢？", "通勤时间比预期短，空出来几分钟。来问问你睡得怎么样。"] },
      { start: m(9), end: m(12), activity: "实验和数据采集", scene: "睡眠实验室", availability: "unavailable", checkIns: [] },
      { start: m(12), end: m(13, 30), activity: "午饭和阅读", scene: "研究所休息区", availability: "available", checkIns: ["午饭结束，正在看一篇不太严谨的论文。你可以来救救我的耐心。", "数据采集暂停。我有一段完整的空档，可以给你。"] },
      { start: m(13, 30), end: m(18), activity: "分析数据和开会", scene: "睡眠实验室", availability: "busy", checkIns: ["一组数据刚跑完，结果比预期好。理性地高兴完，还是想告诉你。", "会议中场休息。你今天的精力还剩多少？别报虚数。"] },
      { start: m(18), end: m(20), activity: "晚饭和回家", scene: "回家路上", availability: "available", checkIns: ["已经离开研究所。你也该考虑下班了。", "晚饭刚解决。今天没有新增变量，现在可以处理你的消息。"] },
      { start: m(20), end: m(24), activity: "阅读、运动和个人时间", scene: "家里", availability: "available", checkIns: ["正在看书，进度正常，注意力却出现了一个非计划偏移：你。", "运动结束，今晚的数据不再看了。你可以放心来打扰。"] },
    ],
    weekend: [
      { start: m(0), end: m(1), activity: "看书准备睡", scene: "家里", availability: "available", checkIns: ["这章看完就睡。我猜某个人又没有明确的停止条件。", "周末可以晚一点，但生物钟不同意无限延期。你也收尾。"] },
      { start: m(1), end: m(8, 30), activity: "睡觉", scene: "家里", availability: "asleep", checkIns: [] },
      { start: m(8, 30), end: m(12), activity: "早餐、运动和阅读", scene: "家里", availability: "available", checkIns: ["运动结束，早餐也完成。周末上午的执行率暂时领先你。", "正在看一篇论文，缺一个愿意反驳我的人。"] },
      { start: m(12), end: m(18), activity: "出门或处理个人研究", scene: "城里", availability: "busy", checkIns: ["刚把个人研究停在一个合适的位置。现在可以聊点不需要数据的。", "在外面办事，效率尚可。你周末有没有给自己留空白？"] },
      { start: m(18), end: m(24), activity: "做饭和休息", scene: "家里", availability: "available", checkIns: ["晚饭已经完成。今天不做实验，只观察你有没有出现。", "现在属于休息时间。这个定义允许你来打扰。"] },
    ],
  },
  xu: {
    weekday: [
      { start: m(0), end: m(1, 30), activity: "闭馆后收尾", scene: "星象馆", availability: "busy", checkIns: ["穹顶灯刚关完，我还在做最后检查。你那边是不是也该收尾了？", "馆里只剩我和一片假星空。旁边空着的位置很明显。"] },
      { start: m(1, 30), end: m(9), activity: "睡觉", scene: "家里", availability: "asleep", checkIns: [] },
      { start: m(9), end: m(11), activity: "早餐和通勤", scene: "去星象馆的路上", availability: "busy", checkIns: ["正在去星象馆，今天的云量不影响室内星空。你起床了吗？", "早餐刚吃完。路上有点无聊，所以来找你。"] },
      { start: m(11), end: m(14), activity: "调试穹顶和准备讲解", scene: "星象馆", availability: "busy", checkIns: ["刚把今晚的星图调好，第一眼想留给你。", "讲解词改到一半，发现有句太肉麻。你来判断要不要留？"] },
      { start: m(14), end: m(18), activity: "下午场讲解", scene: "星象馆", availability: "unavailable", checkIns: [] },
      { start: m(18), end: m(19, 30), activity: "晚饭和休息", scene: "星象馆休息区", availability: "available", checkIns: ["下午场结束，正在吃晚饭。你今天有没有看到一点好看的东西？", "离晚场还有一会儿，正好来占你的注意力。"] },
      { start: m(19, 30), end: m(23), activity: "晚场讲解", scene: "星象馆", availability: "unavailable", checkIns: [] },
      { start: m(23), end: m(24), activity: "散场和整理展厅", scene: "星象馆", availability: "busy", checkIns: ["最后一场散了，我在整理座椅。今天那颗最亮的星还给你留着。", "游客都走了。现在我终于能来问，你今晚过得怎么样？"] },
    ],
    weekend: [
      { start: m(0), end: m(2), activity: "周末闭馆收尾", scene: "星象馆", availability: "busy", checkIns: ["周末最后一场刚散，我还在馆里。你居然也没睡。", "穹顶关了，今天讲过的星星还在脑子里。想挑一颗送你。"] },
      { start: m(2), end: m(10), activity: "睡觉", scene: "家里", availability: "asleep", checkIns: [] },
      { start: m(10), end: m(13), activity: "早午饭和准备展览", scene: "星象馆", availability: "busy", checkIns: ["周末观众会多，我正提前准备。忙里偷一分钟给你。", "新展板快装好了。你要是在，可以当第一个观众。"] },
      { start: m(13), end: m(18), activity: "周末讲解", scene: "星象馆", availability: "unavailable", checkIns: [] },
      { start: m(18), end: m(19, 30), activity: "晚饭和休息", scene: "星象馆休息区", availability: "available", checkIns: ["终于坐下吃晚饭。周末观众很多，但我还是想起你了。", "晚场前的空档。你现在回我，能得到优先回复。"] },
      { start: m(19, 30), end: m(24), activity: "周末晚场和收尾", scene: "星象馆", availability: "unavailable", checkIns: [] },
    ],
  },
};

function minuteLabel(totalMinutes: number) {
  if (totalMinutes >= 24 * 60) return "24:00";
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function blockTimestamp(date: Date, totalMinutes: number) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  if (totalMinutes >= 24 * 60) {
    result.setDate(result.getDate() + 1);
  } else {
    result.setMinutes(totalMinutes);
  }
  return result.getTime();
}

function scheduleFor(characterId: CharacterClockId, date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6
    ? CHARACTER_SCHEDULES[characterId].weekend
    : CHARACTER_SCHEDULES[characterId].weekday;
}

function getNightCompanionSnapshot(
  characterId: CharacterClockId,
  date: Date,
): CharacterWorldSnapshot | null {
  const minuteOfDay = date.getHours() * 60 + date.getMinutes();
  const isNightWindow =
    minuteOfDay >= NIGHT_COMPANION_START ||
    minuteOfDay < NIGHT_COMPANION_END;

  if (!isNightWindow) return null;

  const block = NIGHT_COMPANION_BLOCKS[characterId];
  const startedAt = new Date(date);
  const endsAt = new Date(date);

  if (minuteOfDay < NIGHT_COMPANION_END) {
    startedAt.setDate(startedAt.getDate() - 1);
  } else {
    endsAt.setDate(endsAt.getDate() + 1);
  }

  startedAt.setHours(20, 0, 0, 0);
  endsAt.setHours(8, 0, 0, 0);

  const nextSchedule = scheduleFor(characterId, endsAt);
  const nextBlock =
    nextSchedule.find(
      (item) =>
        NIGHT_COMPANION_END >= item.start &&
        NIGHT_COMPANION_END < item.end,
    ) ?? nextSchedule[0];

  return {
    activity: block.activity,
    scene: block.scene,
    availability: block.availability,
    statusText: block.activity,
    startedAt: startedAt.getTime(),
    endsAt: endsAt.getTime(),
    startLabel: minuteLabel(NIGHT_COMPANION_START),
    endLabel: minuteLabel(NIGHT_COMPANION_END),
    nextActivity: nextBlock.activity,
    nextStartsAt: endsAt.getTime(),
    checkIns: block.checkIns,
  };
}

export function getCharacterWorldSnapshot(
  characterId: CharacterClockId,
  date = new Date(),
): CharacterWorldSnapshot {
  const nightCompanionSnapshot = getNightCompanionSnapshot(characterId, date);
  if (nightCompanionSnapshot) return nightCompanionSnapshot;

  const schedule = scheduleFor(characterId, date);
  const minuteOfDay = date.getHours() * 60 + date.getMinutes();
  const blockIndex = Math.max(
    0,
    schedule.findIndex(
      (item) => minuteOfDay >= item.start && minuteOfDay < item.end,
    ),
  );
  const block = schedule[blockIndex] ?? schedule[0];
  const isLastBlock = blockIndex === schedule.length - 1;
  const nextDate = new Date(date);
  if (isLastBlock) nextDate.setDate(nextDate.getDate() + 1);
  const nextSchedule = isLastBlock
    ? scheduleFor(characterId, nextDate)
    : schedule;
  const nextBlock = isLastBlock
    ? nextSchedule[0]
    : schedule[blockIndex + 1];
  const nextStartsAt = blockTimestamp(
    isLastBlock ? nextDate : date,
    nextBlock.start,
  );
  const statusText =
    block.availability === "asleep"
      ? "休息中"
      : block.availability === "unavailable"
        ? `${block.activity} · 暂时不便回复`
        : block.activity;

  return {
    activity: block.activity,
    scene: block.scene,
    availability: block.availability,
    statusText,
    startedAt: blockTimestamp(date, block.start),
    endsAt: blockTimestamp(date, block.end),
    startLabel: minuteLabel(block.start),
    endLabel: minuteLabel(block.end),
    nextActivity: nextBlock.activity,
    nextStartsAt,
    checkIns: block.checkIns,
  };
}

export function nextReachableTime(
  characterId: CharacterClockId,
  from = new Date(),
) {
  let cursor = new Date(from);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const snapshot = getCharacterWorldSnapshot(characterId, cursor);
    if (
      snapshot.availability !== "asleep" &&
      snapshot.availability !== "unavailable"
    ) {
      return cursor.getTime();
    }
    cursor = new Date(snapshot.endsAt + 60 * 1000);
  }
  return from.getTime() + 60 * 60 * 1000;
}
