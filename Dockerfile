FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ git

COPY package*.json ./

RUN npm install --production

COPY . .

RUN mkdir -p /app/auth_info

ENV NODE_ENV=production

CMD ["node", "src/index.js"]
