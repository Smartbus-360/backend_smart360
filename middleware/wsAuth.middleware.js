import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import Driver from '../models/driver.model.js';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt'; 
import { Op } from 'sequelize'; 

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

export const httpAuth = async (req, res, next) => {
    const jwtToken = req.headers['authorization'];
    if (!jwtToken || !jwtToken.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentication error: No token provided' });
    }

    const token = jwtToken.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Authentication error: No token provided' });
    }

    try {
        // Verify the token and extract the payload
        const payload = jwt.verify(token, JWT_SECRET);

        // Fetch user or driver from the database
        let user;
        if (payload.role === 'user') {
            user = await User.findOne({ where: { email: payload.email, token } });
        } else if (payload.role === 'driver') {
            user = await Driver.findOne({ where: { email: payload.email, token } });
        }

        // Ensure the token matches the one stored in the database
        if (!user) {
            return res.status(401).json({ message: 'Authentication error: Invalid or expired token' });
        }

        // Attach user to the request object for later use
        req.user = user;
        next(); // Proceed to the next middleware
    } catch (err) {
        console.error(err);
        return res.status(401).json({ message: 'Authentication error: Invalid token' });
    }
};

// Middleware for WebSocket Authentication
export const wsAuth = async (socket, next) => {
    const jwtToken = socket.handshake.headers['authorization'];
    if (!jwtToken || !jwtToken.startsWith('Bearer ')) {
        return next(new Error('Authentication error: No token provided'));
    }

    const token = jwtToken.split(' ')[1];
    if (!token) {
        return next(new Error('Authentication error: No token provided'));
    }

    try {
        // Verify the token and extract the payload
        const payload = jwt.verify(token, JWT_SECRET);

        // Fetch user or driver from the database and ensure token matches
        let user;
        if (payload.role === 'user') {
            user = await User.findOne({ where: { email: payload.email, token } });
        } else if (payload.role === 'driver') {
            user = await Driver.findOne({ where: { email: payload.email, token } });
        }

        if (!user) {
            return next(new Error('Authentication error: Invalid or expired token'));
        }

        // Attach user to the socket object for later use
        socket.user = user;
        next(); // Proceed to the next middleware
    } catch (err) {
        console.error(err);
        return next(new Error('Authentication error: Invalid token'));
    }
};

// Function to get User Token
export const getUserToken = async (usernameOrEmail, password) => {
    const user = await User.findOne({
        where: {
            [Op.or]: [
                { email: usernameOrEmail }, // Check if it's an email
                { username: usernameOrEmail } // Check if it's a username
            ]
        }
    });

    // Check if the user was found
    if (user) {
        //console.log(`User found: ${user.username}, Email: ${user.email}`);

        // Compare the entered password with the hashed password in the database
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        //console.log(`Password correct: ${isPasswordCorrect}`);

        if (isPasswordCorrect) {
            const token = jwt.sign({ email: user.email, role: 'user' }, JWT_SECRET, { expiresIn: '8h' });
            user.token = token; // Optionally save the token in the database
            await user.save();

            // Return token along with user id, username, and email
            return {
                id: user.id,
                username: user.username,
                email: user.email,
                token
            };
        } else {
            //console.log('Password did not match');
        }
    } else {
        //console.log(`No user found for ${usernameOrEmail}`);
    }

    throw new Error('Invalid credentials');
};

// Function to get Driver Token
export const getDriverToken = async (email, password) => {
    const driver = await Driver.findOne({ where: { email } });
    //console.log('Driver:', driver); 
    
    // Check if driver exists and verify the password
    if (driver && await bcrypt.compare(password, driver.password)) {
        const token = jwt.sign({ email: driver.email, role: 'driver' }, JWT_SECRET, { expiresIn: '8h' });
        driver.token = token; // Optionally save the token in the database
        await driver.save();

        // Return token along with driver id, name, and email
        return {
            id: driver.id,
            name: driver.name,
            email: driver.email,
            token
        };
    }

    throw new Error('Invalid credentials');
};

export const logout = async (req, res) => {
    const { id, role } = req.user;
    try {
        if (role === 'user') {
            await User.update({ token: null }, { where: { id } });
        } else if (role === 'driver') {
            await Driver.update({ token: null }, { where: { id } });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error logging out' });
    }
};

