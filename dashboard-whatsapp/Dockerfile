# Etapa 1: Construcción
FROM node:20-alpine AS build
WORKDIR /app

# Argumento para el modo de build
ARG VITE_ENV_MODE=production

COPY package*.json ./
RUN npm install
COPY . .

# Usa el argumento para construir con el modo correcto
RUN npm run build -- --mode ${VITE_ENV_MODE}

# Etapa 2: Servidor de Producción
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]