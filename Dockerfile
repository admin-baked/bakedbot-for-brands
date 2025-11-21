# Use the official Playwright image which comes with browsers and dependencies.
FROM mcr.microsoft.com/playwright:v1.45.1-jammy

# Set the working directory inside the container.
WORKDIR /app

# Copy application files into the container.
COPY . .

# Install project dependencies.
RUN npm ci

# Run the end-to-end tests.
CMD ["npx", "playwright", "test"]
