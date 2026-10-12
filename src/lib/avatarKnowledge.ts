// 数字分身兜底知识库：流式回复失败时按关键词给出离线回答，保证演示可用
import type { Language } from '@/types/types';

const ZH: Record<string, string> = {
  identity: '我是辛瑞（v-max）的 AI 数字分身。辛瑞是美术专业的学生，也是 AI 加健身自媒体博主、学院篮球队队长。想了解哪一方面？',
  recent: '辛瑞最近在做自媒体、健身和 AI 分享。他也在关注 AI 漫剧，以及 AI 如何让自媒体创作更方便。',
  focus: '辛瑞最近关注 AI 漫剧，以及 AI 怎样帮自媒体博主更方便地创作。关于具体实践或成果，我没有可靠信息，建议直接向他确认。',
  work: '目前能确认的公开项目是这个个人主页和 AI 数字分身。其他作品、合作或成果尚未提供，我不想替辛瑞编造；你可以通过联系方式向他确认。',
  contact: '想直接联系辛瑞，可以加微信 Kyrie725798，或发邮件到 201214537@qq.com。这里是 AI 分身对话，不是给本人发私信。',
  unknown: '这部分我没有可靠信息，不想替辛瑞猜。你可以通过微信 Kyrie725798 或邮箱 201214537@qq.com 向他本人确认。',
};

const EN: Record<string, string> = {
  identity: "I'm Xin Rui (v-max)'s AI digital twin. Xin Rui is a fine-arts student, an AI-and-fitness content creator, and captain of his college basketball team. What would you like to know?",
  recent: 'Xin Rui is currently creating content, working on fitness, and sharing about AI. He is also interested in AI short dramas and tools that make content creation easier.',
  focus: 'Xin Rui is interested in AI short dramas and how AI can make life easier for content creators. I do not have reliable details about specific projects or results; please ask him directly.',
  work: 'The public project I can confirm is this personal homepage and its AI digital twin. I have not been given other works, partnerships, or results, so I will not invent them.',
  contact: 'To reach Xin Rui directly, add WeChat Kyrie725798 or email 201214537@qq.com. This AI chat is not a direct message to him.',
  unknown: 'I do not have reliable information about that and do not want to guess for Xin Rui. You can confirm with him on WeChat Kyrie725798 or by email at 201214537@qq.com.',
};

/** 关键词匹配，返回兜底回复 */
export function fallbackReply(question: string, lang: Language): string {
  const q = question.toLowerCase();
  const table = lang === 'en' ? EN : ZH;
  if (/联系|微信|邮箱|邮件|找到你|contact|reach|wechat|email|connect/.test(q)) return table.contact;
  if (/做过|作品|项目|案例|成果|合作|经历|portfolio|project|\bworks?\b|\bdone\b|case|experience|achievement/.test(q)) return table.work;
  if (/最近|在做|现在|近况|忙什么|recent|currently|now|lately/.test(q)) return table.recent;
  if (/漫剧|关注|擅长|short drama|focus|interested/.test(q)) return table.focus;
  if (/是谁|介绍|身份|专业|篮球|队长|健身|你是|who|about|student|basketball|captain|fitness/.test(q)) return table.identity;
  return table.unknown;
}
