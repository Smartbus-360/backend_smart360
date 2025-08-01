import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Route from './route.model.js';

const Stop = sequelize.define('tbl_sm360_stops', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  routeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Route, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  stopName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false,
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false,
  },
  stopOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  stopType: {
    type: DataTypes.ENUM('morning', 'afternoon', 'evening'),
    allowNull: true,
  },
  activeStatus: {
    type: DataTypes.ENUM('active', 'inactive'),
    allowNull: true,
    defaultValue: 'active',
  },
  estimatedStopDuration: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  arrivalTime: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  departureTime: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  afternoonarrivalTime: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  afternoondepartureTime: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  eveningarrivalTime: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  eveningdepartureTime: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  passengerCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  comments: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  isAccessible: {
    type: DataTypes.ENUM('yes', 'no'),
    allowNull: true,
    defaultValue: 'no',
  },
  landmark: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  reached: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  reachDateTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  rounds: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  timestamps: true,
});

export default Stop;
