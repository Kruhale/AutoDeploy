FROM eclipse-temurin:21-jdk AS build

WORKDIR /app

RUN apt-get update -q && apt-get install -y -q maven && rm -rf /var/lib/apt/lists/*

COPY pom.xml .

RUN mvn dependency:go-offline -q

COPY src src

RUN mvn package -DskipTests -q


FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
