import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Institute from './institute.model.js';

const Route = sequelize.define('tbl_sm360_routes', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  routeName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  totalDistance: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  estimatedTravelTime: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  startLocation: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  endLocation: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  instituteId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: Institute, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'SET NULL',
  },
  routeType: {
    type: DataTypes.ENUM('regular', 'express', 'special'),
    allowNull: true,
  },
  stopSequence: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  scheduledDays: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lastUpdatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  routeStatus: {
    type: DataTypes.ENUM('operational', 'under maintenance', 'suspended'),
    allowNull: true,
  },
  pickupInstructions: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  dropOffInstructions: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  missedStopsDetails: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  finalStopReached: {
    type: DataTypes.TINYINT,
    allowNull: true,
  },
  currentJourneyPhase: {
    type: DataTypes.ENUM('morning', 'afternoon', 'evening'),
    allowNull: true,
  },
  currentRound: {
    type: DataTypes.TINYINT,
    defaultValue: 1,
    allowNull: true,
  }
}, { timestamps: true });

export default Route;
