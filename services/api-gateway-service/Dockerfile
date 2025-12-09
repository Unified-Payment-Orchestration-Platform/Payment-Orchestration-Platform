# Use a lightweight Node.js base image
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install 

# Copy the rest of the application code
COPY . .

# Expose the port your Express app listens on (default 3000)
EXPOSE 3000

# Command to run the app (adjust if your entry file is different, e.g., index.js)
CMD ["node", "src/server.js"]