FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 3000

# Next.js dev server must bind to 0.0.0.0 to be accessible from outside the container
CMD ["npx", "next", "dev", "--hostname", "0.0.0.0"]
