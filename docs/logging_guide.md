# Application Logging Guide

This document explains the logging architecture within the application, how the logger is used in server actions (e.g., `app/actions/etims.ts`), how logs are persisted to files, and the Dockerfile permissions required for saving log files.

## 1. Logger Initialization and Configuration
The application uses the `winston` logging library combined with the `winston-daily-rotate-file` transport to capture and manage application logs. The configuration is defined in `lib/logger.ts`.

### Log Formats
Logs are formatted to include a timestamp, case-insensitive log level, the message, and an optional stringified JSON metadata (payload) object:
`[YYYY-MM-DD HH:mm:ss] LEVEL: message { ...meta }`

### Transports
Two destinations (transports) are configured for the logs:
1. **Console Transport**: Outputs logs to the standard output (stdout/stderr) for real-time tracking, primarily useful in development or for tools that consume docker logs.
2. **Daily Rotate File Transport**: Persists logs to the local file system with automatic log rotation.
   - **Path**: `logs/application-%DATE%.log`
   - **Rotation Pattern**: A new file is created each day (`YYYY-MM-DD`).
   - **Size Limit**: Each file is capped at 20 Megabytes (`maxSize: '20m'`).
   - **Retention**: Log files are kept for 14 days (`maxFiles: '14d'`). Older files are automatically deleted.
   - **Compression**: Archived files are zipped to save space (`zippedArchive: true`).

## 2. Usage in Server Actions (e.g., `app/actions/etims.ts`)
The initialized singleton logger is imported and used extensively across server components, API routes, and Server Actions to track activity, debugging info, warnings, and errors. 

**Import:**
```typescript
import logger from '@/lib/logger';
```

**Common usage patterns in `app/actions/etims.ts`:**
- **Information/Audit Logs (`logger.info`)**: Captures standard flow execution, request submissions, and API responses. Typically includes contextual metadata like request payloads or identifiers.
  ```typescript
  logger.info(`Looking up customer: ${pinOrId}`);
  logger.info('Invoice API Response:', { data: response.data });
  ```
- **Debug Logs (`logger.debug`)**: Used for finer-grained details, such as tracing exact API callback endpoints or request headers payload processing.
  ```typescript
  logger.debug(`URL: ${BASE_URL}/buyer-initiated/lookup`);
  ```
- **Error Logs (`logger.error`)**: Captures failed processes, network timeouts, or rejected API integrations. It includes the API response status, relevant error data, and the raw error message.
  ```typescript
  logger.error('[Customer Lookup] Error:', {
    status: error.response?.status,
    data: error.response?.data,
    message: error.message,
  });
  ```

## 3. Docker Permissions Logging Setup
Because the logs are persisted to the filesystem under the `logs/` directory by the Node.js application process, specific directory permissions are required when containerizing the application using Docker. 

In a production Docker setup, the Node.js process does not run as the root user for security purposes (Principle of Least Privilege). Instead, the container runs as a dedicated non-root user (e.g., `nextjs` and group `nodejs`). 

If the Node process attempts to write logs to a system path it doesn't own, the process will fail with an `EACCES: permission denied` error. To avoid this, the Dockerfile explicitly creates the target log directory and assigns ownership to the unprivileged process user before the application starts.

**Relevant Dockerfile configuration:**
```dockerfile
# Create the unprivileged user and group
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Create the dedicated logs directory
RUN mkdir logs

# Assign ownership of the logs directory to the newly created unprivileged user allowing write permissions
RUN chown nextjs:nodejs logs

# Switch context to the unprivileged user before starting the application
USER nextjs
```

This guarantees that the `winston` rotation transport has full read/write privileges over the `logs/` directory when creating and rotating `application-YYYY-MM-DD.log` files inside the running container volume.
