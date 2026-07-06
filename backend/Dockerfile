# Stage 1 — compilar el JAR ejecutable con Maven
FROM eclipse-temurin:21-jdk AS build

WORKDIR /app

RUN apt-get update -q && apt-get install -y -q maven && rm -rf /var/lib/apt/lists/*

COPY pom.xml .

RUN mvn dependency:go-offline -q

COPY src src

RUN mvn package -DskipTests -q


# Stage 2 — runtime mínimo con JRE
FROM eclipse-temurin:21-jre

WORKDIR /app

# Directorio para logs persistentes (montado como volumen en compose)
RUN mkdir -p /var/log/autodeploy

# Cliente HTTP para el HEALTHCHECK
RUN apt-get update -q && apt-get install -y -q curl && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

# Healthcheck contra Spring Actuator
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -fsS http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
