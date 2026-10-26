FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN mkdir -p uploads && chown -R node:node /app
# Do not run the server as root.
USER node
EXPOSE 4000
CMD ["npm", "start"]
