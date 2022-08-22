# pull official base image
FROM python:3.10-alpine

# create app user
ARG OS_USER
ARG OS_GROUP
RUN addgroup -S $OS_GROUP && adduser -S $OS_USER -G $OS_GROUP

# create application directory
ENV APP_HOME=/usr/src/app
RUN mkdir -p $APP_HOME && \
    mkdir -p $APP_HOME/portfolio1 && \
    mkdir -p /var/run/uwsgi

# copy application project data
WORKDIR $APP_HOME
COPY ./portfolio1 ./portfolio1
COPY ./requirements.txt .
COPY ./wait_for_postgres.sh .

# install dependencies
RUN apk update && \
    apk add gcc python3-dev python3-tkinter musl-dev libpq postgresql13-dev postgresql13-client linux-headers && \
    pip install --upgrade pip && \
    pip install -r $APP_HOME/requirements.txt

# chown all the files to app user
RUN chown -R $OS_USER:$OS_GROUP $APP_HOME
RUN chown -R $OS_USER:$OS_GROUP /var/run/uwsgi

# switch to app user
USER $OS_USER
