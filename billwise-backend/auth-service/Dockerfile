FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY target/auth-service-*.jar app.jar
EXPOSE 8082
ENTRYPOINT ["java", "-Djava.net.preferIPv4Stack=true", "-jar", "app.jar"]
