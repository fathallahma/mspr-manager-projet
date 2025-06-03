# Utiliser une image légère avec Java 21
FROM eclipse-temurin:21-jre-alpine

# Définir le dossier de travail
WORKDIR /app

# Définir un volume pour les fichiers temporaires (utilisé par Spring Boot)
VOLUME /tmp

# Exposer le port utilisé par Spring Boot
EXPOSE 8080

# Argument : chemin vers le JAR
ARG JAR_FILE=target/*.jar

# Copier le JAR dans l’image Docker
COPY ${JAR_FILE} app.jar

# Lancer l'application
ENTRYPOINT ["java", "-jar", "app.jar"]
