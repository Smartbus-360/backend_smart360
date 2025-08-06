import Driver from '../models/driver.model.js';
import { wsAuth } from '../middleware/wsAuth.middleware.js';

const driverInfoCache = {};

// Helper function to fetch driver info from the DB
const getDriverInfo = async (driverId, callback) => {
    try {
        if (!driverId || isNaN(driverId)) {
            return callback('Invalid driverId', null);
        }
        if (driverInfoCache[driverId]) {
            return callback(null, driverInfoCache[driverId]);
        }
        const driver = await Driver.findOne({ where: { id: driverId } });
        if (!driver) {
            return callback('Driver not found', null);
        }
        driverInfoCache[driverId] = driver;
        callback(null, driver);
    } catch (error) {
        callback(error, null);
    }
};

export const configureSocket = (io) => {
    const driverNamespace = io.of('/drivers').use(wsAuth);
    const userNamespace = io.of('/users').use(wsAuth);
    const adminNotificationNamespace = io.of('/admin/notification');

    // Driver namespace: Handles real-time updates from drivers
    driverNamespace.on('connection', (socket) => {
                console.log('✅ Driver connected to /drivers namespace');

        //console.log('A driver connected');
        
        let driverId; // Track the driverId for cleanup on disconnect
        
        // Driver joins a room based on their ID
        socket.on('driverConnected', (id) => {
            driverId = parseInt(id, 10);
            socket.join(`driver_${driverId}`);
            console.log(`Driver ${driverId} connected to room driver_${driverId}`);
        });

        socket.on('locationUpdate', (data) => {
            const { driverId, latitude, longitude,speed = 0,placeName='' } = data;
            const numericDriverId = parseInt(driverId, 10);
            if (!numericDriverId || latitude === undefined || longitude === undefined) {
                return console.error(`⚠️ Invalid or missing location data from driver ${driverId}`);
            }


            //console.log(`Received locationUpdate for driver ${numericDriverId}: lat=${latitude}, lon=${longitude}`);

            getDriverInfo(numericDriverId, (err, driverInfo) => {
                if (err) return console.error('Driver info error:', err);

                userNamespace.to(`driver_${numericDriverId}`).emit('locationUpdate', {
                    driverInfo: { id : numericDriverId,name: driverInfo.name, phone: driverInfo.phone, busNumber : driverInfo.vehicleAssigned || 'N/A' 

                    },
                    latitude,
                    longitude,
                    speed,
                    placeName
                });
                // ✅ Also notify admin namespace
adminNotificationNamespace.emit('locationUpdate', {
    driverInfo: { 
        id: numericDriverId, 
        name: driverInfo.name, 
        phone: driverInfo.phone, 
        busNumber: driverInfo.vehicleAssigned || 'N/A' 
    },
    latitude,
    longitude,
    speed,
    placeName
});

            });
        });

        socket.on('disconnect', () => {
            console.log(`❌ Driver ${driverId || 'unknown'} disconnected`);
            if (driverId) {
                socket.leave(`driver_${driverId}`);
                delete driverInfoCache[driverId]; // Optional: Clear cache if driver goes offline
            }
        });
    });

    // User namespace: Users connect here to receive real-time updates
    userNamespace.on('connection', (socket) => {
        console.log('✅ User connected to /users namespace');
        
        const subscribedDrivers = new Set(); // Track subscribed drivers for each user
        
        socket.on('subscribeToDriver', (data) => {
            const driverId = typeof data === 'object' ? data.driverId : data;
            const numericDriverId = parseInt(driverId, 10);

            if (!isNaN(numericDriverId)) {
                socket.join(`driver_${numericDriverId}`);
                subscribedDrivers.add(numericDriverId); // Track subscriptions
                console.log(`User subscribed to driver_${numericDriverId}`);
          } else {
                console.warn('Invalid driverId in subscribeToDriver event');
            }
        });

        // Unsubscribe a user from a specific driver
        socket.on('unsubscribeFromDriver', (data) => {
            const driverId = typeof data === 'object' ? data.driverId : data;
            const numericDriverId = parseInt(driverId, 10);

            if (subscribedDrivers.has(numericDriverId)) {
                socket.leave(`driver_${numericDriverId}`);
                subscribedDrivers.delete(numericDriverId); // Remove from tracked subscriptions
                console.log(`User unsubscribed from driver_${numericDriverId}`);
            }
                });

        socket.on('disconnect', () => {
            console.log('❌ User disconnected from /users namespace');
            // Cleanup: Unsubscribe user from all tracked driver rooms
            subscribedDrivers.forEach(driverId => {
                socket.leave(`driver_${driverId}`);
            });
        });
    });

    // Admin Notification namespace
    adminNotificationNamespace.on('connection', (socket) => {
        console.log('✅ Admin notification channel connected');

        socket.on('disconnect', () => {
            console.log('❌ Admin notification channel disconnected');
        });
    });
};


