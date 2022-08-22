import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import MousePosition from 'ol/control/MousePosition';
import { createStringXY } from 'ol/coordinate';
import Select from 'ol/interaction/Select';
import { pointerMove, click } from 'ol/events/condition';
import Overlay from 'ol/Overlay';
import { bbox } from 'ol/loadingstrategy';
import { IconOperationManager } from './IconOperationManager';
import { IconFeatureUtils } from './IconFeatureUtils';
import { IconLoader } from './IconLoader';
import { ContextMenu } from './ContextMenu';

/**
 * 地図描画クラス
 */
export class MapDrawer {
  /**
   * メモ表示時のOverlay移動量(px)
   * @type {Array<Number>}
   * @private
   */
  static MEMO_MOVE_POSITION = [20, 140];

  /**
   * ロードするメッシュのサイズ(px)
   */
  static LOAD_MESH_SIZE = [250, 250];

  /**
   * 右クリックメニューのid名
   */
  static CONTEXT_MENU_ID = 'contextmenu';

  /**
   * 右クリックメニューのclass名
   */
  static CONTEXT_MENU_CLASS = 'contextmenu';

  /**
   * コンストラクタ
   */
  constructor() {
    /**
     * Mapクラス
     * @type {Map}
     * @private
     */
    this.map;

    /**
     * アイコン表示レイヤ
     * @type {VectorLayer}
     * @private
     */
    this.iconLayer;

    /**
     * アイコン一時表示用レイヤ
     * @type {VectorLayer}
     * @private
     */
    this.tempIconLayer;

    /**
     * 移動中アイコンのFeature
     * @type {Feature}
     * @private
     */
    this.movingIconFeature = null;

    /**
     * アイコン一時描画時ポインタムーブイベントハンドラ
     * @type {Function}
     * @private
     */
    this.moveIconEventHandler = null;

    /**
     * アイコン位置決定時クリックイベントハンドラ
     * @type {Function}
     * @private
     */
    this.determinIconPosiEventHandler = null;

    /**
     * アイコン一時描画キャンセル時イベントハンドラ
     * @type {Function}
     * @private
     */
    this.cancelMoveIconEventHandler = null;

    /**
     * アイコン選択(ポインタムーブ)インタラクション
     * @type {Select}
     * @private
     */
    this.iconPointerMoveSelect = null;

    /**
     * アイコン選択(クリック)インタラクション
     * @type {Select}
     * @private
     */
    this.iconClickSelect = null;

    /**
     * アイコン選択(右クリック)インタラクション
     * @type {Select}
     * @private
     */
    this.iconRightClickSelect = null;

    /**
     * メモのOverlay
     * @type {Overlay}
     * @private
     */
    this.showedMemoOverlay = null;

    /**
     * 選択済みアイコン
     * @type {Feature}
     * @private
     */
    this.selectedFeature = null;

    /**
     * アイコン削除用右クリックメニュー
     */
    this.deleteContextMenu = null;

    /**
     * アイコン追加キャンセル用右クリックメニュー
     */
    this.cancelAddingContextMenu = null;

    /**
     * アイコン操作マネージャ
     * @type {IconOperationManager}
     * @private
     */
    this.iconOperationManager = this.createIconOperationManager();

    /**
     * アイコンローダー
     * @type {IconLoader}
     * @private
     */
    this.iconLoader = new IconLoader(MapDrawer.LOAD_MESH_SIZE);
  }

  /**
   * アイコン操作マネージャを生成する。
   * @returns {IconOperationManager} アイコン操作マネージャ
   * @private
   */
  createIconOperationManager() {
    const manager = new IconOperationManager();
    const userNameElem = document.getElementById('username');
    if (userNameElem !== null) {
      const userId = parseInt(userNameElem.dataset.userid);
      manager.setUserId(userId);
    }

    return manager;
  }

  /**
   * 地図描画を実行する。
   * @param {Array<Number>} center 中心座標
   * @param {Number} zoom ズームレベル
   * @param {Function} loadErrorCallback ロードエラー時コールバック
   */
  showMap(center, zoom, loadErrorCallback) {
    // Layer(OSM)
    const osmLayer = new TileLayer({
      source: new OSM({
        url: 'https://tile.openstreetmap.jp/{z}/{x}/{y}.png'
      })
    });

    // Layer(アイコン表示用)
    const iconLayerSource = new VectorSource({
      loader: (extent, resolution, projection, success, failure) => {
        // ログインしていないときはロードしない
        if (document.getElementById('username') === null) {
          return;
        }

        // 地図表示領域が更新されたときのロードを実行
        const done = function (featureList) {
          // ロード成功時は、まだ追加していないFeatureのみをSourceに追加
          featureList.forEach((feature) => {
            if (iconLayerSource.getFeatureById(feature.getId()) === null) {
              iconLayerSource.addFeature(feature);
            }
          });

          success(featureList);
        };
        const fail = function (result, xhr) {
          iconLayerSource.removeLoadedExtent(extent);
          failure();

          // エラーダイアログ表示
          loadErrorCallback(result, xhr);
        };
        this.iconLoader.load(extent, resolution, done, fail);
      },
      strategy: bbox
    });
    this.iconLayer = new VectorLayer({
      source: iconLayerSource
    });

    // Layer(アイコン一時表示用)
    this.tempIconLayer = new VectorLayer({
      source: new VectorSource()
    });

    // Map
    this.map = new Map({
      layers: [osmLayer, this.iconLayer, this.tempIconLayer],
      target: 'map',
      view: new View({
        minZoom: 15,
        maxZoom: 18,
        center: center,
        zoom: zoom
      })
    });

    // マウスポジション
    const mouseControl = new MousePosition({
      coordinateFormat: createStringXY(4)
    });
    this.map.addControl(mouseControl);

    // アイコン選択モードにする
    this.startSelectIcon();
  }

  /**
   * アイコン選択を開始する。
   */
  startSelectIcon() {
    if (this.iconPointerMoveSelect !== null) {
      return;
    }

    // ポインタムーブイベントハンドラを解除
    if (this.moveIconEventHandler !== null) {
      this.map.un('pointermove', this.moveIconEventHandler);
      this.moveIconEventHandler = null;
    }

    // クリックイベントハンドラを解除
    if (this.determinIconPosiEventHandler !== null) {
      this.map.un('click', this.determinIconPosiEventHandler);
      this.determinIconPosiEventHandler = null;
    }

    // 右クリックイベントハンドラを解除
    if (this.cancelMoveIconEventHandler !== null) {
      this.map.un('contextmenu', this.cancelMoveIconEventHandler);
      this.cancelMoveIconEventHandler = null;
    }

    // アイコン選択(ポインタムーブ)インタラクションを設定
    this.iconPointerMoveSelect = new Select({
      condition: pointerMove,
      layers: [this.iconLayer],
      style: (feature) => {
        return this.createHighlightIconStyle(feature);
      }
    });
    this.map.addInteraction(this.iconPointerMoveSelect);

    // アイコン選択(クリック)インタラクションを設定
    this.iconClickSelect = new Select({
      condition: click,
      layers: [this.iconLayer],
      style: (feature) => {
        return this.createSelectedIconStyle(feature);
      }
    });
    const onSelectIconEventHandler = (event) => {
      this.onSelectIcon(event);
    };
    this.iconClickSelect.on('select', onSelectIconEventHandler);
    this.map.addInteraction(this.iconClickSelect);

    // アイコン選択(右クリック)インタラクションを設定
    this.iconRightClickSelect = new Select({
      // ol/events/conditionに右クリックを判定する実装が無いため、独自の処理を作成し設定
      condition: (mapBrowserEvent) => {
        return mapBrowserEvent.type == 'contextmenu';
      },
      layers: [this.iconLayer],
      style: (feature) => {
        return this.createHighlightIconStyle(feature);
      }
    });
    const onRightClickSelectIconEventHandler = (event) => {
      this.onRightClickSelectIcon(event);
    };
    this.iconRightClickSelect.on('select', onRightClickSelectIconEventHandler);
    this.map.addInteraction(this.iconRightClickSelect);
  }

  /**
   * アイコン一時描画を開始する。
   * @param {String} imageFileName アイコンのファイル名
   */
  startMoveIcon(imageFileName) {
    if (this.moveIconEventHandler !== null) {
      return;
    }

    // アイコン選択(ポインタムーブ)インタラクションを解除
    if (this.iconPointerMoveSelect !== null) {
      this.map.removeInteraction(this.iconPointerMoveSelect);
      this.iconPointerMoveSelect = null;
    }

    // アイコン選択(クリック)インタラクションを解除
    if (this.iconClickSelect !== null) {
      this.map.removeInteraction(this.iconClickSelect);
      this.iconClickSelect = null;
    }

    // アイコン選択(右クリック)インタラクションを解除
    if (this.iconRightClickSelect !== null) {
      this.map.removeInteraction(this.iconRightClickSelect);
      this.iconRightClickSelect = null;
    }

    // ポインタムーブイベントハンドラを設定
    this.moveIconEventHandler = (event) => {
      this.onMoveIcon(event, imageFileName);
    };
    this.map.on('pointermove', this.moveIconEventHandler);

    // クリックイベントハンドラを設定
    // singleclickイベントだと、OLのイベント通知が遅く、既にクリック済みにも関わらず、
    // 先に何度かpointermoveイベントが来て、少しアイコンが動く挙動が見えてしまうので、
    // clickイベントを使用する。
    this.determinIconPosiEventHandler = (event) => {
      this.onDetermineIconPosition(event);
    };
    this.map.on('click', this.determinIconPosiEventHandler);

    // 右クリックイベントハンドラを設定
    this.cancelMoveIconEventHandler = (event) => {
      this.onCancelDeterminingIconPosition(event);
    };
    this.map.on('contextmenu', this.cancelMoveIconEventHandler);
  }

  /**
   * アイコン一時描画時のイベントハンドラ。
   * @param {MapBrowserEvent} event マップブラウザイベント
   * @param {String} imageFileName アイコンのファイル名
   * @private
   */
  onMoveIcon(event, imageFileName) {
    if (event.dragging) {
      return;
    }

    // アイコンのポリゴン座標
    const iconCoord = this.getIconCoord(event.coordinate);

    if (this.movingIconFeature === null) {
      // 初回は新規作成
      this.movingIconFeature = IconFeatureUtils.createFeature(iconCoord, imageFileName, null, null);
      // 一時表示用レイヤにFeatureを投入
      this.tempIconLayer.getSource().addFeature(this.movingIconFeature);
    } else {
      // 2回目以降は座標のみ更新
      this.movingIconFeature.getGeometry().setCoordinates(iconCoord);
    }
  }

  /**
   * アイコン位置決定時のイベントハンドラ。
   * @param {MapBrowserEvent} event マップブラウザイベント
   * @private
   */
  onDetermineIconPosition(event) {
    if (this.movingIconFeature !== null) {
      // アイコンのポリゴン座標
      const iconCoord = this.getIconCoord(event.coordinate);
      this.movingIconFeature.getGeometry().setCoordinates(iconCoord);

      // 一時表示用レイヤからFeatureを取り除き、表示用レイヤに投入
      this.tempIconLayer.getSource().removeFeature(this.movingIconFeature);
      this.iconLayer.getSource().addFeature(this.movingIconFeature);

      // アイコン操作マネージャに登録するFeatureを通知
      this.iconOperationManager.setAddIconFeatures([this.movingIconFeature]);

      this.movingIconFeature = null;
    }

    // アイコン選択モードに戻る
    this.startSelectIcon();
  }

  /**
   * アイコン位置決定キャンセル時のイベントハンドラ。
   * @private
   */
  onCancelDeterminingIconPosition() {
    let clickEventHandler = null;

    // 既に生成している右クリックメニューは削除
    const endContextMenu = () => {
      if (this.cancelAddingContextMenu !== null) {
        this.cancelAddingContextMenu.end();
        this.cancelAddingContextMenu = null;
      }
    };
    endContextMenu();

    // キャンセル用の右クリックメニューを生成し表示する
    this.cancelAddingContextMenu = new ContextMenu(MapDrawer.CONTEXT_MENU_ID, MapDrawer.CONTEXT_MENU_CLASS);
    this.cancelAddingContextMenu.addMenu('キャンセル', () => {
      // 一時表示用レイヤからFeatureを削除
      this.tempIconLayer.getSource().removeFeature(this.movingIconFeature);
      this.movingIconFeature = null;

      endContextMenu();
      this.map.un('click', clickEventHandler);

      // アイコン選択モードに戻る
      this.startSelectIcon();
    });
    this.cancelAddingContextMenu.start();

    // キャンセルメニューを選択せずにクリックしたときは、アイコン位置決定の動作を優先し、
    // キャンセル用の右クリックメニューは削除する
    clickEventHandler = () => {
      endContextMenu();
      this.map.un('click', clickEventHandler);
    };
    this.map.on('click', clickEventHandler);
  }

  /**
   * アイコン選択時のイベントハンドラ。
   * @param {MapBrowserEvent} event マップブラウザイベント
   * @private
   */
  onSelectIcon(event) {
    // 既に表示済みのメモを削除
    if (this.showedMemoOverlay !== null) {
      this.map.removeOverlay(this.showedMemoOverlay);
      this.showedMemoOverlay = null;
    }

    const features = event.target.getFeatures();
    if (features.getLength() > 0) {
      // マップ上に選択したアイコンのメモを表示
      const feature = features.getArray()[0];

      // 新たなメモを表示
      this.showedMemoOverlay = this.createMemoOverlay(feature);
      const posPoint = feature.getGeometry();
      const position = posPoint.getCoordinates();
      // メモの座標を調整
      // CSSで調整しても、Overlayは調整前の場所に残ったままになっており、
      // 地図上には見えないが、このOverlay上でクリックすると、
      // 地図上のクリックイベントを検知できなくなるため、CSSではなくOverlayの座標で調整する。
      const resolution = this.map.getView().getResolution();
      position[0] = position[0] + MapDrawer.MEMO_MOVE_POSITION[0] * resolution;
      position[1] = position[1] + MapDrawer.MEMO_MOVE_POSITION[1] * resolution;
      this.showedMemoOverlay.setPosition(position);
      this.map.addOverlay(this.showedMemoOverlay);

      this.selectedFeature = feature;
    }
  }

  /**
   * 右クリックによるアイコン選択時のイベントハンドラ。
   * @param {MapBrowserEvent} event マップブラウザイベント
   * @private
   */
  onRightClickSelectIcon(event) {
    let clickEventHandler = null;

    // 既に生成している右クリックメニューは削除
    const endContextMenu = () => {
      if (this.deleteContextMenu !== null) {
        this.deleteContextMenu.end();
        this.deleteContextMenu = null;
      }
    };
    endContextMenu();

    const features = event.target.getFeatures();
    if (features.getLength() > 0) {
      const feature = features.getArray()[0];

      // 右クリックでアイコンを選択しているときは、右クリックメニューを生成し表示する
      this.deleteContextMenu = new ContextMenu(MapDrawer.CONTEXT_MENU_ID, MapDrawer.CONTEXT_MENU_CLASS);
      this.deleteContextMenu.addMenu('削除', () => {
        // 削除メニュー選択処理
        if (feature.getId() > 0) {
          // DBに登録済みであれば、アイコン操作マネージャに削除を通知
          this.iconOperationManager.setDeleteIconFeatures([feature]);
        } else {
          // DBに登録していない場合は、アイコン操作マネージャに通知した情報を削除
          this.iconOperationManager.removeAddIconFeatures([feature]);
        }

        // アイコン表示レイヤからFeatureを削除
        this.iconLayer.getSource().removeFeature(feature);

        endContextMenu();
        this.map.un('click', clickEventHandler);
      });
      this.deleteContextMenu.start();

      // クリックで右クリックによるアイコン選択表示を解除するため、イベントハンドラを設定
      clickEventHandler = () => {
        const prop = feature.getProperties();
        feature.setStyle(IconFeatureUtils.createIconNormaStyle(prop.imageFileName));

        // ここで右クリックメニューを削除すると、前回と同じアイコンを選択した時に選択イベントが呼ばれず、
        // 右クリックメニューの設定もできないため、ここでは右クリックメニューを削除しない
        this.map.un('click', clickEventHandler);
      };
      this.map.on('click', clickEventHandler);
    }
  }

  /**
   * マウスポインタの座標からアイコンの座標を算出する。
   * @param {Array<Number>} mousePointerCoord マウスポインタの座標
   * @returns {Array<Number>} アイコンの座標
   * @private
   */
  getIconCoord(mousePointerCoord) {
    // マウスポインタの位置がアイコンの最下部となるように位置を調整
    const resolution = this.map.getView().getResolution();
    const iconHalfSize = (IconFeatureUtils.ICON_SIZE[1] / 2) * resolution;
    const iconCoord = [mousePointerCoord[0], mousePointerCoord[1] + iconHalfSize];
    return iconCoord;
  }

  /**
   * メモのOverlayを生成する。
   * @param {Feature} feature アイコンのFeature
   * @returns {Overlay} メモのOverlay
   * @private
   */
  createMemoOverlay(feature) {
    // Overlayに設定するHTML要素(吹き出し)を生成
    const memoElem = document.createElement('div');
    memoElem.classList.add('memo');

    // 吹き出し内のtextareaを生成
    const memoTextElem = document.createElement('textarea');
    memoTextElem.classList.add('memotextarea');
    memoTextElem.innerHTML = 'メモを入力してください。';
    memoTextElem.oninput = () => {
      // 入力が始まったら、色を正規の色に設定する
      if (memoTextElem.classList.contains('memotextarea_noinput')) {
        memoTextElem.classList.remove('memotextarea_noinput');
      }
    };
    memoTextElem.onchange = () => {
      // 入力完了したらFeatureにメモを保持
      const memo = memoTextElem.value;
      const prop = feature.getProperties();
      prop.memo = memo;
      feature.setProperties(prop, true);

      // 既にDBに登録済みで、メモの更新が行われた時は、アイコン操作マネージャに更新を通知
      if (feature.getId() > 0) {
        this.iconOperationManager.setUpdateIconFeatures([feature]);
      }
    };
    memoElem.appendChild(memoTextElem);

    const prop = feature.getProperties();
    if (prop.memo === undefined) {
      // まだメモを作っていないときは、「メモを入力してください」の表示を行い、表示は薄くする
      memoTextElem.classList.add('memotextarea_noinput');
    } else {
      // 既にメモを作っているときは、作成済みの内容を表示する
      memoTextElem.value = prop.memo;
    }

    // Overlay生成
    const overlay = new Overlay({
      element: memoElem,
      autoPan: {
        animation: {
          duration: 250
        }
      }
    });

    return overlay;
  }

  /**
   * アイコン選択時のStyleを生成する。
   * @param {Feature} feature Feature
   * @returns {Style} Style
   * @private
   */
  createSelectedIconStyle(feature) {
    const prop = feature.getProperties();
    return IconFeatureUtils.createIconNormaStyle(prop.imageFileName);
  }

  /**
   * アイコンハイライト時のStyleを生成する。
   * @param {Feature} feature Feature
   * @returns {Style} Style
   * @private
   */
  createHighlightIconStyle(feature) {
    const resolution = this.map.getView().getResolution();
    const prop = feature.getProperties();
    return IconFeatureUtils.createIconPointerMoveSelectedStyle(prop.imageFileName, resolution);
  }

  /**
   * アイコンの保存を実行する。
   * @param {Function} done 成功時コールバック
   * @param {Function} fail 失敗時コールバック
   */
  saveIcon(done, fail) {
    this.iconOperationManager.save(
      () => {
        done();
      },
      (result, xhr) => {
        fail(result, xhr);
      }
    );
  }
}
