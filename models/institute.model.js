import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Institute = sequelize.define('tbl_sm360_institutes', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  instituteCode: {
  type: DataTypes.STRING,
  allowNull: false,
  unique: true,
}
,
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  contactNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  logo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  establishedYear: {
    type: DataTypes.INTEGER,  
    allowNull: true,
  },
  affiliation: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  principalName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  totalStudents: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  totalStaff: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
  },
  faxNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  institutionBody: {
    type: DataTypes.ENUM('public', 'private', 'government', 'aided'),
    allowNull: true,
  },
  numberOfBranches: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  socialMediaLinks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    allowNull: true,
  },
  lastUpdatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  ownershipType: {
    type: DataTypes.ENUM('owned', 'leased'),
    allowNull: true,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  postalCode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  institutionType: {
    type: DataTypes.ENUM('university', 'school', 'college'),
    allowNull: false,
  },
}, { timestamps: true });

export default Institute;
