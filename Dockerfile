# Use official Node.js image
FROM node:18

# Set working directory inside the container
WORKDIR /app

# Install required build tools (Python, make, g++)
RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    apt-get clean

# Copy project files into container
COPY . .

# Install production dependencies
RUN npm ci

# Expose your app port
EXPOSE 3000

# Start your application
CMD ["npm", "start"]
