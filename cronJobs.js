import cron from 'node-cron';
import sequelize from './config/database.js';

// Schedules a job to delete records older than 3 days
cron.schedule("0 0 * * *", async () => {
    try {
        await sequelize.query(
            `DELETE FROM tbl_sm360_stop_reach_logs 
             WHERE createdAt < DATE_SUB(NOW(), INTERVAL 3 DAY)`
        );
        //console.log("Old reach times deleted successfully");
    } catch (error) {
        console.error("Error deleting old reach times:", error);
    }
});
