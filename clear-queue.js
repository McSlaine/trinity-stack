
const { Queue } = require('bullmq');

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
};

const syncQueue = new Queue('sync-queue', { connection: redisConnection });

async function clearQueue() {
  try {
    await syncQueue.obliterate();
    console.log('Sync queue cleared.');
  } catch (error) {
    console.error('Failed to clear sync queue:', error);
  } finally {
    await syncQueue.close();
  }
}

clearQueue();
