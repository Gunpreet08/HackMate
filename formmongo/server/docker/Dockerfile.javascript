FROM node:18-alpine

WORKDIR /app

# Create a non-root user for security
RUN addgroup -S coderunner && adduser -S coderunner -G coderunner
USER coderunner

# Set memory limit
ENV NODE_OPTIONS="--max-old-space-size=512"

CMD ["node"] 