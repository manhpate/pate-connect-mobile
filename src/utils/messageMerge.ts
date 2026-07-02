import { AppMessage } from '../types/app';

export const mergeMessagesChronologically = (
  olderMessages: AppMessage[] = [],
  newerMessages: AppMessage[] = [],
) => {
  const byId = new Map<string, AppMessage>();
  const order: string[] = [];

  [...olderMessages, ...newerMessages].forEach((message) => {
    if (!message?.id) return;
    if (!byId.has(message.id)) {
      order.push(message.id);
    }
    byId.set(message.id, {
      ...(byId.get(message.id) || {}),
      ...message,
    });
  });

  return order.map((id) => byId.get(id)).filter(Boolean) as AppMessage[];
};
