// 本地验证：模拟两篇 422 的资料，确认增强后能提取实体
import { buildKnowledgeGraph } from '../src/lib/kg/index.js';

// 模拟1：余华风格小说（"一、二、三"章节）
const novelText = `
透明的红萝卜（余华风格版）

一、初到工地
滞洪闸工地上来了一个十岁的孩子。他头发蓬乱，脸上糊着泥巴，不说话，也不笑，沉默得像一块石头。工地上的人们叫他黑孩。黑孩总是蹲在河堤上看水，水浑浊而缓慢地流着，发出低沉的声音。

二、黑孩的秘密
黑孩有一个秘密，他能在黑暗里看见透明的红萝卜。那萝卜发着光，像一盏小灯笼，在泥土下面微微颤抖。他从来不告诉别人，因为他知道没有人会相信。

三、铁匠铺
工地上有一座铁匠铺，炉火通红。铁匠是个高大的男人，他抡起锤子砸在铁块上，火星四溅。黑孩站在门口看，炉火映在他的脸上，他的眼睛亮晶晶的。

四、尾声
秋天来了，河水瘦了。黑孩离开了工地，他走得很慢，一步三回头。他的口袋里装着一个小东西，那是一块石头，被他捂得温热。
`;

// 模拟2：HTML 实体残留的 EPUB 全集
const epubText = `
&#13;
目录
&#13;
&#13;
活着&#13;
许三观卖血记&#13;
兄弟&#13;
在细雨中呼喊&#13;
&#13;
第一章 活着&#13;
我比现在年轻十岁的时候，获得了一个游手好闲的职业，去乡间收集民间歌谣。&#13;
那位老人叫做福贵，他坐在田埂上，看着远处的牛。&#13;
`;

for (const [label, txt] of [
  ['小说（一、二、三）', novelText],
  ['EPUB 全集（HTML实体）', epubText],
] as const) {
  const { data, stats } = buildKnowledgeGraph(txt);
  console.log(`\n=== ${label} ===`);
  console.log(`实体数: ${stats.total_entities}, 关系: ${stats.total_relations}`);
  console.log('实体:', Object.keys(data).slice(0, 20).join(' | '));
  const first = Object.values(data)[0];
  if (first) console.log('首个实体段落:', first.paragraph.slice(0, 60));
}
