import { errorHandler } from "../utils/error.js";
import Route from "../models/route.model.js";
import User from "../models/user.model.js";

// Add Route
export const addRoute = async (req, res, next) => {
  const {
    routeName,
    description = null,
    totalDistance = null,
    estimatedTravelTime = null,
    startLocation = null,
    endLocation = null,
    instituteId,
    routeType = 'regular', // Default to 'regular' if not provided
    stopSequence = null,
    isActive = 1, // Default to 1 (active) if not provided
    scheduledDays = null,
    startTime = null,
    endTime = null,
    capacity = null,
    routeStatus = 'operational', // Default to 'operational' if not provided
    pickupInstructions = null,
    dropOffInstructions = null,
    missedStopsDetails = null,
    finalStopReached = 0,
    currentJourneyPhase = null, 
  } = req.body;

  const userId = req.user.id;
  const user = await User.findByPk(userId);
  const isAdmin = Number(user.isAdmin);
  const instituteid = Number(user.instituteId);

  if (isAdmin === 2 && Number(instituteId) !== instituteid) {
    console.warn("Unauthorized access attempt:", {
      userId,
      isAdmin,
      userInstituteId: instituteid,
    });
    return next(errorHandler(403, 'You are not authorized to add drivers to other institutes.'));
  }

  // Required field validation
  if (!routeName || !instituteId) {
    return next(errorHandler(400, "Route name and instituteId are required"));
  }

  // Ensure routeType is valid
  const validRouteTypes = ['regular', 'express', 'special'];
  if (routeType && !validRouteTypes.includes(routeType)) {
    return next(errorHandler(400, "Invalid routeType provided. Valid values are 'regular', 'express', or 'special'."));
  }

  // Ensure routeStatus is valid
  const validRouteStatuses = ['operational', 'under maintenance', 'suspended'];
  if (routeStatus && !validRouteStatuses.includes(routeStatus)) {
    return next(errorHandler(400, "Invalid routeStatus provided. Valid values are 'operational', 'under maintenance', or 'suspended'."));
  }

  // Validate totalDistance if provided
  if (totalDistance && isNaN(totalDistance)) {
    return next(errorHandler(400, "Invalid totalDistance. It must be a valid number."));
  }

  // Validate capacity if provided
  if (capacity && isNaN(capacity)) {
    return next(errorHandler(400, "Invalid capacity. It must be a valid number."));
  }

  // Optional fields validation: description, estimatedTravelTime, etc.
  if (description && typeof description !== 'string') {
    return next(errorHandler(400, "Description must be a valid string."));
  }
  
  if (estimatedTravelTime && typeof estimatedTravelTime !== 'string') {
    return next(errorHandler(400, "Estimated travel time must be a valid string."));
  }

  // Handle empty string for time fields (startTime and endTime)
  const formattedStartTime = (startTime && startTime !== '') ? startTime : null;
  const formattedEndTime = (endTime && endTime !== '') ? endTime : null;

  try {
    const newRoute = await Route.create({
      routeName,
      description,
      totalDistance: totalDistance || null,
      estimatedTravelTime,
      startLocation,
      endLocation,
      instituteId,
      routeType: routeType || 'regular',
      stopSequence,
      isActive: isActive || 1,
      scheduledDays,
      lastUpdatedBy: userId,
      createdBy: userId,
      startTime: formattedStartTime,
      endTime: formattedEndTime,
      capacity: capacity || 0,
      routeStatus: routeStatus || 'operational', 
      pickupInstructions,
      dropOffInstructions,
      missedStopsDetails,
      finalStopReached,
      currentJourneyPhase,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Route added successfully",
      id: newRoute.id,
    });
  } catch (error) {
    next(error);
  }
};




// Update Route
export const updateRoute = async (req, res, next) => {
  const routeId = req.params.id;
  const {
    routeName,
    description,
    totalDistance,
    estimatedTravelTime,
    startLocation,
    endLocation,
    routeType,
    stopSequence,
    isActive,
    scheduledDays,
    startTime,
    endTime,
    capacity,
    routeStatus,
    pickupInstructions,
    dropOffInstructions,
  } = req.body;

  const userId = req.user.id;
  const user = await User.findByPk(userId);
  const isAdmin = Number(user.isAdmin);
  const instituteId = Number(user.instituteId);

  try {
    const route = await Route.findByPk(routeId);
    if (!route) {
      return next(errorHandler(404, "Route not found."));
    }

    if (isAdmin === 2 && route.instituteId !== instituteId) {
      return next(
        errorHandler(403, "You are not authorized to update routes for other institutes.")
      );
    }

    if (!routeName || !startLocation || !endLocation) {
      return next(
        errorHandler(400, "Route name, start location, and end location are required.")
      );
    }

    // Validate ENUM fields
    if (routeType && !['regular', 'express', 'special'].includes(routeType)) {
      return next(errorHandler(400, "Invalid route type."));
    }
    if (routeStatus && !['operational', 'under maintenance', 'suspended'].includes(routeStatus)) {
      return next(errorHandler(400, "Invalid route status."));
    }

    // Update fields
    route.routeName = routeName;
    route.description = description || null;
    route.totalDistance = totalDistance || null;
    route.estimatedTravelTime = estimatedTravelTime || null;
    route.startLocation = startLocation;
    route.endLocation = endLocation;
    route.routeType = routeType || null;
    route.stopSequence = stopSequence || null;
    route.isActive = isActive !== undefined ? isActive : route.isActive;
    route.scheduledDays = scheduledDays || null;
    route.startTime = startTime || null;
    route.endTime = endTime || null;
    route.capacity = capacity || null;
    route.routeStatus = routeStatus || null;
    route.pickupInstructions = pickupInstructions || null;
    route.dropOffInstructions = dropOffInstructions || null;
    route.lastUpdatedBy = userId;

    await route.save();

    res.status(200).json({
      success: true,
      message: "Route updated successfully",
      route,
    });
  } catch (error) {
    console.error("Error updating route:", error);
    res.status(500).json({ message: "Failed to update route", error: error.message });
  }
};


// Delete Route
export const deleteRoute = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  const user = await User.findByPk(userId);
  const isAdmin = Number(user.isAdmin);
  const instituteId = Number(user.instituteId);

  try {
    const route = await Route.findByPk(id);

    if (!route) {
      return next(errorHandler(404, "Route not found."));
    }

    if (isAdmin === 2 && route.instituteId !== instituteId) {
      return next(
        errorHandler(403, "You are not authorized to delete routes of other institutes.")
      );
    }

    await route.destroy();

    res.json({ message: "Route deleted successfully." });
  } catch (error) {
    console.error("Error deleting route:", error);
    res.status(500).json({ message: "Failed to delete route." });
  }
};
