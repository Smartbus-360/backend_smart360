import { Op } from "sequelize";
import Notification from "../models/notification.model.js";
import BusNotification from "../models/bus_notification.model.js";
import sequelize from "../config/database.js";


export const createNotification = async (req, res) => {
    try {
        const { message, instituteType, expiryDate, isMandatory } = req.body;
        
        if (!message || !instituteType) {
            return res.status(400).json({ success: false, message: "Message and instituteType are required." });
        }
        const newNotification = new Notification({
            message : message,
            instituteType : instituteType,
            status : "sent",
            expiryDate : expiryDate,
            isMandatory : isMandatory ? 1 : 0,
          });
      
          const savedNotification = await newNotification.save();
        res.status(201).json({       
            success: true,
            message: "Notification added successfully",
            stoppage: {
                id: savedNotification.id,
                message: savedNotification.message,
                instituteType: savedNotification.instituteType,
                status: savedNotification.status,
                expiryDate: savedNotification.expiryDate,
                isMandatory: savedNotification.isMandatory,
            }, 
        });
    } catch (error) {
        console.error("Error creating notification:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
 
//   export const getNotifications = async (req, res) => {
//     try {
//         const currentDate = new Date();
//         const notifications = await Notification.findAll({ where: { expiryDate: { [Op.or]: [null, { [Op.gt]: currentDate }] } } });
//         res.json({ success: true, notifications });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
//   };
  
export const getNotifications = async (req, res) => {
    try {
        const currentDate = new Date().toISOString().slice(0, 19).replace("T", " "); // Format for MySQL
        const query = `
            SELECT * FROM tbl_sm360_notifications 
            WHERE expiryDate IS NULL OR expiryDate > :currentDate
        `;
        
        const notifications = await sequelize.query(query, {
            replacements: { currentDate },
            type: sequelize.QueryTypes.SELECT,
        });

        res.json({ success: true, notifications });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

  export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findByPk(id);
        
        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }
        
        await notification.destroy();
        res.json({ success: true, message: "Notification deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
  };

export const createBusNotification = async (req, res) => {
    try {
        const { message, busId, expiryDate, isMandatory } = req.body;
        
        if (!message || !busId) {
            return res.status(400).json({ success: false, message: "Message and busId are required." });
        }

        const newNotification = new BusNotification({
            message : message,
            busId : busId,
            status : "sent",
            expiryDate : expiryDate,
            isMandatory : isMandatory ? 1 : 0,
            });
        
            const savedNotification = await newNotification.save();
        res.status(201).json({       
            success: true,
            message: "Bus notification added successfully",
            stoppage: {
                id: savedNotification.id,
                message: savedNotification.message,
                busId: savedNotification.busId,
                status: savedNotification.status,
                expiryDate: savedNotification.expiryDate,
                isMandatory: savedNotification.isMandatory,
            }, 
        });
    } catch (error) {
        console.error("Error creating notification:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getBusNotifications = async (req, res) => {
    try {
        const currentDate = new Date().toISOString().slice(0, 19).replace("T", " "); // Format for MySQL
        const query = `
            SELECT * FROM tbl_sm360_bus_notifications 
            WHERE expiryDate IS NULL OR expiryDate > :currentDate
        `;
        
        const notifications = await sequelize.query(query, {
            replacements: { currentDate },
            type: sequelize.QueryTypes.SELECT,
        });

        res.json({ success: true, notifications });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteBusNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await BusNotification.findByPk(id);
        
        if (!notification) {
            return res.status(404).json({ success: false, message: "Bus notification not found" });
        }
        
        await notification.destroy();
        res.json({ success: true, message: "Bus notification deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};