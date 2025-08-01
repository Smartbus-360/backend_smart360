import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Institute from './institute.model.js';

const Driver = sequelize.define('tbl_sm360_drivers', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  emergencyContact: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  licenseNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  aadhaarNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  licenseExpiry: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  experienceYears: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  dateOfBirth: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  profilePicture: {
    type: DataTypes.STRING,
    defaultValue: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png',
  },
  instituteId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: Institute, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  availabilityStatus: {
    type: DataTypes.ENUM('Available', 'Unavailable'),
    allowNull: false,
  },
  shiftType: {
    type: DataTypes.ENUM('morning', 'evening', 'both'),
    allowNull: true,
  },
  vehicleAssigned: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
  },
  token: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isVerified: {
    type: DataTypes.ENUM('yes', 'no'),
    allowNull: true,
    defaultValue: 'no',
  },
}, { timestamps: true });

export default Driver;
