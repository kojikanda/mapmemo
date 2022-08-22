from tkinter import CASCADE
from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """
    カスタムユーザクラス
    """

    pass


class MapIcon(models.Model):
    """
    マップアイコンクラス
    """

    coord_x = models.FloatField(verbose_name="X座標")
    coord_y = models.FloatField(verbose_name="Y座標")
    image_file_name = models.CharField(verbose_name="イメージファイル名", max_length=255)
    memo = models.CharField(verbose_name="メモ内容", max_length=512, blank=True)
    date_joined = models.DateTimeField(verbose_name="登録日時", auto_now_add=True)
    user_id = models.ForeignKey(
        User, verbose_name="ユーザID", related_name="user_id", on_delete=models.CASCADE
    )

    def __str__(self):
        """
        文字列表現取得メソッド

        Returns:
            str: 文字列表現
        """
        return self.memo
