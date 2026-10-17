# WEB-11: multi-stage сборка фронтенда покупателя.
# stage 1 — сборка (Node 22, как .nvmrc); stage 2 — раздача (nginx).

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json .npmrc ./
COPY packages packages
COPY apps apps

# npm ci (legacy-peer-deps из .npmrc), затем сборка web
RUN npm ci && npm run build -w @podbor/web

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]