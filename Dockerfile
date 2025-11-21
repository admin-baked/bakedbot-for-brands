
# Use the official Playwright image which has all browser dependencies.
FROM mcr.microsoft.com/playwright:v1.45.1-jammy

# Set the working directory inside the container.
WORKDIR /app

# Copy package.json and package-lock.json (or other lock files) first
# to leverage Docker layer caching for dependencies.
COPY package*.json ./

# Install npm dependencies.
RUN npm ci

# Copy the rest of your application code into the container.
COPY . .

# Expose the port your Next.js app runs on.
EXPOSE 3001

# The command to run your tests.
# This will be overridden by the execution environment, but it's good practice
# to have a default command.
CMD ["npx", "playwright", "test"]
