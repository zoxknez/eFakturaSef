import Queue from 'bull';
import { config } from '../config';

export type QueueBundle = {
  enabled: boolean;
  sendInvoiceQueue?: Queue.Queue<any>;
  pollStatusQueue?: Queue.Queue<any>;
};

let queues: QueueBundle = { enabled: false };

function initQueues(): QueueBundle {
  if (queues.enabled) return queues;

  if (process.env.NODE_ENV === 'test' || !config.REDIS_URL) {
    queues = { enabled: false };
    return queues;
  }

  try {
    const opts = { redis: config.REDIS_URL } as any;
    const sendInvoiceQueue = new Queue('send-invoice', opts);
    const pollStatusQueue = new Queue('poll-status', opts);
    queues = { enabled: true, sendInvoiceQueue, pollStatusQueue };
  } catch {
    queues = { enabled: false };
  }

  return queues;
}

export function getQueues(): QueueBundle {
  return initQueues();
}

export default getQueues;
