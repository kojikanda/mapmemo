# pull official base image
FROM nginx:1.22-alpine

# copy nginx configuration file
RUN rm /etc/nginx/conf.d/default.conf
COPY ./default.conf /etc/nginx/conf.d
