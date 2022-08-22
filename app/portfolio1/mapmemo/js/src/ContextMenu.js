/**
 * 右クリックメニュークラス
 */
export class ContextMenu {
  /**
   * コンストラクタ
   * @param {String} idName ID名
   * @param {String} className クラス名
   */
  constructor(idName, className) {
    /**
     * ID名
     * @type {String}
     * @private
     */
    this.idName = idName;

    /**
     * クラス名
     * @type {String}
     * @private
     */
    this.className = className;

    /**
     * 右クリックメニュー要素
     * @type {Element}
     * @private
     */
    this.menuElem = null;

    /**
     * 右クリックメニュー表示時イベントハンドラ
     * @type {Function}
     * @private
     */
    this.showEventHandler = null;

    /**
     * 右クリックメニュー非表示時イベントハンドラ
     * @type {Function}
     * @private
     */
    this.hideEventHandler = null;

    // 初期化
    this.init();
  }

  /**
   * 初期化処理
   * @private
   */
  init() {
    // 右クリックの要素を生成
    this.menuElem = document.createElement('div');
    this.menuElem.classList.add(this.className);
    this.menuElem.id = this.idName;
    const ulElem = document.createElement('ul');
    this.menuElem.appendChild(ulElem);
  }

  /**
   * 右クリックメニュー開始処理
   */
  start() {
    // bodyに要素を追加
    document.body.appendChild(this.menuElem);

    // 右クリックメニュー表示イベント設定
    this.showEventHandler = (event) => {
      document.getElementById(this.idName).style.left = event.pageX + 'px';
      document.getElementById(this.idName).style.top = event.pageY + 'px';
      document.getElementById(this.idName).style.display = 'block';
    };
    document.body.addEventListener('contextmenu', this.showEventHandler);

    // 右クリックメニューを閉じるイベント設定
    this.hideEventHandler = () => {
      document.getElementById(this.idName).style.display = 'none';
    };
    document.body.addEventListener('click', this.hideEventHandler);
  }

  /**
   * 右クリックメニュー終了処理
   */
  end() {
    // イベント解除
    document.body.removeEventListener('contextmenu', this.showEventHandler);
    document.body.removeEventListener('click', this.hideEventHandler);

    // bodyから要素を削除
    document.body.removeChild(this.menuElem);

    this.menuElem = null;
    this.showEventHandler = null;
    this.hideEventHandler = null;
  }

  /**
   * メニュー追加処理
   * @param {Stirng} label ラベル
   * @param {Function} eventHandler メニュークリック時のイベントハンドラ
   */
  addMenu(label, eventHandler) {
    // 要素生成
    const liElem = document.createElement('li');
    liElem.innerHTML = label;
    liElem.onclick = eventHandler;

    // メニュー追加
    const ulElem = this.menuElem.getElementsByTagName('ul')[0];
    ulElem.appendChild(liElem);
  }
}
