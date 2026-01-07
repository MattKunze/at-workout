# Multi-stage Dockerfile for at-workout application
# Builds both the Node.js React Router app and the Go peloton-oauth binary

# Stage 1: Build the Go peloton-oauth binary
FROM golang:1.23-alpine AS go-builder

WORKDIR /app

# Copy Go module files
COPY cmd/peloton-oauth/go.mod cmd/peloton-oauth/go.sum ./cmd/peloton-oauth/

# Download Go dependencies
WORKDIR /app/cmd/peloton-oauth
RUN go mod download

# Copy Go source code
COPY cmd/peloton-oauth/main.go .

# Build the Go binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o peloton-oauth .

# Stage 2: Build the Node.js application
FROM node:22-alpine AS node-builder

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 3: Production image
FROM node:22-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy the Go binary from go-builder stage
COPY --from=go-builder /app/cmd/peloton-oauth/peloton-oauth /usr/local/bin/peloton-oauth
RUN chmod +x /usr/local/bin/peloton-oauth

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application from node-builder stage
COPY --from=node-builder /app/build ./build
COPY --from=node-builder /app/public ./public

# Copy necessary config files
COPY react-router.config.ts ./

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose the application port
EXPOSE 3000

# Set NODE_ENV to production
ENV NODE_ENV=production

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npm", "start"]
