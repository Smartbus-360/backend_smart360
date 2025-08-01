import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Driver from './driver.model.js';

const Bus = sequelize.define('tbl_sm360_buses', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  busNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  model: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  driverId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Driver,
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  licensePlate: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  color: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'under maintenance', 'retired'),
    allowNull: true,
  },
  fuelType: {
    type: DataTypes.ENUM('diesel', 'petrol', 'electric'),
    allowNull: true,
  },
  manufactureYear: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  mileage: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  lastServicedDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  insuranceExpiryDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  assignedRouteId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, { timestamps: true });

export default Bus;
