# syntax=docker/dockerfile:1

# ---------- Build ----------
# Java 25 (đặc tả project). Wrapper là "only-script" nên mvnw tự tải Maven 3.9.16.
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app

# Cache lớp dependency: copy pom + wrapper trước, tải deps, rồi mới copy src.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -ntp dependency:go-offline

COPY src/ src/
RUN ./mvnw -B -ntp clean package -DskipTests

# ---------- Runtime ----------
# Nếu tag 25-jre chưa có trên registry thì đổi tạm sang eclipse-temurin:25-jdk.
FROM eclipse-temurin:25-jre AS runtime
WORKDIR /app

# curl để docker healthcheck gọi /v3/api-docs (endpoint public, không cần token).
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -r -u 1001 brewdesk

COPY --from=build /app/target/brewdesk-*.jar app.jar
USER brewdesk

EXPOSE 8080
# MaxRAMPercentage để JVM tôn trọng giới hạn RAM của container.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
