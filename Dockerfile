
# Use the official Playwright image which has all the necessary dependencies.
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

# Set the working directory inside the container.
WORKDIR /app

# Copy application code to the container.
COPY . .

# Install npm dependencies.
RUN npm ci

# Run the Playwright tests. The 'npm run test:e2e' command will be executed.
CMD ["npm", "run", "test:e2e"]
