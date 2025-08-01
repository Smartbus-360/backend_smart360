import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Notification = sequelize.define("tbl_sm360_notifications", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  instituteType: {
    type: DataTypes.ENUM("university", "school", "college", "company"),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM("sent", "failed", "pending"),
    defaultValue: "sent",
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isMandatory: {
    type: DataTypes.TINYINT,
    allowNull: true,
    defaultValue: 0,
  },
}, {
  timestamps: true,
});

export default Notification;