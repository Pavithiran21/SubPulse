# One image for the whole site: Spring Boot serves the React build (STATIC_DIR), so the app, the API and
# the refresh cookie share one origin.

# 1. Build the frontend.
FROM node:26-alpine AS web
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2. Build the API jar (dependencies first, so they are cached between builds).
FROM eclipse-temurin:21-jdk AS api
WORKDIR /app/backend
COPY backend/mvnw backend/pom.xml ./
COPY backend/.mvn .mvn
RUN chmod +x mvnw && ./mvnw -q -B dependency:go-offline
COPY backend/src src
RUN ./mvnw -q -B -DskipTests package

# 3. A small Java 21 runtime with the jar and the built frontend.
FROM eclipse-temurin:21-jre-alpine
ENV PORT=4000 \
    STATIC_DIR=/app/public \
    APP_ENV=production \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -Xss512k"
WORKDIR /app
COPY --from=api /app/backend/target/subpulse-backend.jar app.jar
COPY --from=web /app/frontend/dist /app/public
RUN addgroup -S app && adduser -S app -G app
USER app
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s CMD wget -qO- http://127.0.0.1:${PORT}/api/health || exit 1
# Flyway brings the schema up to date on every start.
CMD ["java", "-jar", "/app/app.jar"]
