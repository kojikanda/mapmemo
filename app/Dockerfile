# pull official base image
FROM python:3.10-alpine

# create app user
ARG OS_USER
ARG OS_GROUP
RUN addgroup -S $OS_GROUP && adduser -S $OS_USER -G $OS_GROUP

# install Alpine Linux packages
RUN apk update && \
    apk add gcc git python3-dev python3-tkinter musl-dev libpq postgresql13-dev postgresql13-client linux-headers

# git clone application data
# GitHub Credentials are temporarily written to a file.
ARG GITHUB_URL
ARG GITHUB_USER
ARG GITHUB_TOKEN

# (application data get from GitHub)
RUN cd /usr && \
    touch /root/.netrc && \
    echo machine github.com >> /root/.netrc && \
    echo login $GITHUB_USER >> /root/.netrc && \
    echo password $GITHUB_TOKEN >> /root/.netrc && \
    git clone --depth 1 $GITHUB_URL && \
    rm /root/.netrc

# (application data copy from local)
# RUN mkdir -p /usr/mapmemo/app
# WORKDIR /usr/mapmemo/app
# COPY ./portfolio1 ./portfolio1
# COPY ./Dockerfile .
# COPY ./requirements.txt .
# COPY ./wait_for_postgres.sh .
# COPY ./init_django.sh .

# create application directory
RUN mkdir -p /var/run/uwsgi

# application home
ENV APP_HOME=/usr/mapmemo/app
WORKDIR $APP_HOME

# install pip packages
RUN pip install --upgrade pip && \
    pip install -r $APP_HOME/requirements.txt

# expose port
EXPOSE 8000

# chown all the files to app user
RUN chown -R $OS_USER:$OS_GROUP /usr/mapmemo
RUN chown -R $OS_USER:$OS_GROUP /var/run/uwsgi

# switch to app user
USER $OS_USER
