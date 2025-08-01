import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ReplacedBus = sequelize.define('tbl_sm360_replaced_buses', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  old_bus_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  new_bus_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  reason: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  duration: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  route_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  driver_id: {
    type: DataTypes.INTEGER,
    allowNull: true, 
  },
}, { timestamps: true });

export default ReplacedBus;
