FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1

# Accept build arguments for public environment variables
ARG NEXT_PUBLIC_ANALYTICS_ENDPOINT
ARG NEXT_PUBLIC_ANALYTICS_WRITE_KEY
ARG NEXT_PUBLIC_ALLOW_DESKTOP_TESTING
ARG NEXT_PUBLIC_WHATSAPP_NUMBER

# Service visibility toggles – control which self-serve items appear on the main menu
ARG NEXT_PUBLIC_SERVICE_SALES_INVOICE
ARG NEXT_PUBLIC_SERVICE_CREDIT_NOTE
ARG NEXT_PUBLIC_SERVICE_BUYER_INITIATED_INVOICES
ARG NEXT_PUBLIC_SERVICE_NIL_FILING
ARG NEXT_PUBLIC_SERVICE_MRI
ARG NEXT_PUBLIC_SERVICE_TOT
ARG NEXT_PUBLIC_SERVICE_ITR
ARG NEXT_PUBLIC_SERVICE_PIN_REGISTRATION
ARG NEXT_PUBLIC_SERVICE_ESLIP
ARG NEXT_PUBLIC_SERVICE_NITA
ARG NEXT_PUBLIC_SERVICE_AHL
ARG NEXT_PUBLIC_SERVICE_TCC_APPLICATION
ARG NEXT_PUBLIC_SERVICE_PIN_RETRIEVE
ARG NEXT_PUBLIC_SERVICE_PIN_CHECK
ARG NEXT_PUBLIC_SERVICE_STAFF_CHECK
ARG NEXT_PUBLIC_SERVICE_STATION
ARG NEXT_PUBLIC_SERVICE_IMPORT_CHECK
ARG NEXT_PUBLIC_SERVICE_PAYROLL

# Expose them as environment variables specifically for the build step
ENV NEXT_PUBLIC_ANALYTICS_ENDPOINT=$NEXT_PUBLIC_ANALYTICS_ENDPOINT
ENV NEXT_PUBLIC_ANALYTICS_WRITE_KEY=$NEXT_PUBLIC_ANALYTICS_WRITE_KEY
ENV NEXT_PUBLIC_ALLOW_DESKTOP_TESTING=$NEXT_PUBLIC_ALLOW_DESKTOP_TESTING
ENV NEXT_PUBLIC_WHATSAPP_NUMBER=$NEXT_PUBLIC_WHATSAPP_NUMBER
ENV NEXT_PUBLIC_SERVICE_SALES_INVOICE=$NEXT_PUBLIC_SERVICE_SALES_INVOICE
ENV NEXT_PUBLIC_SERVICE_CREDIT_NOTE=$NEXT_PUBLIC_SERVICE_CREDIT_NOTE
ENV NEXT_PUBLIC_SERVICE_BUYER_INITIATED_INVOICES=$NEXT_PUBLIC_SERVICE_BUYER_INITIATED_INVOICES
ENV NEXT_PUBLIC_SERVICE_NIL_FILING=$NEXT_PUBLIC_SERVICE_NIL_FILING
ENV NEXT_PUBLIC_SERVICE_MRI=$NEXT_PUBLIC_SERVICE_MRI
ENV NEXT_PUBLIC_SERVICE_TOT=$NEXT_PUBLIC_SERVICE_TOT
ENV NEXT_PUBLIC_SERVICE_ITR=$NEXT_PUBLIC_SERVICE_ITR
ENV NEXT_PUBLIC_SERVICE_PIN_REGISTRATION=$NEXT_PUBLIC_SERVICE_PIN_REGISTRATION
ENV NEXT_PUBLIC_SERVICE_ESLIP=$NEXT_PUBLIC_SERVICE_ESLIP
ENV NEXT_PUBLIC_SERVICE_NITA=$NEXT_PUBLIC_SERVICE_NITA
ENV NEXT_PUBLIC_SERVICE_AHL=$NEXT_PUBLIC_SERVICE_AHL
ENV NEXT_PUBLIC_SERVICE_TCC_APPLICATION=$NEXT_PUBLIC_SERVICE_TCC_APPLICATION
ENV NEXT_PUBLIC_SERVICE_PIN_RETRIEVE=$NEXT_PUBLIC_SERVICE_PIN_RETRIEVE
ENV NEXT_PUBLIC_SERVICE_PIN_CHECK=$NEXT_PUBLIC_SERVICE_PIN_CHECK
ENV NEXT_PUBLIC_SERVICE_STAFF_CHECK=$NEXT_PUBLIC_SERVICE_STAFF_CHECK
ENV NEXT_PUBLIC_SERVICE_STATION=$NEXT_PUBLIC_SERVICE_STATION
ENV NEXT_PUBLIC_SERVICE_IMPORT_CHECK=$NEXT_PUBLIC_SERVICE_IMPORT_CHECK
ENV NEXT_PUBLIC_SERVICE_PAYROLL=$NEXT_PUBLIC_SERVICE_PAYROLL

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Install curl for debugging/healthchecks
RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Create logs directory with correct permissions to allow the Winston file transport to write daily rotate log files
# We grant ownership to the unprivileged nextjs user so that it has the required write permissions without needing root.
RUN mkdir logs
RUN chown nextjs:nodejs logs

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
# set hostname to localhost
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
