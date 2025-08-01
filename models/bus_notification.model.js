import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Bus from "./bus.model.js";

const BusNotification = sequelize.define("tbl_sm360_bus_notifications", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  busId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Bus,
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
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

export default BusNotification;