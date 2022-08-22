/**
 * Djangoサーバへのアクセスを行う基底クラス
 */
export class ServerAccessor {
  /**
   * コンストラクタ
   */
  constructor() {
    // NOP
  }

  /**
   * Djangoサーバに送信する。
   * @param {Object<String, *>} jsonData 送信データ(JSON)
   * @param {String} 送信対象のURL
   * @param {Function} done 成功時コールバック
   * @param {Function} fail 失敗時コールバック
   */
  send(jsonData, url, done, fail) {
    // 送信データを文字列化
    const sendData = JSON.stringify(jsonData);

    // Djangoへ通知
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    // Djangoに対して、POSTで通知する時、CSRFトークンが無いとエラーが出るので、
    // クッキーからCSRFトークンを取得してヘッダーに付与する
    const csrftoken = this.getCookie('csrftoken');
    xhr.setRequestHeader('X-CSRFToken', csrftoken);
    xhr.onload = () => {
      if (xhr.status === 200) {
        // 成功
        const resJson = JSON.parse(xhr.responseText);
        done(resJson);
      } else if (xhr.status !== 200) {
        fail('load', xhr);
      }
    };
    xhr.onerror = () => {
      fail('error', xhr);
    };
    xhr.send(sendData);
  }

  /**
   * CSRFトークンを取得する。<br>
   * 参考: https://docs.djangoproject.com/ja/3.2/ref/csrf/
   * @param {String} name 取得対象のクッキー名
   * @returns {String} CSRFトークン
   * @private
   */
  getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        // 指定された値のクッキーかをチェック
        if (cookie.substring(0, name.length + 1) === name + '=') {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }
}
