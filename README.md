# Odom Trajectory

`/odom` (`nav_msgs/Odometry` または ROS 2 `nav_msgs/msg/Odometry`) の位置を Foxglove のカスタムパネルに表示します。

## ビルド・導入

```bash
npm ci
npm run build
npm run package
```

生成した `.foxe` を Foxglove の Extensions 画面からインストールし、Add panel で **Odom Trajectory** を選択してください。ローカルのデスクトップ版には `npm run local-install` でも導入できます。

## 表示

- XY 平面の軌跡、水色の線、現在位置と yaw を示す緑色の矢印
- x / y / z [m]、yaw [deg]、`header.frame_id` の数値表示
- 縦横同一縮尺で原点と軌跡全体を自動フィット。+X は右、+Y は上
- 軌跡は移動距離 1 cm ごと、最大 10,000 点。現在位置は全メッセージで更新
- クリアボタン、再生シーク、座標フレーム変更で履歴をリセット

`pose.pose` は `header.frame_id` の座標としてそのまま描画します。`odom` 以外または空の場合は注意表示し、TF 変換は行いません。通常は `/odom.header.frame_id = odom` にしてください。軌跡はパネルを開いてから受信した範囲のみです。シーク後はその地点から再蓄積します。Z は数値表示のみです。

API: https://docs.foxglove.dev/docs/extensions/guides/create-custom-panel
