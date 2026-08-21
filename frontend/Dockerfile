FROM node:20-alpine

WORKDIR /app

# Copy dependency configs
COPY package.json package-lock.json /app/

# Install dependencies
RUN npm install

# Copy application files
COPY . /app/

# Expose Vite dev server port
EXPOSE 5173

# Start dev server with --host 0.0.0.0 to allow container network access
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
