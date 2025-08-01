export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Radius of Earth in meters
    const φ1 = lat1 * (Math.PI / 180);
    const φ2 = lat2 * (Math.PI / 180);
    const Δφ = (lat2 - lat1) * (Math.PI / 180);
    const Δλ = (lon2 - lon1) * (Math.PI / 180);

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

export const pointToLineDistance = (pointLat, pointLon, lineStartLat, lineStartLon, lineEndLat, lineEndLon) => {
    const A = pointLat - lineStartLat;
    const B = pointLon - lineStartLon;
    const C = lineEndLat - lineStartLat;
    const D = lineEndLon - lineStartLon;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    const param = len_sq ? dot / len_sq : -1;

    let nearestX, nearestY;

    if (param < 0) {
        nearestX = lineStartLat;
        nearestY = lineStartLon;
    } else if (param > 1) {
        nearestX = lineEndLat;
        nearestY = lineEndLon;
    } else {
        nearestX = lineStartLat + param * C;
        nearestY = lineStartLon + param * D;
    }

    return calculateDistance(pointLat, pointLon, nearestX, nearestY);
};

export const pointToStopDistance = (pointLat, pointLon, stopLat, stopLon) => {
    return calculateDistance(pointLat, pointLon, stopLat, stopLon);
};

