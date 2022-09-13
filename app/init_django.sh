#!/bin/sh
# init_django.sh

# 初回判定
# init_django_checkファイルの有無で初期化を実行するか判断
if [ ! -f "../init_django_check" ]; then
  touch ../init_django_check

  >&2 echo "start initialization of django"

  # DBデータ初期化
  # python manage.py flush --no-input

  # マイグレーション
  python manage.py makemigrations
  python manage.py migrate

  # staticファイル集約化
  python manage.py collectstatic --no-input --clear

  # Djangoの管理ユーザ登録
  python manage.py createsuperuser --noinput

  >&2 echo "initialization of django completed"
fi

exec "$@"
