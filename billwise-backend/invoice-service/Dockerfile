FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY target/invoice-service-*.jar app.jar
EXPOSE 8083
ENTRYPOINT ["java", "-Djava.net.preferIPv4Stack=true", "-jar", "app.jar"]
