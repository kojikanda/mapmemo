import json
import logging
from unittest import result
from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.contrib.auth import login
from django.db import transaction, DatabaseError
from .forms import UserCreationForm
from .models import MapIcon


def main(request):
    """
    メインのビュー処理。

    Args:
        request (HttpRequest): リクエスト

    Returns:
        HttpResponse: レスポンス
    """
    ctx = {"title": "Map Memo"}
    return render(request, "mapmemo/index.html", ctx)


def signup(request):
    """
    ユーザ登録処理。

    Args:
        request (HttpRequest): リクエスト

    Returns:
        HttpResponse: レスポンス
    """
    if request.method == "POST":
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect("mapmemo:main")
    else:
        form = UserCreationForm()
    return render(request, "mapmemo/signup.html", {"form": form})


def save_icon(request):
    """
    指定されたJSONデータ内のMapIconの情報に従い、DB登録・更新・削除を実行する。

    Args:
        request (HttpRequest): リクエスト

    Returns:
        JsonResponse: レスポンス
    """
    result = True
    json_data = json.loads(request.body.decode())
    user = request.user

    # 登録データ
    add_list = json_data["add"]
    # 更新データ
    update_list = json_data["update"]
    # 削除データ
    delete_list = json_data["delete"]
    # 登録したMapIconのIDリスト
    added_icon_id_list = []
    # 仮IDとDBのIDとを紐づけるディクショナリ
    added_id_dict = {}

    # DB登録・更新・削除
    # トランザクション管理し、どれか一つでもエラーが出たら、ロールバックする
    try:
        with transaction.atomic():
            # 登録
            added_icon_id_list = add_icon_to_db(add_list, user)
            # 更新
            update_icon_in_db(update_list)
            # 削除
            delete_icon_from_db(delete_list)
            # 登録したデータについて、仮IDとDBのIDとを紐づけるディクショナリを生成する
            added_id_dict = create_dict_temporary_id_to_new_id(
                add_list, added_icon_id_list
            )
    except Exception as ex:
        # 例外発生時はraiseして、クライアントに500番のエラーを返すようにする
        print(ex)
        raise

    # 応答
    ret = {}
    ret["result"] = result
    ret["added_id_dict"] = added_id_dict
    return JsonResponse(ret)


def add_icon_to_db(json_list, user):
    """
    MapIconの新規追加を実行する。

    Args:
        json_list (list[dict[str, str | int | float]]): MapIconの追加情報を持つJSONデータ
        user (User): ユーザ

    Returns:
        list[int]: 登録したMapIconのIDリスト
    """
    # JSONデータからDBに追加するMapIconを生成
    icon_list = create_new_mapicon_from_json_list(json_list, user)
    id_list = []

    if len(icon_list) > 0:
        # DBに登録
        MapIcon.objects.bulk_create(icon_list)

        # DBに登録したMapIconからIDを取り出す
        for icon in icon_list:
            id_list.append(icon.id)

    return id_list


def update_icon_in_db(json_list):
    """
    MapIconの更新を実行する。

    Args:
        json_list (list[dict[str, str | int | float]]): MapIconの更新情報を持つJSONデータ
    """
    # JSONデータから更新するMapIconを生成
    icon_list = create_update_mapicon_from_json_list(json_list)

    if len(icon_list) > 0:
        # DBを更新
        fields = ["coord_x", "coord_y", "image_file_name", "memo"]
        MapIcon.objects.bulk_update(icon_list, fields)


def delete_icon_from_db(json_list):
    """
    MapIconの削除を実行する。

    Args:
        json_list (list[dict[str, str | int | float]]): MapIconの削除情報を持つJSONデータ
    """
    # JSONデータから更新するMapIconのIDの情報を取得
    id_list = get_id_list_and_dict_from_json_list(json_list)["id_list"]

    if len(id_list) > 0:
        # DBから削除
        MapIcon.objects.filter(id__in=id_list).delete()


def create_new_mapicon_from_json_list(json_list, user):
    """
    JSONデータからMapIconを生成する。

    Args:
        json_list (list[dict[str, str | int | float]]): MapIconの情報を格納したJSONデータ
        user (User): ユーザ

    Returns:
        list[MapIcon]: MapIconのリスト
    """
    print(json_list)
    icon_list = []
    for data in json_list:
        coord_x = data["coord_x"]
        coord_y = data["coord_y"]
        image_file_name = data["image_file_name"]
        memo = data["memo"]
        user_id = user

        icon = MapIcon(
            coord_x=coord_x,
            coord_y=coord_y,
            image_file_name=image_file_name,
            memo=memo,
            user_id=user_id,
        )
        icon_list.append(icon)

    return icon_list


def create_dict_temporary_id_to_new_id(json_list, id_list):
    """
    キー: JSONデータのID, 値: DBのIDのディクショナリを生成する。

    Args:
        json_list (list[dict[str, str | int | float]]): MapIconの情報を格納したJSONデータ
        id_list (list[int]): DBに登録したMapIconのIDリスト

    Returns:
        dict[int, int]: キー: JSONデータのID, 値: DBのIDのディクショナリ
    """
    id_to_new_id = {}
    for loop_cnt in range(len(json_list)):
        json_data = json_list[loop_cnt]
        temp_id = json_data["id"]
        id_to_new_id[temp_id] = id_list[loop_cnt]

    return id_to_new_id


def create_update_mapicon_from_json_list(json_list):
    """
    JSONのデータの情報から更新するMapIconデータを生成する。

    Args:
        json_list (list[dict[str, str | int | float]]): MapIconの更新情報を持つJSONデータ

    Returns:
        list[MapIcon]: MapIconの更新データ
    """
    update_data = get_id_list_and_dict_from_json_list(json_list)
    id_list = update_data["id_list"]
    id_dict = update_data["id_dict"]

    icon_list = []
    if len(id_list) > 0:
        # 更新対象のデータをDBから取得
        icon_list = MapIcon.objects.filter(id__in=id_list)

        # DBから取得したデータをJSONのデータで更新
        for icon in icon_list:
            update_mapicon_by_json(id_dict[icon.id], icon)

    return icon_list


def update_mapicon_by_json(icon_json, icon_dst):
    """
    MapIconの情報を他のMapIconの情報(JSON)で更新する。
    但し、ユーザは更新不可。

    Args:
        icon_json (dict[str, str | int | float]): 更新元のMapIconのJSONデータ
        icon_dst (MapIcon): 更新先のMapIcon
    """
    icon_dst.coord_x = icon_json["coord_x"]
    icon_dst.coord_y = icon_json["coord_y"]
    icon_dst.image_file_name = icon_json["image_file_name"]
    icon_dst.memo = icon_json["memo"]


def get_id_list_and_dict_from_json_list(json_list):
    """
    JSONデータからMapIconのIDのリストと、IDをキーとしたディクショナリを取得する。

    Args:
        json_list (list[dict[str, str | int | float]]): MapIconの情報を格納したJSONデータ

    Returns:
        dict[str, list[int] | dict[str, str | int | float]]: IDのリスト、またはIDをキーとしたJSONデータのディクショナリを値として持つディクショナリ
    """
    id_list = []
    id_dict = {}
    for data in json_list:
        if "id" in data:
            id_list.append(data["id"])
            id_dict[data["id"]] = data

    ret = {}
    ret["id_list"] = id_list
    ret["id_dict"] = id_dict
    return ret


def load_icon(request):
    """
    指定されたロードの情報に従い、DBからアイコンの情報を取得し、クライアントに返却する。

    Args:
        request (HttpRequest): リクエスト

    Returns:
        JsonResponse: レスポンス
    """
    # debug start ->
    logger = logging.getLogger(__name__)
    logger.info('<<<<<##### called load_icon #####>>>>>')
    # debug end <-

    json_data = json.loads(request.body.decode())
    user = request.user

    # ロードする矩形座標
    load_extent = json_data["loadExtent"]

    # DB検索
    icon_list = MapIcon.objects.filter(
        user_id__id=user.id,
        coord_x__gte=load_extent[0],
        coord_y__gte=load_extent[1],
        coord_x__lte=load_extent[2],
        coord_y__lte=load_extent[3],
    )

    # 応答
    ret = {}
    ret["icon_list"] = []
    for data in icon_list:
        res_data = {}
        res_data["coord_x"] = data.coord_x
        res_data["coord_y"] = data.coord_y
        res_data["image_file_name"] = data.image_file_name
        res_data["memo"] = data.memo
        res_data["id"] = data.id
        ret["icon_list"].append(res_data)

    return JsonResponse(ret)
