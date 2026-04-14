const {
  formatDateKey,
  runDailyTopperJob,
  runNegativeMarkJob,
  runStreakJob,
  runWarningJob
} = require('../utils/monthTasksService');

let lastRunKey = '';

async function runMonthTaskCronJobs(runDate = new Date()) {
  const yesterday = new Date(runDate.getTime());
  yesterday.setDate(yesterday.getDate() - 1);
  const dateKey = formatDateKey(yesterday);
  await runNegativeMarkJob(dateKey);
  await runDailyTopperJob(dateKey);
  await runWarningJob();
  await runStreakJob();
  return { dateKey };
}

function initMonthTaskCron() {
  setInterval(async () => {
    const now = new Date();
    const minuteKey = `${formatDateKey(now)}-${now.getHours()}-${now.getMinutes()}`;
    if (lastRunKey === minuteKey) return;
    if (now.getHours() === 0 && now.getMinutes() === 5) {
      lastRunKey = minuteKey;
      try {
        await runMonthTaskCronJobs(now);
        console.log('[MonthTasksCron] Midnight jobs completed');
      } catch (error) {
        console.error('[MonthTasksCron] Failed:', error.message);
      }
    }
  }, 60 * 1000);
}

module.exports = {
  initMonthTaskCron,
  runMonthTaskCronJobs
};
