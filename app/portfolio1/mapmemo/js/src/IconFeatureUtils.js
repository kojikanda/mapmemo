import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import { Icon, Fill, Style } from 'ol/style';

/**
 * アイコン用Featureユーティリティクラス
 */
export class IconFeatureUtils {
  /**
   * アイコンサイズ(px)
   * @type {Array<Number>}
   * @private
   */
  static ICON_SIZE = [32, 32];

  /**
   * イメージファイルの格納場所を示すURL
   * @type {String}
   * @private
   */
  static IMAGE_FILE_URL = '/static/mapmemo/images/';

  /**
   * アイコン用のFeatureを生成する。
   * @param {Array<Number>} iconCoord アイコンの座標
   * @param {String} imageFileName アイコンのイメージファイル名
   * @param {String} memo メモ
   * @param {Number} id ID
   * @returns {Feature} アイコン用のFeature
   */
  static createFeature(iconCoord, imageFileName, memo, id) {
    const feature = new Feature({
      geometry: new Point(iconCoord)
    });

    // スタイル
    feature.setStyle(IconFeatureUtils.createIconNormaStyle(imageFileName));

    // プロパティ
    const prop = {
      imageFileName: imageFileName
    };
    if (memo != null) {
      prop.memo = memo;
    }
    feature.setProperties(prop, true);

    // ID
    if (id != null) {
      feature.setId(id);
    }

    return feature;
  }

  /**
   * アイコン表示のスタイルを生成する。
   * @param {String} imageFileName アイコンのファイル名
   * @returns {Style} スタイル
   */
  static createIconNormaStyle(imageFileName) {
    const style = new Style({
      image: new Icon({
        crossOrigin: 'anonymous',
        src: IconFeatureUtils.IMAGE_FILE_URL + imageFileName
      })
    });

    return style;
  }

  /**
   * ポインタムーブイベントの選択時におけるアイコン表示のスタイルを生成する。
   * @param {String} imageFileName アイコンのファイル名
   * @param {Number} resolution 解像度
   * @returns {Array<Style>} スタイル
   */
  static createIconPointerMoveSelectedStyle(imageFileName, resolution) {
    const styles = [IconFeatureUtils.createIconNormaStyle(imageFileName)];
    styles.push(
      new Style({
        geometry: (feature) => {
          const centerCoord = feature.getGeometry().getCoordinates();
          const polygonCoords = IconFeatureUtils.getIconPolygonCoordsFromCenter(centerCoord, resolution);
          return new Polygon([polygonCoords]);
        },
        fill: new Fill({
          color: 'rgba(70, 130, 180, 0.5)'
        })
      })
    );

    return styles;
  }

  /**
   * アイコンの中心座標からアイコンのポリゴン座標を算出する。
   * @param {Array<Number>} iconCenterCoord マウスポインタの座標
   * @param {Number} resolution 解像度
   * @returns {Array<Array<Number>>} アイコンのポリゴン座標
   */
  static getIconPolygonCoordsFromCenter(centerCoord, resolution) {
    const iconHalfSizeX = (IconFeatureUtils.ICON_SIZE[0] / 2) * resolution;
    const iconHalfSizeY = (IconFeatureUtils.ICON_SIZE[1] / 2) * resolution;
    const iconCoords = [
      [centerCoord[0] - iconHalfSizeX, centerCoord[1] - iconHalfSizeY],
      [centerCoord[0] + iconHalfSizeX, centerCoord[1] - iconHalfSizeY],
      [centerCoord[0] + iconHalfSizeX, centerCoord[1] + iconHalfSizeY],
      [centerCoord[0] - iconHalfSizeX, centerCoord[1] + iconHalfSizeY],
      [centerCoord[0] - iconHalfSizeX, centerCoord[1] - iconHalfSizeY]
    ];

    return iconCoords;
  }
}
