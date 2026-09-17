FROM node:22-alpine AS build
WORKDIR /app
RUN npm install -g npm@11
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
RUN npm install -g npm@11
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY api ./api
COPY server ./server
COPY src ./src

EXPOSE 3000
CMD ["npm", "run", "start"]
