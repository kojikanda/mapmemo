# DBデータ初期化
docker-compose -f docker-compose.yml exec python python portfolio1/manage.py flush --no-input

# マイグレーション
docker-compose -f docker-compose.yml exec python python portfolio1/manage.py makemigrations
docker-compose -f docker-compose.yml exec python python portfolio1/manage.py migrate

# staticファイル集約化
docker-compose -f docker-compose.yml exec python python portfolio1/manage.py collectstatic --no-input --clear

# Djangoの管理ユーザ登録
docker-compose -f docker-compose.yml exec python python portfolio1/manage.py createsuperuser
