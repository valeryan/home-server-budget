# Use the official node image as base
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY app/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY ./app .

# Expose the port the app will run on
EXPOSE 3000

# Start the Next.js app in production mode
CMD ["npm", "run", "dev"]
