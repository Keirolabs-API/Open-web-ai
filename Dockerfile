# Serves the live demo (example/) and the package (src/, docs/) over HTTP.
# The package has no build step and no backend — this just hosts the static files.
#
#   docker build -t loginwith-openrouter .
#   docker run --rm -p 8080:80 loginwith-openrouter
#   open http://localhost:8080/example/

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]