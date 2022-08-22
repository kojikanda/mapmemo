import 'bootstrap/dist/css/bootstrap.min.css';
import { MapDrawer } from './MapDrawer';
import { Modal } from 'bootstrap';

/**
 * loadイベントハンドラ
 */
window.onload = () => {
  const mapDrawer = new MapDrawer();
  let saveIconModal = null;

  // デフォルトでは右クリックメニューを出さない
  document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  // アイコンメニュー表示のイベントハンドラ
  document.getElementById('addicon').addEventListener('click', () => {
    const menuElem = document.getElementById('addiconmenu');
    menuElem.classList.toggle('openaddiconmenu');
  });

  // アイコンメニュークリック時のイベントハンドラ
  document.getElementById('iconpointred').addEventListener('click', () => {
    mapDrawer.startMoveIcon('point_red.png');
  });
  document.getElementById('iconpointpurple').addEventListener('click', () => {
    mapDrawer.startMoveIcon('point_purple.png');
  });
  document.getElementById('iconpointorange').addEventListener('click', () => {
    mapDrawer.startMoveIcon('point_orange.png');
  });
  document.getElementById('iconpointyellow').addEventListener('click', () => {
    mapDrawer.startMoveIcon('point_yellow.png');
  });
  document.getElementById('iconpointgreen').addEventListener('click', () => {
    mapDrawer.startMoveIcon('point_green.png');
  });
  document.getElementById('iconpointcyan').addEventListener('click', () => {
    mapDrawer.startMoveIcon('point_cyan.png');
  });
  document.getElementById('iconpointblue').addEventListener('click', () => {
    mapDrawer.startMoveIcon('point_blue.png');
  });
  document.getElementById('iconpointblack').addEventListener('click', () => {
    mapDrawer.startMoveIcon('point_black.png');
  });

  // ログインメニュークリック時のイベントハンドラ
  if (document.getElementById('login') !== null) {
    document.getElementById('login').addEventListener('click', () => {
      window.location.href = '/mapmemo/login/';
    });
  }

  // 保存メニュークリック時のイベントハンドラ
  if (document.getElementById('saveicon') !== null) {
    document.getElementById('saveicon').addEventListener('click', () => {
      // 確認のダイアログを表示
      const modalElem = document.getElementById('determine_saveicon_dialog');
      saveIconModal = new Modal(modalElem);
      saveIconModal.show();
    });
  }

  // ダイアログの保存ボタン押下時のイベントハンドラ
  document.getElementById('determine_saveicon').addEventListener('click', () => {
    // ダイアログを閉じる
    saveIconModal.hide();
    saveIconModal = null;
    // 保存処理実行
    mapDrawer.saveIcon(
      () => {
        showCommonDialog('アイコン状態保存', '保存が成功しました。');
      },
      (result, xhr) => {
        if (xhr === null) {
          const cancelBody = 'ログインしていないか、保存対象のアイコンが無いために登録できません。';
          showCommonDialog('エラー', cancelBody);
        } else {
          showCommunicationErrorDialog(result, xhr);
        }
      }
    );
  });

  // ログアウトメニュークリック時のイベントハンドラ
  if (document.getElementById('logout') !== null) {
    document.getElementById('logout').addEventListener('click', () => {
      window.location.href = '/mapmemo/logout/';
    });
  }

  showMap(mapDrawer);
};

/**
 * 地図表示メソッド
 * @param {MapDrawer} 地図描画クラス
 */
function showMap(mapDrawer) {
  const center = [15083298, 4123482];
  const zoom = 17;
  mapDrawer.showMap(center, zoom, showCommunicationErrorDialog);
}

/**
 * 通信エラー発生時ダイアログ表示メソッド
 * @param {String} result エラー種別
 * @param {XMLHttpRequest} xhr XMLHttpRequest
 */
function showCommunicationErrorDialog(result, xhr) {
  const title = 'エラー';
  let body = '通信エラーが発生しました。';
  if (result === 'load') {
    body = 'エラーが発生しました。HTTP status: ' + xhr.status;
  }

  showCommonDialog(title, body);
}

/**
 * 共通ダイアログ表示メソッド
 * @param {String} title タイトル
 * @param {String} body 内容
 */
function showCommonDialog(title, body) {
  // タイトル
  const titleElem = document.getElementById('common_dialog_title');
  titleElem.innerHTML = title;

  // 内容
  const bodyElem = document.getElementById('common_dialog_body');
  while (bodyElem.firstChild) {
    bodyElem.removeChild(bodyElem.firstChild);
  }
  const bodyParagraph = document.createElement('p');
  bodyParagraph.innerHTML = body;
  bodyElem.appendChild(bodyParagraph);

  // エラーダイアログ表示
  const modalElem = document.getElementById('common_dialog');
  const errorModal = new Modal(modalElem);
  errorModal.show();
}
