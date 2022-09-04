import json
import logging
from django.http import HttpResponse


def healthcheck(request):
    """
    AWS ECSのヘルスチェックに対応する応答処理。

    Args:
        request (HttpRequest): リクエスト

    Returns:
        HttpResponse: レスポンス
    """
    # debug start ->
    # logger = logging.getLogger(__name__)
    # logger.info("healthcheck header=" + json.dumps(request.headers._store))
    # logger.info("healthcheck host=" + json.dumps(request.headers._store['host'][1]))
    # debug end <-
    return HttpResponse()
