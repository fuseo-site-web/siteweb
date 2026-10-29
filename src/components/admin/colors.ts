import { CHANNEL_LABEL, type Channel } from '@/lib/analytics/source';

export const CHANNEL_COLOR: Record<Channel, string> = {
  ai: '#7b5cd6',
  search: '#3cc0f0',
  social: '#e5604d',
  email: '#2f9e6e',
  campaign: '#ffc857',
  referral: '#8594ab',
  direct: '#0b2f55',
};

export const channelName = (c: string) => CHANNEL_LABEL[c as Channel] ?? c;
export const channelColor = (c: string) => CHANNEL_COLOR[c as Channel] ?? '#8594ab';
