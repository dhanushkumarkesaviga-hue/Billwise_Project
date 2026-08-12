FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY target/api-gateway-*.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-Djava.net.preferIPv4Stack=true", "-jar", "app.jar"]
