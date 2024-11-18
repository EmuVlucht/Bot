FROM node:20-alpine

RUN apk add --no-cache \
    ffmpeg \
    imagemagick \
    libwebp-tools \
    python3 \
    make \
    g++ \
    git \
    openssl

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 5000

ENV NODE_ENV=production

CMD ["npm", "start"]
