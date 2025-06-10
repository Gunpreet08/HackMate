FROM eclipse-temurin:17-jdk-alpine

WORKDIR /app

# Create a non-root user for security
RUN addgroup -S coderunner && adduser -S coderunner -G coderunner
USER coderunner

# Set Java options for memory constraints
ENV JAVA_OPTS="-Xmx512m -Xms64m"

CMD ["jshell"] 