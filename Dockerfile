# Step 1: Build the frontend and compiled backend assets
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Step 2: Create the highly optimized, lightweight production runtime container
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
# Install only production dependencies to keep the container lightweight and secure
RUN npm ci --only=production
# Copy the compiled production assets from the builder stage
COPY --from=builder /app/dist ./dist

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the application port
EXPOSE 3000

# Start the application using the compiled CommonJS server bundle
CMD ["npm", "start"]
