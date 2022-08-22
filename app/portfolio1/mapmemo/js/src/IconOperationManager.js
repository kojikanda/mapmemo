import { ServerAccessor } from './ServerAccessor';

/**
 * アイコン操作マネージャークラス
 */
export class IconOperationManager extends ServerAccessor {
  /**
   * 仮ID
   * @type {Number}
   * @private
   */
  static temporary_id = 0;

  /**
   * コンストラクタ
   */
  constructor() {
    super();

    /**
     * ユーザID
     * @type {Number}
     * @private
     */
    this.userId = null;

    /**
     * 新規追加したアイコンのFeature
     * @type {Object<String, Feature>}
     * @private
     */
    this.addIconFeaturesMap = {};

    /**
     * 更新したアイコンのFeature
     * @type {Object<String, Feature>}
     * @private
     */
    this.updateIconFeaturesMap = {};

    /**
     * 削除したアイコンのFeature
     * @type {Object<String, Feature>}
     * @private
     */
    this.deleteIconFeaturesMap = {};
  }

  /**
   * ユーザIDを設定する。
   * @param {Number} userId ユーザID
   */
  setUserId(userId) {
    this.userId = userId;
  }

  /**
   * 新規追加したアイコンを設定する。
   * @param {Array<Feature>} features 新規追加するFeature
   */
  setAddIconFeatures(features) {
    features.forEach((feature) => {
      // Featureに仮IDを設定し、区別できるようにする
      feature.setId(IconOperationManager.getTemporaryId());

      if (!(feature.getId() in this.addIconFeaturesMap)) {
        this.addIconFeaturesMap[feature.getId()] = feature;
      }
    });
  }

  /**
   * 更新したアイコンを設定する。
   * @param {Array<Feature>} features 更新するFeature
   */
  setUpdateIconFeatures(features) {
    features.forEach((feature) => {
      if (feature.getId() !== null && feature.getId() > 0 && !(feature.getId() in this.updateIconFeaturesMap)) {
        this.updateIconFeaturesMap[feature.getId()] = feature;
      }
    });
  }

  /**
   * 削除したアイコンを設定する。
   * @param {Array<Feature>} features 削除するFeature
   */
  setDeleteIconFeatures(features) {
    features.forEach((feature) => {
      if (feature.getId() !== null && feature.getId() > 0 && !(feature.getId() in this.deleteIconFeaturesMap)) {
        this.deleteIconFeaturesMap[feature.getId()] = feature;
      }
    });
  }

  /**
   * 新規追加したアイコンを削除する。
   * @param {Array<Feature>} features 削除するFeature
   */
  removeAddIconFeatures(features) {
    features.forEach((feature) => {
      if (feature.getId() in this.addIconFeaturesMap) {
        delete this.addIconFeaturesMap[feature.getId()];
      }
    });
  }

  /**
   * 新規追加・更新・削除したアイコンをDBに反映する。
   * @param {Function} done 成功時コールバック
   * @param {Function} fail 失敗時コールバック
   */
  save(done, fail) {
    // 保存情報をJSONで生成する
    const saveJson = this.createSaveJson();
    if (!this.isDoSave(saveJson)) {
      // 保存実行不可
      fail('cancelSave', null);
      return;
    }

    // Djangoへ通知
    this.send(
      saveJson,
      'saveicon/',
      (resJson) => {
        // 保存の後処理を実行
        this.procAfterSave(resJson);

        done(resJson);
      },
      (result, xhr) => {
        fail(result, xhr);
      }
    );
  }

  /**
   * 保存を実行するかチェックを行う。
   * @param {Object} saveJson DBに保存するデータを格納したJSONデータ
   * @returns {Boolean} チェック結果。true: チェックOK, false: チェックNG。
   */
  isDoSave(saveJson) {
    if (this.userId === null) {
      console.error('ログインしていないため、保存できません。');
      return false;
    }

    if (saveJson.add.length === 0 && saveJson.update.length === 0 && saveJson.delete.length === 0) {
      console.error('保存するデータが存在しません。');
      return false;
    }

    return true;
  }

  /**
   * 仮IDを取得する。<br>
   * 仮IDは-1からデクリメントされる負数である。
   * @returns {Number} 仮ID
   * @private
   */
  static getTemporaryId() {
    return --IconOperationManager.temporary_id;
  }

  /**
   * DBに保存する情報を格納したJSONデータを生成する。
   * @returns {Object} 保存データを格納したJSONデータ
   * @private
   */
  createSaveJson() {
    const data = {};

    // 追加分
    const addIconFeatures = [];
    for (const id in this.addIconFeaturesMap) {
      addIconFeatures.push(this.addIconFeaturesMap[id]);
    }
    data.add = this.createSaveJsonFromFeatures(addIconFeatures);

    // 更新分
    const updateIconFeatures = [];
    for (const id in this.updateIconFeaturesMap) {
      updateIconFeatures.push(this.updateIconFeaturesMap[id]);
    }
    data.update = this.createSaveJsonFromFeatures(updateIconFeatures);

    // 削除分
    const deleteIconFeatures = [];
    for (const id in this.deleteIconFeaturesMap) {
      deleteIconFeatures.push(this.deleteIconFeaturesMap[id]);
    }
    data.delete = this.createSaveJsonFromFeatures(deleteIconFeatures);

    return data;
  }

  /**
   * FeatureリストからDBに保存する情報を格納したJSONデータを生成する。
   * @param {Array<Feature>} features Featureリスト
   * @returns {Array<Object>} 保存データを格納したJSONデータ
   * @private
   */
  createSaveJsonFromFeatures(features) {
    const data = [];
    features.forEach((feature) => {
      const featureData = {};
      const posPoint = feature.getGeometry();
      const position = posPoint.getCoordinates();
      const prop = feature.getProperties();
      featureData.coord_x = position[0];
      featureData.coord_y = position[1];
      featureData.image_file_name = prop.imageFileName;
      featureData.memo = prop.memo;
      if (prop.memo == null) {
        featureData.memo = '';
      }
      if (this.userId !== null) {
        featureData.user_id = this.userId;
      }
      if (feature.getId() !== null) {
        featureData.id = feature.getId();
      }

      data.push(featureData);
    });

    return data;
  }

  /**
   * 保存の後処理を実行する
   * @param {Object} resJson 応答データ
   * @private
   */
  procAfterSave(resJson) {
    const tempIdToDbId = resJson.added_id_dict;

    // DB登録したアイコンのFeatureにDBのIDを設定する
    for (const id in this.addIconFeaturesMap) {
      const feature = this.addIconFeaturesMap[id];
      feature.setId(tempIdToDbId[id]);
    }

    // 保持している情報をクリアする
    this.addIconFeaturesMap = {};
    this.updateIconFeaturesMap = {};
    this.deleteIconFeaturesMap = {};
  }
}
