import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './user.model.js';
import Stop from './stop.model.js';

const UserStop = sequelize.define('tbl_sm360_user_stops', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  stopId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Stop, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
}, { timestamps: true });

export default UserStop;
