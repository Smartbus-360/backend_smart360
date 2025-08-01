import sequelize from './config/database.js';
import User from './models/user.model.js';
import Route from './models/route.model.js';
import Stop from './models/stop.model.js';
import Driver from './models/driver.model.js';

const syncModels = async () => {
    try {
      // Sync Driver model first
      await Driver.sync();
      //console.log("Driver model synced.");
  
      // Sync Route model
      await Route.sync();
      //console.log("Route model synced.");
  
      // Sync Stop model
      await Stop.sync();
      //console.log("Stop model synced.");
  
      // Sync User model
      await User.sync();
      //console.log("User model synced.");
  
      //console.log("All models have been synced with the MySQL database.");
    } catch (error) {
      console.error("Error syncing models:", error);
    }
};



syncModels();