# DBデータ初期化
docker-compose -f docker-compose.devel.yml exec python python manage.py flush --no-input

# マイグレーション
docker-compose -f docker-compose.devel.yml exec python python manage.py makemigrations
docker-compose -f docker-compose.devel.yml exec python python manage.py migrate

# staticファイル集約化
docker-compose -f docker-compose.devel.yml exec python python manage.py collectstatic --no-input --clear

# Djangoの管理ユーザ登録
docker-compose -f docker-compose.devel.yml exec python python manage.py createsuperuser
