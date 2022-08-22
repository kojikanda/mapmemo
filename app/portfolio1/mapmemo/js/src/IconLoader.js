import { extend } from 'ol/extent';
import { ServerAccessor } from './ServerAccessor';
import { IconFeatureUtils } from './IconFeatureUtils';

/**
 * アイコンローダークラス
 */
export class IconLoader extends ServerAccessor {
  /**
   * コンストラクタ
   * @param {Array<Number>} メッシュサイズ(px)
   */
  constructor(meshSize) {
    super();

    /**
     * メッシュサイズ(px)
     * @type {Array<Number>}
     * @private
     */
    this.meshSize = meshSize;

    /**
     * ロード済みメッシュ
     * <pre><code>
     * {
     *   解像度: {
     *     メッシュのキー: メッシュの座標([sx, sy, ex, ey])
     *   }
     * }
     * </code></pre>
     * @type {Object<String, Object<String, Array<Number>>>}
     * @private
     */
    this.loadedMesh = {};
  }

  /**
   * アイコンをロードする。<br>
   * 指定された地図表示領域の矩形座標に含まれるアイコンをDBから取得し、
   * 取得に成功した時はアイコンの情報をコールバックに渡す。
   * @param {Array<Number>} extent 地図表示領域の矩形座標
   * @param {Number} resolution 解像度
   * @param {Function} done 成功時コールバック
   * @param {Function} fail 失敗時コールバック
   */
  load(extent, resolution, done, fail) {
    // 指定された地図表示領域の座標からロードが必要なメッシュ座標を判断する
    const loadMeshArr = this.getLoadMeshArr(extent, resolution);
    if (loadMeshArr.length === 0) {
      // ロードすべきメッシュが無いときは、処理終了
      done([]);
      return;
    }

    // ロードが必要なメッシュ座標を合成して、一つの矩形座標に変換する
    const loadExtent = this.unifyMeshArrToExtent(loadMeshArr);
    // Djangoに通知するメッシュ座標の情報
    const loadExtentJson = {
      loadExtent: loadExtent
    };

    // Djangoへ通知
    this.send(
      loadExtentJson,
      'loadicon/',
      (resJson) => {
        // ロードしたメッシュを連想配列化し、保持する
        this.setLoadMeshByMeshArr(loadMeshArr, resolution);

        // サーバから取得したアイコンの情報をFeatureに変換し、呼び出し元に返す
        const featureList = this.createFeatureFromJson(resJson);
        done(featureList);
      },
      (result, xhr) => {
        fail(result, xhr);
      }
    );
  }

  /**
   * ロードするメッシュの座標を取得する。
   * @param {Array<Number>} extent 地図表示領域の矩形座標
   * @param {Number} resolution 解像度
   * @returns {Array<Array<Number>>} ロードする矩形座標
   * @private
   */
  getLoadMeshArr(extent, resolution) {
    const meshArr = this.getMeshFromExtent(extent, resolution);
    const loadMeshArr = this.getLoadMeshFromMeshArr(meshArr, resolution);
    return loadMeshArr;
  }

  /**
   * 指定された地図表示領域の矩形座標に含まれるメッシュの座標を取得する。
   * @param {Array<Number>} extent 地図表示領域の矩形座標
   * @param {Number} resolution 解像度
   * @returns {Array<Array<Number>>} 指定された地図表示領域の矩形座標に含まれるメッシュの座標
   * @private
   */
  getMeshFromExtent(extent, resolution) {
    const meshSizeX = this.meshSize[0] * resolution;
    const meshSizeY = this.meshSize[1] * resolution;
    const meshCntMinX = Math.floor(extent[0] / meshSizeX);
    const meshCntMinY = Math.floor(extent[1] / meshSizeY);
    const meshCntMaxX = Math.ceil(extent[2] / meshSizeX);
    const meshCntMaxY = Math.ceil(extent[3] / meshSizeY);

    const meshCoordArr = [];
    for (let loopMeshCntY = meshCntMinY; loopMeshCntY < meshCntMaxY; loopMeshCntY++) {
      for (let loopMeshCntX = meshCntMinX; loopMeshCntX < meshCntMaxX; loopMeshCntX++) {
        const meshSx = meshSizeX * loopMeshCntX;
        const meshSy = meshSizeY * loopMeshCntY;
        const meshEx = meshSizeX * (loopMeshCntX + 1);
        const meshEy = meshSizeY * (loopMeshCntY + 1);
        meshCoordArr.push([meshSx, meshSy, meshEx, meshEy]);
      }
    }

    return meshCoordArr;
  }

  /**
   * メッシュ座標配列からロードが必要なメッシュのみを取得する。
   * @param {Array<Array<Number>>} meshCoordArr メッシュ座標配列
   * @param {Number} resolution 解像度
   * @returns {Array<Array<Number>>} ロードが必要なメッシュの連想配列
   * @private
   */
  getLoadMeshFromMeshArr(meshCoordArr, resolution) {
    const loadMeshArr = [];
    meshCoordArr.forEach((meshCoord) => {
      const meshKey = this.convertMeshCoordToMeshKey(meshCoord);
      if (!(resolution in this.loadedMesh) || !(meshKey in this.loadedMesh[resolution])) {
        loadMeshArr.push(meshCoord);
      }
    });

    return loadMeshArr;
  }

  /**
   * ロード済みメッシュを設定する。
   * @param {Array<Array<Number>>} meshCoordArr メッシュ座標配列
   * @param {Number} resolution 解像度
   * @private
   */
  setLoadMeshByMeshArr(meshCoordArr, resolution) {
    if (!(resolution in this.loadedMesh)) {
      this.loadedMesh[resolution] = {};
    }

    meshCoordArr.forEach((meshCoord) => {
      const meshKey = this.convertMeshCoordToMeshKey(meshCoord);
      this.loadedMesh[resolution][meshKey] = meshCoord;
    });
  }

  /**
   * メッシュの座標をひとつの矩形に合成する。
   * @param {Array<Array<Number>>} メッシュ座標配列
   * @returns {Array<Number>} 矩形座標
   * @private
   */
  unifyMeshArrToExtent(meshArr) {
    // ロードが必要なメッシュの座標をひとつの矩形に合成する
    let extent;
    meshArr.forEach((meshCoord, idx) => {
      if (idx === 0) {
        extent = meshCoord;
      } else {
        extent = extend(extent, meshCoord);
      }
    });

    return extent;
  }

  /**
   * メッシュの座標をキーに変換する。
   * @param {Array<Number>} meshCoord メッシュの座標
   * @returns {String} メッシュのキー
   * @private
   */
  convertMeshCoordToMeshKey(meshCoord) {
    return meshCoord[0] + '_' + meshCoord[1] + '_' + meshCoord[2] + '_' + meshCoord[3];
  }

  /**
   * サーバからの応答データからアイコン用のFeatureを生成する。
   @param {Object} resJson 応答データ
   * @returns {Array<Feature>} アイコンのFeature
   * @private
   */
  createFeatureFromJson(resJson) {
    const iconList = resJson.icon_list;
    const featureList = [];
    iconList.forEach((featureData) => {
      const iconCoord = [featureData.coord_x, featureData.coord_y];
      const imageFileName = featureData.image_file_name;
      let memo = featureData.memo;
      if (memo === '') {
        memo = null;
      }
      const id = featureData.id;
      featureList.push(IconFeatureUtils.createFeature(iconCoord, imageFileName, memo, id));
    });

    return featureList;
  }
}
