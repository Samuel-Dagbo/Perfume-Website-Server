const Queue = require('bull');
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const emailQueue = new Queue('email', REDIS_URL, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 100,
    removeOnFail: 500
  }
});

const analyticsQueue = new Queue('analytics', REDIS_URL, {
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: 50,
    removeOnFail: 100
  }
});

const notificationQueue = new Queue('notification', REDIS_URL, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: 100,
    removeOnFail: 200
  }
});

const inventoryQueue = new Queue('inventory', REDIS_URL, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 500
    },
    removeOnComplete: 50,
    removeOnFail: 100
  }
});

emailQueue.on('failed', (job, err) => {
  console.error(`Email job ${job.id} failed:`, err.message);
});

analyticsQueue.on('failed', (job, err) => {
  console.error(`Analytics job ${job.id} failed:`, err.message);
});

notificationQueue.on('failed', (job, err) => {
  console.error(`Notification job ${job.id} failed:`, err.message);
});

module.exports = {
  emailQueue,
  analyticsQueue,
  notificationQueue,
  inventoryQueue
};
