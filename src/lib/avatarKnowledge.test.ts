import { describe, expect, it } from 'vitest';
import { fallbackReply } from './avatarKnowledge';

describe('digital twin fallback answers', () => {
  it('introduces only the supplied identity', () => {
    const reply = fallbackReply('你是谁？', 'zh');
    expect(reply).toContain('美术专业');
    expect(reply).toContain('学院篮球队队长');
    expect(reply).toContain('AI 数字分身');
  });

  it('answers recent work and interests without claiming results', () => {
    expect(fallbackReply('你最近在做什么？', 'zh')).toContain('AI 分享');
    expect(fallbackReply('你关注哪些方向？', 'zh')).toContain('AI 漫剧');
    expect(fallbackReply('你做过哪些作品？', 'zh')).toContain('其他作品、合作或成果尚未提供');
  });

  it('provides real contact details and admits unknowns', () => {
    expect(fallbackReply('怎么联系你？', 'zh')).toContain('Kyrie725798');
    expect(fallbackReply('你的收入是多少？', 'zh')).toContain('没有可靠信息');
    expect(fallbackReply('What is your income?', 'en')).toContain('do not have reliable information');
  });
});
