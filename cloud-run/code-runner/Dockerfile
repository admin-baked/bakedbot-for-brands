# BakedBot Code Runner - Cloud Run Service
# Secure, isolated TypeScript code execution for training challenges

FROM node:20-alpine

# Install dependencies for building native modules
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Create non-root user for security
RUN addgroup -S coderunner && adduser -S coderunner -G coderunner
RUN chown -R coderunner:coderunner /app

# Create temp directory for code execution
RUN mkdir -p /tmp/executions && chown coderunner:coderunner /tmp/executions

# Switch to non-root user
USER coderunner

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/index.js"]
