import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Route from './route.model.js';
import Stop from './stop.model.js';

const StopReachLogs = sequelize.define(
  'tbl_sm360_stop_reach_logs',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    stopId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Stop,
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    routeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Route,
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    tripType: {
      type: DataTypes.ENUM('morning', 'afternoon', 'evening'),
      allowNull: false,
    },
    reachDateTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: 'tbl_sm360_stop_reach_logs',
  }
);

export default StopReachLogs;
