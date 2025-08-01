import Driver from './driver.model.js'; 
import Route from './route.model.js';
import Institute from './institute.model.js';
import Stop from './stop.model.js';
import DriverRoute from './driverRoute.model.js';
import User from './user.model.js';
import Bus from './bus.model.js';
import UserStop from './userStop.model.js';
import Notification from './notification.model.js';
import BusNotification from './bus_notification.model.js';

// Setup Associations
const setupAssociations = () => {
    
    // Institute-Route relationship
    Institute.hasMany(Route, { foreignKey: 'instituteId', onDelete: 'CASCADE' });
    Route.belongsTo(Institute, { foreignKey: 'instituteId' });

    // User-Institute relationship using instituteCode
User.belongsTo(Institute, {
    foreignKey: 'instituteCode',
    targetKey: 'instituteCode',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
});

Institute.hasMany(User, {
    foreignKey: 'instituteCode',
    sourceKey: 'instituteCode',
});


    // Route-Stop relationship
    Route.hasMany(Stop, { foreignKey: 'routeId', onDelete: 'CASCADE' });
    Stop.belongsTo(Route, { foreignKey: 'routeId' });

    // Driver-Institute relationship
    Institute.hasMany(Driver, { foreignKey: 'instituteId', onDelete: 'CASCADE' });
    Driver.belongsTo(Institute, { foreignKey: 'instituteId' });

    // Driver-Route relationship (Many-to-Many)
    Driver.belongsToMany(Route, { through: DriverRoute, foreignKey: 'driverId' });
    Route.belongsToMany(Driver, { through: DriverRoute, foreignKey: 'routeId' });

    // User-Stop relationship (Many-to-Many)
    User.belongsToMany(Stop, { through: UserStop, foreignKey: 'userId' });
    Stop.belongsToMany(User, { through: UserStop, foreignKey: 'stopId' });

    // Driver-Bus relationship
    Driver.hasOne(Bus, { foreignKey: 'driverId', onDelete: 'SET NULL' });
    Bus.belongsTo(Driver, { foreignKey: 'driverId' });
};


// Export the setup function
export { setupAssociations };
