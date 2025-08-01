import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Driver from './driver.model.js';
import Route from './route.model.js';

const DriverRoute = sequelize.define('tbl_sm360_driver_routes', {
  driverId: {
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: {
      model: Driver, // Reference to the Driver model
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  routeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Route, // Reference to the Route model
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
}, {
  timestamps: true, // Enables createdAt and updatedAt timestamps
});

export default DriverRoute;
