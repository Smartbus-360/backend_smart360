import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const JoinUs = sequelize.define(
  'tbl_sm360_join_us',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    full_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    mobile_number: {
      type: DataTypes.STRING(15),
      allowNull: false,
    },
    institute_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    number_of_buses: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    pincode: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  { timestamps: true }
);

export default JoinUs;
