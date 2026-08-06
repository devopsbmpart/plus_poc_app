FROM node:22-alpine

WORKDIR /app
COPY package.json ./
COPY src ./src

ENV PORT=8080
EXPOSE 8080

# 의존성이 없으므로 install 단계가 필요 없다. 이미지가 작고 빌드가 빠르다.
CMD ["node", "src/server.js"]
