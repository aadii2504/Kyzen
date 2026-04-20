FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

# Install dependencies (production only)
RUN npm install --omit=dev

# Bundle app source
COPY . .

# Cloud Run injects the PORT environment variable (usually 8080)
# We expose it here for documentation
EXPOSE 8080

# Start the server
CMD [ "npm", "start" ]
