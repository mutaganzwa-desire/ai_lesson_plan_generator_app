FROM nginx:1.27-alpine

LABEL maintainer="mutaganzwadesire"

COPY . /usr/share/nginx/html

EXPOSE 80
