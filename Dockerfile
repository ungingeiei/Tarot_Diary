# ---------------------------------------------------------------------
# Dockerfile — the image ECS runs (see infra/terraform/)
# ---------------------------------------------------------------------
# Three stages so the final image carries no build tools, no source and
# no dev dependencies — only what `node server.js` actually opens.
#
# Needs `output: "standalone"` in next.config.mjs. Without it the
# .next/standalone directory the runner stage copies does not exist and
# the build fails at the COPY line, which is the error to look for.
#
# Build and push (replace the account id and region):
#   aws ecr get-login-password --region us-east-1 \
#     | docker login --username AWS --password-stdin <acct>.dkr.ecr.us-east-1.amazonaws.com
#   docker build --platform linux/amd64 -t tarot-diary .
#   docker tag tarot-diary <acct>.dkr.ecr.us-east-1.amazonaws.com/tarot-diary:latest
#   docker push          <acct>.dkr.ecr.us-east-1.amazonaws.com/tarot-diary:latest
#
# --platform linux/amd64 matters on an Apple Silicon Mac: the ECS
# instances are x86, and an arm64 image built by accident fails to start
# with "exec format error".
# ---------------------------------------------------------------------

# ----- Stage 1: dependencies -----
FROM node:22-alpine AS deps
WORKDIR /app
# Only the manifests, so this layer is cached until a dependency really
# changes — editing a page does not reinstall node_modules.
COPY package.json package-lock.json ./
RUN npm ci

# ----- Stage 2: build -----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next collects telemetry during the build unless this is set.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ----- Stage 3: what actually runs -----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Not root. A container that is compromised should not also be the
# superuser of its own filesystem.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# `standalone` already contains the trimmed node_modules and server.js.
# static/ and public/ are not traced into it and have to come separately,
# or every stylesheet and image 404s.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# The schema loader, and the .sql files it reads (which arrived with
# public/ above). RDS has no public route, so this image is the only
# thing that can reach the database — see scripts/migrate.mjs. It reuses
# the mysql2 already traced into standalone, so it adds no dependencies.
COPY --from=builder --chown=nextjs:nodejs /app/scripts/migrate.mjs ./scripts/migrate.mjs

USER nextjs
EXPOSE 3000
ENV PORT=3000
# 0.0.0.0, not localhost: the ALB reaches the container from outside it.
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
