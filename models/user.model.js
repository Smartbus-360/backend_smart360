import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Institute from './institute.model.js';
import Stop from './stop.model.js';

const User = sequelize.define('tbl_sm360_users', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  full_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  gender: {
    type: DataTypes.ENUM('male', 'female'),
    allowNull: true,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  profilePicture: {
    type: DataTypes.STRING,
    defaultValue: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png',
  },
  isAdmin: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  role: {
    type: DataTypes.ENUM('approver', 'initiator', 'viewer'),
    allowNull: true,
  },
  institutionType: {
    type: DataTypes.ENUM('university', 'school', 'college'),
    allowNull: true,
  },
  registrationNumber: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
  },
  token: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  refreshToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  instituteId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Institute,
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  instituteCode: {
  type: DataTypes.STRING,
  allowNull: true,
},

  stopId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Stop,
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  payment_status: {
    type: DataTypes.ENUM('paid', 'unpaid', 'na'),
    allowNull: true,
  },
  emergency_contact_info: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dateOfBirth: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  nationality: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    defaultValue: 'active',
  },
  verified: {
    type: DataTypes.ENUM('yes', 'no'),
    defaultValue: 'no',
  },
  preferences: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  accountType: {
    type: DataTypes.ENUM('student', 'staff', 'admin'),
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  timestamps: true,
});

export default User;
