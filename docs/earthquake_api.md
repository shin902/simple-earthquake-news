# 地震情報API ドキュメント

## 概要
このドキュメントでは、P2P地震情報APIを使用して地震情報を取得する`get_eq_infos`関数について説明します。

## 関数: `get_eq_infos(today_num)`

### 説明
指定された日付の地震情報をP2P地震情報APIから取得し、整形されたリストとして返します。

### パラメータ
- `today_num` (int): 日付を表す数値(例: YYYYMMDD形式)

### 戻り値
- `eq_info_lists` (list): 地震情報の文字列リスト

各要素は以下の形式で返されます:
```
{時刻}|震源地:{震源地名}|最大震度:{震度}|マグニチュード:{マグニチュード}
```

### 実装コード

```python
def get_eq_infos(today_num):
  eq_info_lists = []

  startdate:int = today_num
  enddate:int = today_num
  limit:int = 100
  scale:float = 3

  p2pzishin = f"https://api.p2pquake.net/v2/jma/quake?limit={limit}&order=1&since_date={startdate}&until_date={enddate}&min_scale={scale*10}"
  zishin = requests.get(p2pzishin).json()
  for i in range(len(zishin)):
      if zishin[i]['earthquake']['hypocenter']['name'] != '':
          name = str(zishin[i]['earthquake']['hypocenter']['name'])
          maxScale_raw = str(zishin[i]['earthquake']['maxScale'])
          time = str(zishin[i]['earthquake']['time'])
          magnitude = str(zishin[i]['earthquake']['hypocenter']['magnitude'])
          ms = {
              '-1': 'None',
              '10': '1',
              '20': '2',
              '30': '3',
              '40': '4',
              '45': '5-',
              '50': '5+',
              '55': '6-',
              '60': '6+',
              '70': '7',
          }
          maxScale = ms[maxScale_raw]
          if name == "":
              name = "None"

          if magnitude == "-1":
              magnitude = "None"
          eq_info_lists.append(f"{time}|震源地:{name}|最大震度:{maxScale}|マグニチュード:{magnitude}")

  return eq_info_lists
```

### API仕様

#### エンドポイント
```
https://api.p2pquake.net/v2/jma/quake
```

#### クエリパラメータ
- `limit`: 取得する地震情報の最大件数 (デフォルト: 100)
- `order`: 並び順 (1: 新しい順)
- `since_date`: 開始日付 (YYYYMMDD形式)
- `until_date`: 終了日付 (YYYYMMDD形式)
- `min_scale`: 最小震度 (震度×10の値、例: 震度3の場合は30)

### 震度スケール変換表

| APIの値 | 表示震度 |
|---------|----------|
| -1      | None     |
| 10      | 1        |
| 20      | 2        |
| 30      | 3        |
| 40      | 4        |
| 45      | 5-       |
| 50      | 5+       |
| 55      | 6-       |
| 60      | 6+       |
| 70      | 7        |

### 使用例

```python
import requests

# 2024年1月15日の地震情報を取得
earthquake_list = get_eq_infos(20240115)

for eq in earthquake_list:
    print(eq)
```

出力例:
```
2024/01/15 09:30:00|震源地:石川県能登地方|最大震度:6+|マグニチュード:5.8
2024/01/15 14:22:00|震源地:新潟県中越地方|最大震度:4|マグニチュード:4.2
```

### 注意事項

1. **依存関係**: この関数は`requests`ライブラリを使用します。事前にインストールしてください:
   ```bash
   pip install requests
   ```

2. **エラーハンドリング**: 現在の実装にはエラーハンドリングが含まれていません。以下のケースを考慮することを推奨します:
   - APIリクエストの失敗
   - ネットワークエラー
   - JSONパースエラー
   - レート制限

3. **データの有効性**: 震源地名が空の場合、その地震情報はスキップされます。

4. **APIレート制限**: P2P地震情報APIには利用制限がある可能性があります。過度なリクエストは避けてください。

### 改善案

```python
import requests
from typing import List, Optional
from datetime import datetime

def get_eq_infos(today_num: int, timeout: int = 10) -> List[str]:
    """
    指定された日付の地震情報を取得します。

    Args:
        today_num: 日付 (YYYYMMDD形式)
        timeout: APIリクエストのタイムアウト秒数

    Returns:
        地震情報の文字列リスト

    Raises:
        requests.RequestException: APIリクエストに失敗した場合
    """
    eq_info_lists = []

    startdate: int = today_num
    enddate: int = today_num
    limit: int = 100
    scale: float = 3

    api_url = (
        f"https://api.p2pquake.net/v2/jma/quake"
        f"?limit={limit}&order=1"
        f"&since_date={startdate}&until_date={enddate}"
        f"&min_scale={int(scale * 10)}"
    )

    try:
        response = requests.get(api_url, timeout=timeout)
        response.raise_for_status()
        zishin = response.json()
    except requests.RequestException as e:
        raise Exception(f"地震情報の取得に失敗しました: {e}")

    scale_map = {
        '-1': 'None', '10': '1', '20': '2', '30': '3', '40': '4',
        '45': '5-', '50': '5+', '55': '6-', '60': '6+', '70': '7',
    }

    for quake_data in zishin:
        hypocenter_name = quake_data['earthquake']['hypocenter']['name']

        if not hypocenter_name:
            continue

        max_scale_raw = str(quake_data['earthquake']['maxScale'])
        time = quake_data['earthquake']['time']
        magnitude = quake_data['earthquake']['hypocenter']['magnitude']

        max_scale = scale_map.get(max_scale_raw, 'Unknown')
        magnitude_str = 'None' if magnitude == -1 else str(magnitude)

        eq_info = (
            f"{time}|震源地:{hypocenter_name}|"
            f"最大震度:{max_scale}|マグニチュード:{magnitude_str}"
        )
        eq_info_lists.append(eq_info)

    return eq_info_lists
```

## 参考リンク

- [P2P地震情報 API仕様](https://www.p2pquake.net/dev/)
- [気象庁 震度について](https://www.jma.go.jp/jma/kishou/know/shindo/index.html)

## ライセンス

P2P地震情報APIの利用規約に従ってください。
