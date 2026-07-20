FROM node:22.22.1-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY prisma.config.ts tsconfig.json tsconfig.build.json nest-cli.json ./
COPY prisma ./prisma
COPY src ./src
COPY scripts ./scripts
RUN DATABASE_URL=mysql://build:build@localhost:3306/build npm run prisma:generate
RUN npm run build

FROM node:22.22.1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/src/generated ./src/generated
USER node
EXPOSE 3001
CMD ["node", "dist/src/main.js"]
