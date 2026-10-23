# note 開発ノート
## 2026-10-XX Ver1.XX.0 設定情報のインポート・エクスポート機能の追加。
- インポート（📤）、エクスポート（📤）を保存（💾）の右横に配置
・インポート（📤）クリック時：
    - 選択ダイアログを表示。（拡張子：xsj、json）
    - 「開く」クリック：選択した設定ファイルを読み込んで画面に反映。
    - 「キャンセル」クリック：なにもしない。
- エクスポート（📤）クリック時：
    - 保存ダイアログを表示。（デフォルトファイル名：xSearch_setting.xsj）
    - 「保存」クリック：localStorageの設定をファイルに保存
    - 「キャンセル」クリック：なにもしない。

---

## 2026-10-XX Ver1.XX.0 リストのTID、シリーズ、タイトルのリンク起動機能の追加。
- 保存（💾） と インポート（📤）の間にプレイヤーアプリ設定（⚙️）を配置
    - プレイヤーアプリ設定（⚙️）クリックで選択ダイアログを表示
    - 「開く」クリック：
        - localStorageにプレイヤーアプリのパスを保存。
        - ⚙️の背景色を赤色に設定。
    - 「キャンセル」クリック：
        -  localStorageにプレイヤーアプリのパスをクリア。
        - ⚙️の背景色を元の色に戻す。
- リストのTIDのクリック：
    - URL：https://cal.syoboi.jp/tid/[TID]/subtitle
    - Chrome または Edge でしょぼいカレンダーサイトをポップアップ表示
- リストのシリーズのクリック：
    - 対象行のフォルダパスをパラメータにしてプレイヤーアプリを実行
- リストのタイトルのクリック：
    - 対象行のプレイリストパスをパラメータにしてプレイヤーアプリを実行
- プレイヤーアプリの実行処理をmain.jsに実装

## 2026-10-XX Ver1.XX.0 プレイリストファイルの再帰的階層フォルダ検索機能の追加。
- 下記ロジックで選択フォルダー内を再帰的に検索し多層内のプレイリストファイルも検索対象にする様に変更
- 変更前：
    - シリーズ：選択フォルダ直下のフォルダのフォルダ名から情報（50音、放映期間、評価、シリーズ名）取得
    - タイトル：プレイリストファイル名から情報（50音、放映年月、評価、タイトル名）取得
- 変更後：
    - シリーズ：プレイリストファイルを格納しているフォルダ名から情報取得
    - タイトル：プレイリストファイル名から情報取得
- 変更前後のイメージ：
    - 検索フォルダ構成：
        選択フォルダ
        ├─あ_200907～200907_★★★☆☆_青い花
        │      あ_200907_★★★☆☆_青い花.amppl
        │
        └─新しいフォルダー
            └─あ_200207～200207_★★★★☆_朝霧の巫女
                    あ_200207_★★★★☆_朝霧の巫女.amppl
    - 変更前の検索結果：
        あ_200907～200907_★★★☆☆_青い花｜あ_200907_★★★☆☆_青い花.amppl
    - 変更後の検索結果：
        あ_200907～200907_★★★☆☆_青い花｜あ_200907_★★★☆☆_青い花.amppl
        あ_200207～200207_★★★★☆_朝霧の巫女｜あ_200207_★★★★☆_朝霧の巫女.amppl

### 不具合対応
- 下記パスのシリーズ名が正しく取得できない。
H:\Download\テスト\アダルト\AV_★★★☆☆.amppl
    - 間違い：シリーズ名が"テスト"
    - 正しい：シリーズ名が"アダルト"（プレイリストファイルの直前のフォルダ名）


## 2026-10-XX Ver1.XX.0 フォルダ名・ファイル名の動的に情報取得する様に変更。
- フォルダパスの最後のフォルダ名をシリーズ情報（50音、放映期間、評価、シリーズ名）の取得対象とする。
- プレイリストファイル名をタイトル情報（50音、放映年月、評価、タイトル名）の取得対象とする。
- 50音の取得条件（シリーズ・タイトル）：
    - "あ"～"ん"の１文字
    - ※"ぁ"、"が"、"ぽ"などは対象外。
    - 末尾が"_"
- 放映期間の取得条件（シリーズ）：
    - 年（4桁）月（00～12）＋"～"＋年（4桁）月（00～12）
    - ※”202500～202600"などの年のみの指定を考慮。
    - 末尾が"_"
- 放映年月の取得条件（タイトル）：
    - 年（4桁）月（00～12）
    - ※”202600"などの年のみの指定を考慮。
    - 末尾が"_"
- 評価の取得条件（シリーズ・タイトル）：
    - ☆☆☆☆☆、★☆☆☆☆、★★☆☆☆、★★★☆☆、★★★★☆、★★★★★
    - 末尾が"_"
- シリーズ名の取得条件：
    - 取得された「50音」「放映期間」「評価」を除いた文字列
- タイトル名の取得条件：
    - 取得された「50音」「放映年月」「評価」を除いた文字列

---

## 2026-10-XX Ver1.XX.0 絞り込みフィルター機能の追加。
- 進捗パネルとリストパネルの間にフィルタパネル（コンテナ）を配置
- フィルタパネル内に「フィルタ件数」「フィルタ条件」「🆑（入力クリア）」を横並びで配置
- フィルタ件数（表示）（固定幅：120px）：
    - フィルタ後の件数を"フィルタ行数 / 全行数"で表示
- フィルタ条件（入力）（可変幅）：
    - 論理式ルール：
        - 文字列間を" "（スペース）、"　"（全角スペース） または "&&"、"＆＆" で区切った場合は、AND条件。
        - 文字列間を","（カンマ）、"，"（全角カンマ）、"、"（読点） または "||"、"｜｜" で区切った場合は、OR条件。
        - OR条件は、連続した複数のAND条件式を論理演算する
        - 論理式例：
            - 入力：ああああ いいいい, うううう ええええ
            - 意味：(ああああ AND いいいい) OR (うううう AND ええええ)
    - 比較式：
        - 以上：>値
        - 以下：<値
        - 同じ：値 または =値
        - 以外：!値
    - 項目指定記号と指定可能値：
        - 全項目：[全] または 項目記号無し：条件なし
        - TID：[TID]：0～99999
        - シリーズ50音：[S音]：あ～ん
        - 放映期間：[放映期間]：yyyymm（mmは00～12）
        - シリーズ評価：[S評価]：0～5（☆☆☆☆☆～★★★★★）
        - シリーズ名：[シリーズ]：条件なし（部分一致）
        - ジャンル：[ジャンル]：条件なし（部分一致）
        - 保存対象：[保存]：ON, OFF
        - タイトル50音：[T音]：あ～ん
        - 放映年月：[放映年月]：yyyymm（mmは00～12）
        - タイトル評価：[T評価]：0～5（☆☆☆☆☆～★★★★★）
        - タイトル名：[タイトル]：条件なし（部分一致）
        - 話数：[話数]：1～999
        - 状態：[状態]：OK, NG, BL
        - ※誤った項目指定記号、指定可能値を指定した場合はその式を無効
    - フィルタ条件の指定例：
        - パターン１：
            - 入力：ああああ, いいいい
            - 意味：全項目に対して"ああああ" OR "いいいい"の条件でフィルタ
        - パターン２：
            - 入力：[S音]>あ <お [シリーズ]ああああ, [放映年月]2026
            - 意味：（シリーズ50音が"あ"～"お" AND シリーズ名が"ああああ"を含む） OR タイトルの放映年月が2025の条件でフィルタ
- 🆑（ボタン）：
    - クリックでフィルタ条件をクリア
- リストの各見出し項目：
    - 見出し項目上の右クリックで項目指定記号を「フィルタ条件」のカーソル位置に追加。
- 文字入力でリアルフィルタリング実行

### 仕様変更
- 変更前：
    - OR条件は、連続した複数のAND条件式を論理演算する
    - 論理式例：
        - 入力：ああああ いいいい, うううう ええええ
        - 意味：(ああああ AND いいいい) OR (うううう AND ええええ)
- 変更後：
    - 変更前の自動まとめを廃止
    - まとめ範囲は "(" と ")" または "（" と "）" で手動指定。
    - 論理式例：
        - 入力：(ああああ いいいい), (うううう ええええ)
        - 意味：(ああああ AND いいいい) OR (うううう AND ええええ)
    - ")" または "）" の自動入力・削除機能を追加。
        - 文字列範囲選択して "(" または "（" を入力した時、範囲選択の末尾に ")" または "）" を追加。
        - "(" または "（" を削除時、相対する ")" または "）" を削除。

---

## 2026-10-19 Ver1.11.0 進捗バーに終了予定日時の表示。検索・再建策の取り消し機能の追加。
- 進捗バーに終了予定日時の表示の追加
    - 変更前：10% ( 10 / 100 )
    - 変更後：10% ( 10 / 100 )  完了予定：10/19 22:45
    - 完了予定時間の計算式
        完了予定日時 = 1ファイル当たりの平均処理時間 × 残りファイル数
- 検索・再建策の取り消し機能の追加
    - 進捗バーの右端に❌（キャンセル）を配置。
    - ❌クリック時、実行中の検索・再検索を中止する。
    - 検索・再検索の実行中にESCキー押下でも中止する。

---

## 2026-10-20 Ver1.15.0 検索結果リストに「分類」を追加。
- 「分類」「シリーズ情報」「タイトル情報」の取得ルール
    - 選択フォルダの直下にフォルダが存在しプレイリストファイルが存在する場合：
        -「分類」： 選択フォルダ（ベース）の直下フォルダ名を設定
        -「シリーズ情報」： プレイリストファイルが格納されているフォルダ名を設定
        -「タイトル情報」： プレイリストファイルのファイル名を設定
    - 選択フォルダの直下にプレイリストファイルが存在する場合：
        -「分類」：  選択フォルダを設定
        -「シリーズ情報」： 選択フォルダを設定
        -「タイトル情報」： プレイリストファイルのファイル名を設定

- 「分類」「シリーズ」「タイトル」のリスト表示例
    - フォルダ構成：
        選択フォルダ
        │  18禁アニメ_★★★★★.amppl
        │      
        ├─アニメ（一般）
        │  └─て_202610～202610_★★☆☆☆_テムパル
        │          て_202610_★★☆☆☆_テムパル.amppl
        │          
        ├─アニメ（放映中）
        │      放映中_★★★★★.amppl
        │      
        └─映画（洋画）
        　  └─スター・トレックシリーズ
        　　　　└─2022_スター・トレック：ストレンジ・ニュー・ワールド
        　　　　        STAR TREK Season1.amppl

    - リスト表示例：
        「分類」|「シリーズ情報」|「タイトル情報」
        選択フォルダ | 選択フォルダ | 18禁アニメ_★★★★★.amppl
        アニメ（一般） | て_202610～202610_★★☆☆☆_テムパル | て_202610_★★☆☆☆_テムパル.amppl
        アニメ（放映中） | アニメ（放映中） |  放映中_★★★★★.amppl
        映画（洋画） | 2022_スター・トレック：ストレンジ・ニュー・ワールド | STAR TREK Season1.amppl

---

## 2026-10-XX Ver1.XX.0 見出し右クリックのポップアップメニュー表示機能を追加。
- 見出し右クリックでポップアップメニュー表示
    - 見出し右クリック時：
        - TID：現状維持
        - 分類：ポップアップメニュー表示
            - メニュー内容：
                [分類] 
                リストの「分類」列内の値を重複を除いて設定（値の末尾に", "を追加）
        - 50音（シリーズ）：ポップアップメニュー表示
            - メニュー内容：
                "[S50音] "
                "あ, い, う, え, お, "
                "か, き, く, け, こ, "
                "さ, し, す, せ, そ, "
                "た, ち, つ, て, と, "
                "な, に, ぬ, ね, の, "
                "は, ひ, ふ, へ, ほ, "
                "ま, み, む, め, も, "
                "や, ゆ, よ, ら, り, "
                "ら, り, る, れ, ろ, "
                "わ, を, ん, "
        - 放映期間：現状維持
        - 評価（シリーズ）：ポップアップメニュー表示
            - メニュー内容：
                "[S評価] "
                "☆☆☆☆☆, "
                "★☆☆☆☆, "
                "★★☆☆☆, "
                "★★★☆☆, "
                "★★★★☆, "
                "★★★★★, "
        - シリーズ：現状維持
        - ジャンル：ポップアップメニュー表示
            - メニュー内容：
                "[ジャンル] "
                "アクション, "
                "アドベンチャー, "
                "コメディ, "
                "ドラマ, "
                "エッチ, "
                "ファンタジー, "
                "成人向け, "
                "ホラー, "
                "魔法少女, "
                "メカ・ロボット, "
                "音楽, "
                "ミステリー, "
                "サスペンス・心理, "
                "恋愛・ラブコメ, "
                "SF, "
                "日常・ほのぼの, "
                "スポーツ, "
                "超自然・能力, "
                "スリラー, "
        - 保存：ポップアップメニュー表示
            - メニュー内容：
                "[保存] "
                "ON, "
                "OFF, "
        - 50音（タイトル）：ポップアップメニュー表示
            - メニュー内容：
                "[T50音] "
                ※ 50音（シリーズ）と同じアイテム
        - 放映年月：現状維持
        - 評価（タイトル）：ポップアップメニュー表示
            - メニュー内容：
                "[T評価] "
                ※ 評価（シリーズ）と同じアイテム
        - タイトル：現状維持
        - 話数：現状維持
        - 状態：ポップアップメニュー表示
            - メニュー内容：
                "[状態] "
                "🟢, "
                "🔴, "
                "🟡, "
                "🟣, "
        - ポップアップメニューの先頭アイテムは[選択見出し項目]を表示
    - メニュー表示状態でメニュー以外を左クリック、右クリック時：
        - 表示されているメニューを非表示
    - メニューのアイテムを左クリック時：
        - フィルタ条件の挿入位置の直前の項目が選択見出し項目と異なる場合：
            - 選択見出し項目の項目名＋メニューのアイテムを挿入
        - フィルタ条件の挿入位置の直前の項目が選択見出し項目と同じ場合：
            - メニューのアイテムを挿入
        - メニューは表示したまま。
- リストデータ上で右クリックで項目記号と右クリックした値をフィルタ条件に挿入
    - 全項目が対象
    - 「状態」項目ではリストデータを下記のとおり変換
            "🟢" → "OK, "
            "🔴" → "NG, "
            "🟡" → "BLANK, "
            "🟣" → "OVERLAP, "
    - 実行・結果例：
        - 実行例：シリーズのリストデータ（"あしたのジョー"）上で右クリックした場合。
        - 結果例："[シリーズ] あしたのジョー, "がフィルタ条件に挿入される。

---

## 2026-10-XX Ver1.XX.0 しょぼいカレンダーAPIへのリクエスト回数を軽減する処理を追加。
### 下記ロジックでしょぼいカレンダーAPIへのリクエスト回数を軽減する処理を追加実装。
    ・前回リクエストと今回リクエストのシリーズ名が異なる場合：
        ・保持レスポンス（メモリキャッシュ）をクリア。
        ・シリーズ名でリクエスト。
        ・返却されたレスポンス（先頭から１０件）を保持レスポンスに追加。
    ・前回リクエストと今回リクエストのシリーズ名が同じ場合：
        ・保持レスポンスにタイトル名が存在する場合：
            ・保持レスポンスからTIDを取得し返却
        ・保持レスポンスにタイトル名が存在しない場合：
            ・タイトル名でリクエスト。
            ・返却されたレスポンスにタイトル名が存在する場合：
                ・返却されたレスポンスからTIDを取得し返却
                ・返却されたレスポンス（先頭から１０件）を保持レスポンスに追加。
            ・返却されたレスポンスにタイトル名が存在しない場合："-"を返却
    ※現在実装されている下記処理は現状維持
        ・「スペース分割して先頭文字列でリクエスト」する処理。
        ・429エラー時のリトライ。
        ・連続リクエスト防止用の待機処理

### 「修正に向けた具体的なアプローチ」を全て実施してください。
    ・関数の引数の拡張async function fetchSyobocalTid(seriesName, titleName) のように、シリーズ名とタイトル名を明示的に受け取るようにする。
    ・シリーズ名変更時のキャッシュクリア
    ・同シリーズ時のタイトル名チェック

---

## 2026-10-23 Ver1.23.1 AniListAPI・しょぼいカレンダーAPIへのリクエスト回数軽減の強化。
- （事前作業）
    - 現在取得できている TID, Title をlocalStorageに保存（移行作業）
        - 再検索で fast:syncDirectory に渡された existingItems を元に localStorage.TIDData を作成する様に変更

- 処理変更：
- Step1の処理は削除済
- Step2：取得処理を下記のとおり修正
    - タイトルでelectron-storeを完全一致検索
        - 存在したらelectron-storeからTIDを取得
        - 存在しない場合は以下を実行
    - TID 取得用のURLを下記に変更（全TID, Titleを取得処理実装前のロジックに戻す）
        https://cal.syoboi.jp/json.php?Req=TitleSearch&Search=${encodedSearch}
        - 返却データ（xml）でタイトルを完全一致検索
            - 存在したら返却データ（xml）からTIDを取得
            - 存在しない場合はTIDに"-"を設定
            - 返却データ（xml）の全てをelectron-storeへ保存

---

## 2026-10-XX Ver1.XX.1 AniListAPIで「タグ」を取得し日本語化して「ジャンル」に統合。
・下記ロフックでAniListAPIで「タグ」を取得し日本語化して「ジャンル」に統合する様に変更
    - AniListAPIで「ジャンル」「タグ」を取得
    - 取得した「タグ」を TAG_MAP で日本語に翻訳、TAG_MAPにマッチしない場合は取得したままの値を使用
    - 翻訳した「タグ（日本語）」のタグ毎の文字列の先頭に"#"を付加
    - "#"を編集した「タグ（日本語）」を同一シリーズの「ジャンル」に統合
    - 既存の条件に従い、統合した「シリーズ（タグ統合）」を electron-store に保存
    - renderer に統合した「シリーズ（タグ統合）」を返却

---

## 2026-10-XX Ver1.XX.1 AniListAPI・しょぼいカレンダーAPIの強制リクエスト機能の追加。
- 下記ロジックで「保存」をON設定して再検索（🔎）クリック時、キャッシュ（electron-store）を削除して強制的にAPIリクエストを実行する機能を追加
    - renderer で「保存」をON設定して再検索（🔎）クリック時：
        - 進捗バーの色を赤に変更
        - 進捗バー中に表示するテキストに"【強制検索中】"を追加表示。
    - renderer からはリストの全タイトル情報を main に渡す時、タイトル別の「保存」も渡す。
        - main に渡す情報（）
    - main で「保存」がON設定のタイトルのキャッシュ（electron-store）を削除
    - 以降、main 既存の処理を実行

---

## 2026-10-XX Ver1.XX.0 ダッシュボード表示機能の追加。
### 要件説明
・下記データ例を使っての統計結果をダッシュボードを表示する処理作成
    ・electron（JavaScript）で作成
    ・Chart.jsをelectronセキュリティを考慮して実装
    ・「ダッシュボード／リスト」の切替ボタン（トグル）をテーマ切替の左横に配置
    ・下記HTMLの"ここから"ー"ここまで"をコンテナ化
    ・ダッシュボード用HTMLは別ファイル"index_dashboard.html"に作成
    ・ダッシュボードクリックで下記HTMLの"ここから"ー"ここまで"を非表示にしダッシュボードを表示
    ・リストクリックで下記HTMLの"ここから"ー"ここまで"を表示にしダッシュボードを非表示
    ・ダッシュボードの内容
        ・（上部50%配置）サマリーカード：
            ・「サマリーカード」の右端に現在日時（例：2026年10月22日(木) 15:00時点）を表示
            ・全て：シリーズ件数、タイトル件数、話数件数、状態別件数
            ・分類別：シリーズ件数、タイトル件数、話数件数、状態別件数
        ・（下部50%左側75%配置）選択分類の統計：
            ・期間（Y軸）／タイトル数（X軸）（評価・シリーズ50音・ジャンル分析別）の統計
            ・カードタイトルに「分類統計（選択された分類）」を表示
            ・年月／年シーズン／単年／５年／全年の集計単位切替ドロップダウン
                ・年シーズンは年毎に3か月単位に分けた期間の単位
                    冬シーズン：前年12月～02月
                    春シーズン：03月～05月
                    夏シーズン：06月～08月
                    秋シーズン：09月～11月
                ・５年単位は1970年開始で＋５年毎の単位
            ・評価／シリーズ50音／ジャンルの切替ドロップダウン
            ・集計単位のタイトル数の横棒グラフ（評価／シリーズ50音／ジャンルの多層グラフ）
        ・（下部50%右側25%配置）選択期間の統計：
            ・評価・シリーズ50音・ジャンルの統計
            ・カードタイトルに「期間統計（選択された期間）」を表示
            ・選択期間の評価のドーナッツグラフ
            ・選択期間のシリーズ50音のドーナッツグラフ
            ・選択期間のジャンルのドーナッツグラフ
    ・ダッシュボード用の新規コードは別ファイル"renderer_dashboard.js"に作成

### 配置イメージ
　----------------------------------------------------------------------------------------
　xSearch -プレイリスト検索- Ver.1.25.0                         [ダッシュボード／リスト]　☀️
　----------------------------------------------------------------------------------------
　サマリーカード                                               2026年10月22日(木) 15:00時点
　　■全て        　｜シリーズ件数｜タイトル件数｜話数件数｜状態別件数
　　□アダルト      ｜シリーズ件数｜タイトル件数｜話数件数｜状態別件数
　　□アニメ（18禁）｜シリーズ件数｜タイトル件数｜話数件数｜状態別件数
　　□アニメ（一般）｜シリーズ件数｜タイトル件数｜話数件数｜状態別件数
　　　　：
　--------------------------------------------------------------+-------------------------
　分類統計（全て）　　　　　　　　　　　　　　　　　　　　　　　　　　|　期間統計（200107）
　　　[期間選択▼]　 [要素選択▼]　　　　　　　　　　　　　　　　　　　|　
　　□200001　🟥🟥🟧🟧🟧🟨🟨🟨🟨🟩🟩🟩🟦🟦　　　　　　　　　|　　評価
　　□200104　🟥🟥🟥🟧🟧🟨🟨🟨🟨🟨🟩🟩🟩🟩🟦🟦🟦🟦　　　　|　　　（ドーナッツグラフ）
　　■200107　🟥🟧🟧🟧🟧🟧🟨🟨🟩🟩🟦　　　　　　　　　　　　　|　　シリーズ50音
　　□200110　🟥🟥🟥🟥🟧🟨🟨🟨🟩🟦🟦🟦　　　　　　　　　　　　|　　　（ドーナッツグラフ）
　　□200201　🟥🟥🟨🟨🟨🟩🟩🟦🟦🟦🟦　　　　　　　　　　　　　|　　ジャンル
　　□200204　🟥🟥🟧🟧🟧🟨🟨🟨🟨🟩🟩🟩🟦🟦　　　　　　　　　|　　　（ドーナッツグラフ）
    　　：　　　　　　　　　　　　　　　　　　　　　　　　　　　　　|
　　　　　　　0  100  200  300  400  500  600  700  800 900     |
　--------------------------------------------------------------+-------------------------
　ステータス表示
　x-builder@gmail.com　　　　　　　　　　　　　　　　　　Copyright © 2026- @x-builder, Japan
　----------------------------------------------------------------------------------------

### データ例：
分類	音	放映期間	評価	シリーズ	ジャンル		TID	音	放映年月	評価	タイトル	話数	状態
アダルト	-	-	-	アダルト	-		-	-	-	-	AV_★★★★☆	83	🟢
アダルト	-	-	-	アダルト	-		-	-	-	-	AV_★★★☆☆	174	🟢
アニメ（18禁）	-	-	-	アニメ（18禁）	-		-	-	-	-	18禁アニメ_★★★★★	247	🟢
アニメ（18禁）	-	-	-	アニメ（18禁）	-		-	-	-	-	18禁アニメ_★★★★☆	495	🟢
アニメ（18禁）	-	-	-	アニメ（18禁）	-		-	-	-	-	18禁アニメ_★★★☆☆	1053	🟢
アニメ（18禁）	-	-	-	アニメ（18禁）	-		-	-	-	-	18禁アニメ_★★☆☆☆	151	🟢
アニメ（一般）	あ	197004～198010	★★★★☆	あしたのジョー	アクション, ドラマ, 日常・ほのぼの, スポーツ		-	あ	197004	★★★★☆	あしたのジョー	79	🟢
アニメ（一般）	あ	197004～198010	★★★★☆	あしたのジョー	アクション, ドラマ, 日常・ほのぼの, スポーツ		1075	あ	198010	★★★★☆	あしたのジョー2	47	🟢
アニメ（一般）	あ	198510～198608	★★★☆☆	蒼き流星SPTレイズナー	アクション, アドベンチャー, メカ・ロボット, SF		3087	あ	198510	★★★☆☆	蒼き流星SPTレイズナー	38	🟢
アニメ（一般）	あ	198510～198608	★★★☆☆	蒼き流星SPTレイズナー	アクション, アドベンチャー, メカ・ロボット, SF		-	あ	198608	★★★☆☆	蒼き流星SPTレイズナー OVA	3	🟢
アニメ（一般）	あ	198804～198804	★★★★☆	アップルシード OVA	-		-	あ	198804	★★★★☆	アップルシード OVA	1	🟢
アニメ（一般）	あ	198807～198807	★★★★☆	AKIRA	アクション, アドベンチャー, ホラー, サスペンス・心理, SF, 超自然・能力		441	あ	198807	★★★★☆	劇場版 AKIRA	1	🟢
アニメ（一般）	あ	199302～201102	★★★★☆	ああっ女神さまっ	コメディ, 恋愛・ラブコメ, 超自然・能力		-	あ	199302	★★★☆☆	ああっ女神さまっ OVA1	5	🟢
アニメ（一般）	あ	199302～201102	★★★★☆	ああっ女神さまっ	コメディ, 恋愛・ラブコメ, 超自然・能力		1301	あ	199804	★★★★☆	ああっ女神さまっ 小っちゃいって事は便利だねっ	48	🟢
アニメ（一般）	あ	199302～201102	★★★★☆	ああっ女神さまっ	コメディ, 恋愛・ラブコメ, 超自然・能力		653	あ	200010	★★★★☆	劇場版 ああっ女神さまっ	1	🟢
アニメ（一般）	あ	199302～201102	★★★★☆	ああっ女神さまっ	コメディ, 恋愛・ラブコメ, 超自然・能力		521	あ	200501	★★★★☆	ああっ女神さまっ	26	🟢
アニメ（一般）	あ	199302～201102	★★★★☆	ああっ女神さまっ	コメディ, 恋愛・ラブコメ, 超自然・能力		779	あ	200604	★★★★☆	ああっ女神さまっ それぞれの翼	24	🟢

### 変更前ロジック：
#### -- styles.css --------------------------------------------------------
```css
/* ダークモード（デフォルト） */
 :root {
    --app-color: #be98ce; /* 紫色 */
    --bg-color: #1e1e1e;
    --text-color: #d4d4d4;
    --panel-bg: #2d2d2d;
    --border-color: #404040;
    --accent-color: #ad53d4;
    --hover-color: #333333;
    --list-hover-color: #424242;
    /* スクロールバー用 */
    --scrollbar-track: #121212;
    --scrollbar-thumb: #999999;
    --scrollbar-thumb-hover: #777777;
    /* ヘルプ・変更履歴用の変数追加（参考例より保持） */
    --heading-color: #cfaaff;
    --heading-shadow: rgba(132, 0, 255, 0.5);
    --close-btn-bg: rgba(0, 0, 0, 0.5);
    --close-btn-text: #ff6b6b;
    --close-btn-border: #555555;
    --close-btn-hover-bg: rgba(255, 107, 107, 0.3);
    --close-btn-shadow: rgba(0, 0, 0, 0.5);
    --table-bg: #1a1a1a;
    --table-hover-bg: #404040;
    --table-shadow: rgba(0, 0, 0, 0.6);
    --subtitle-bg: rgb(74, 0, 92);
    --subtitle-bg-hover: rgb(59, 25, 68);
    --text-muted: #aaaaaab4;
    --sub-item-text: #b0bec5;
}
/* ライトモード */
[data-theme="light"] {
    --app-color: #a43fcf; /* 紫色 */
    --bg-color: #f3f3f3;
    --text-color: #333333;
    --panel-bg: #ffffff;
    --border-color: #cccccc;
    --accent-color: #7b1ea3;
    --hover-color: #e5e5e5;
    --list-hover-color: #e5e5e5;
    /* スクロールバー用 */
    --scrollbar-track: #f1f1f1;
    --scrollbar-thumb: #747474;
    --scrollbar-thumb-hover: #575656;
    /* ヘルプ・変更履歴用の変数追加（ライトモード用調整） */
    --heading-color: #470099;
    --heading-shadow: rgba(88, 0, 204, 0.2);
    --close-btn-bg: rgba(255, 255, 255, 0.8);
    --close-btn-text: #d93838;
    --close-btn-border: #cccccc;
    --close-btn-hover-bg: rgba(217, 56, 56, 0.15);
    --close-btn-shadow: rgba(0, 0, 0, 0.15);
    --table-bg: #ffffff;
    --table-hover-bg: #f4f0f8;
    --table-shadow: rgba(0, 0, 0, 0.1);
    --subtitle-bg: rgba(129, 0, 204, 0.15);
    --subtitle-bg-hover: rgb(224, 204, 241);
    --text-muted: #777777;
    --sub-item-text: #546e7a;
}

/* 🔲全体共通🔲 */
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}
body {
    font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
    background-color: var(--bg-color);
    color: var(--text-color);
    overflow: hidden;
    height: 100vh;
    display: flex;
    flex-direction: column;
}
.app-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 12px;
    gap: 12px;
}
```

#### -- index.html ---------------------------------------------------
```html
<!DOCTYPE html>
<html lang="ja" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <title>プレイリスト検索</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="app-container">
        <div class="main-container">
            <!-- ヘッダー -->
            <div class="header">
                <div class="title-group left-controls">
                    <h1 class="app-title">
                        <img src="xSearch.ico" alt="xSearch Icon" class="title-icon">
                        xSearch -プレイリスト検索-
                    </h1>
                    <div class="ver-title">Ver1.00.0</div>
                </div>
                <div class="right-controls">
                    <button id="theme-toggle-btn">☀️</button>
                </div>
            </div>
            <!-- トースト通知用コンテナ -->
            <div id="toast-container"></div>
--- ここから
            <!-- コントロールパネル -->
            <header class="toolbar">
                <button id="select-dir-btn">📁</button>
                <button id="fast-search-btn">🔎</button>
                <span id="current-dir-path" class="path-label">フォルダが選択されていません</span>
                <button id="save-btn">💾</button>
                <button id="player-config-btn" title="プレイヤーアプリ設定">⚙️</button>
                <button id="import-btn" title="設定インポート">📥</button>
                <button id="export-btn" title="設定エクスポート">📤</button>
            </header>
            <!-- 進捗パネル -->
            <div id="progress-container" class="progress-container" style="display: none;">
                <div id="progress-bar" class="progress-bar"></div>
                <span id="progress-text" class="progress-text">(0/0)</span>
                <button id="scan-cancel-btn" class="scan-cancel-btn" title="キャンセル">❌</button>
            </div>
            <!-- フィルタパネル -->
            <div id="filter-container" class="filter-container">
                <div id="filter-count" class="filter-count">(0/0)</div>
                <input type="text" id="filter-input" class="filter-input" placeholder="フィルタ条件を入力... (例: [シリーズ]ああああ, [話数]>10)">
                <button id="filter-clear-btn" class="filter-clear-btn" title="入力クリア">🆑</button>
            </div>
            <!-- リストパネル -->
            <main class="table-container">
                <table id="playlist-table">
                    <thead class="table-header">
                        <tr>
                            <th>分類</th>
                            <th>音</th>
                            <th>放映期間</th>
                            <th>評価</th>
                            <th>シリーズ</th>
                            <th>ジャンル</th>
                            <th><input type="checkbox" id="select-all-save" title="全選択/全解除"></th>
                            <th>TID</th>
                            <th>音</th>
                            <th>放映年月</th>
                            <th>評価</th>
                            <th>タイトル</th>
                            <th>話数</th>
                            <th>状態</th>
                        </tr>
                    </thead>
                    <tbody id="table-body">
                        <!-- 動的生成 -->
                    </tbody>
                </table>
            </main>
--- ここまで
            <!-- ステータスパネル -->
            <div class="status-display" id="status-display">ステータス表示</div>
        </div>
        <!-- ヘルプ -->
        <div class="help-container">
            <div class="header-row">
                <h1>xSearch -プレイリスト検索- Ver1.00.0 ヘルプ</h1>
                <button id="helpCloseBtn" class="btn-Close" title="ヘルプ閉じる（Escape）">❌</button>
            </div>
            <div id="helpTableContainer" class="help-table-container"></div>
        </div>
        <!-- 変更履歴 -->
        <div class="changelog-container">
            <div class="header-row">
                <h1>xSearch -プレイリスト検索- Ver1.00.0 変更履歴</h1>
                <button id="changelogCloseBtn" class="btn-Close" title="変更履歴閉じる（Escape）">❌</button>
            </div>
            <div id="appConfigContainer" class="app-config-container" style="display: none;"></div>
            <div id="changelogHeader" class="changelog-header">変更日付 バージョン 変更内容</div>
            <div id="changelogContent" class="changelog-Content"></div>
        </div>
        <!-- copyright＆email -->
        <div class="copyright-container">
            <span class="email-text" id="email-text">x-builder@gmail.com</span>
            <span class="copyright-text" id="copyright-text">Copyright © 2026- @x-builder, Japan</span>
        </div>
    </div>
    <script src="renderer.js"></script>
</body>
</html>
```
#### -- renderer.js ------------------------------------------------------
```js
// 項目指定記号と内部プロパティのマッピング定義
const fieldMappings = {
    '[全]': 'all',
    '[分類]': 'category',
    '[S音]': 'seriesKana',
    '[放映期間]': 'seriesPeriod',
    '[S評価]': 'seriesRating',
    '[シリーズ]': 'seriesName',
    '[ジャンル]': 'genre',
    '[保存]': 'isSave',
    '[TID]': 'tid',
    '[T音]': 'titleKana',
    '[放映年月]': 'titleDate',
    '[T評価]': 'titleRating',
    '[タイトル]': 'titleName',
    '[話数]': 'episodeCount',
    '[状態]': 'playlistStatus'
};
// thに対応する項目指定記号のマッピング（テーブルの列順に対応）
const thSymbols = [
    '[分類]',
    '[S音]', 
    '[放映期間]', 
    '[S評価]', 
    '[シリーズ]', 
    '[ジャンル]', 
    '[保存]',
    '[TID]', 
    '[T音]', 
    '[放映年月]', 
    '[T評価]', 
    '[タイトル]', 
    '[話数]', 
    '[状態]'
];

// 🔲グルーバル共通変数🔲
let appState = {                // localStorage管理情報
    selectedDir: '',            // 検索フォルダパス
    rawItems: [],               // ベースリスト管理
    items: [],                  // リスト管理
    theme: 'dark',              // テーマ管理
    isProcessing: false,        // 処理中フラグ
    playerAppPath: ''           // プレイヤーアプリのパス
};
let toastTimer = null;          // トースター表示タイマー
let toastStartTime = 0;         // トースター表示開始時間
let toastRemainingTime = 3000;  // デフォルトのトースター表示時間（3秒）
let startTime = null;           // 処理開始時刻
let recentFileTimes = [];       // 直近の処理時間を保持する配列
let lastItemTime = null;        // 前回のアイテム受信時刻
let activePopupMenu = null;     // アクティブなポップアップメニュー要素の保持

document.addEventListener('DOMContentLoaded', async () => {
    // 🔲初期処理🔲
    // HTMLロード
    await setupHTMLLoad();
    // ローカルストレージから状態を復元
    await loadFromLocalStorage();
    // 初回保持（もし未定義なら現在のitemsを保持）
    await setupRawItem();
    // 起動時に一度フィルタ（または全件表示）を適用して件数を正しく表示させる
    applyFilter();
    // テーマの適用
    applyTheme();

    // 🔲イベント登録処理🔲
    // ☀️／🌙テーマ切替イベントのリスナー登録
    registerThemeToggleBtnClick();
    // 進捗イベントのリスナー登録
    registerWindowApiProgress();
    // 📁プレイリスト検索イベントのリスナー登録
    registerSelectDirBtnClick();
    // 🔎プレイリスト再建策イベントのリスナー登録
    registerFastSearchBtnClick();
    // 💾保存ボタンイベントのリスナー登録
    registerSaveBtnClick();
    // ⚙️ボタンクリックベントのリスナー登録
    registerPlayerConfigBtnClick();
    // 📤エクスポートボタンクリックベントのリスナー登録
    registerExportBtnClick();
    // 📤インポートボタンクリックベントのリスナー登録
    registerImportBtnClick();
    // ❌検索・再検索のキャンセルクリックイベントのリスナー登録
    registerScanCancelBtnClick();
    // ESCキー押下によるキャンセル処理のリスナー登録
    registerWindowKeydown();
     // リストヘッダーの全選択・全解除の変更イベントのリスナー登録
    registerSelectAllSaveChange();
    // メニュー外のクリック（左右クリック）でメニューを閉じる
    registerDocumentMousedown();
    // リアルタイムフィルタリングベントのリスナー登録
    registerFilterInputInput();
    // フィルタ条件のキー入力イベントのリスナー登録
    registerFilterInputKeydown();
    // 🆑（クリアボタン）ベントのリスナー登録
    registerFilterClearBtnClick();
    // リストの各見出し項目（th）の右クリックベントのリスナー登録
    registerPlaylistTableThContextmenu();
    // トースタークリックイベントのリスナー登録
    registerToastMessageClick();
    // トースターマウスエンターイベントのリスナー登録
    registerToastMessageMouseenter();
    // トースターマウスリーヴイベントのリスナー登録
    registerToastMessageMouseleave();
    // アプリタイトルクリックイベントのリスナー登録
    registerAppTitleClick();
    // バージョンクリックイベントのリスナー登録
    registerVerTitleClick();
    // ❌ヘルプのクローズクリックイベントのリスナー登録
    registerHelpCloseBtnClick();
    // ❌変更履歴のクローズクリックイベントのリスナー登録
    registerChangelogCloseBtnClick();
});

// 🔲初期処理🔲
// HTMLロード
async function setupHTMLLoad() {
    // 初期化処理 (HTML読み込み & 設定値反映)
    try {
        const helpTableContainer = document.getElementById('helpTableContainer');
        const appConfigContainer = document.getElementById('appConfigContainer');
        const changelogContent = document.getElementById('changelogContent');
        // [処理1] index_helpTable.html の読み込みと流し込み
        const helpRes = await fetch('index_helpTable.html');
        if (helpRes.ok) {
            const helpHtmlText = await helpRes.text();
            // 取得したHTMLをhelpTableContainerへ挿入
            if (helpTableContainer) {
                helpTableContainer.innerHTML = helpHtmlText;
            }
        }

        // [処理2] index_changelog.html の読み込みと流し込み
        const changelogRes = await fetch('index_changelog.html');
        if (changelogRes.ok) {
            const changelogHtmlText = await changelogRes.text();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = changelogHtmlText;

            // appConfig を appConfigContainer に差し込む
            const appConfigEl = tempDiv.querySelector('#appConfig');
            if (appConfigEl && appConfigContainer) {
                appConfigContainer.appendChild(appConfigEl);
            }

            // changelog-list を changelogContent に差し込む
            const changelogListEl = tempDiv.querySelector('.changelog-list');
            if (changelogListEl && changelogContent) {
                changelogContent.appendChild(changelogListEl);
            }
        }

        // [処理3] appConfig の読み込みと画面への反映
        const appConfig = document.getElementById('appConfig');
        const appTitle = document.querySelector('.app-title');
        const verTitle = document.querySelector('.ver-title');
        const helpContainer = document.querySelector('.help-container');
        const helpTitle = helpContainer?.querySelector('h1');
        const changelogContainer = document.querySelector('.changelog-container');
        const changelogTitle = changelogContainer?.querySelector('h1');
        const copyrightText = document.querySelector('.copyright-text');
        const emailText = document.querySelector('.email-text');
        if (appConfig) {
            // dataset 経由で data-* 属性の値を取得
            const appName = appConfig.dataset.appName || '';
            const version = appConfig.dataset.version || '';

            // 設定１: タイトル部分の設定 (アイコン画像 + appName, verTitle)
            if (appTitle) {
                appTitle.innerHTML = `
                    <img src="xSearch.ico" alt="xSearch Icon" class="title-icon">
                    ${appName}
                `;
            }
            if (verTitle) {
                verTitle.textContent = `${version}`;
            }

            // 設定２: ヘルプ画面の <h1> 設定 (appName + ' ' + version)
            if (helpTitle) {
                helpTitle.textContent = `${appName} ${version} ヘルプ`;
            }

            // 設定３: 変更履歴画面の <h1> 設定 (appName + ' ' + version)
            if (changelogTitle) {
                changelogTitle.textContent = `${appName} ${version} 変更履歴`;
            }

            // dataset 経由で data-* 属性の値を取得
            if (copyrightText) copyrightText.textContent = appConfig.dataset.copyright || '';
            if (emailText) emailText.textContent = appConfig.dataset.email || '';
        }
    } catch (error) {
        console.error('初期化データの読み込みに失敗しました:', error);
    }
}

// リスト描画
function renderTable() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    appState.items.forEach((item, index) => {
        const tr = document.createElement('tr');

        // 各フィールドの定義（列順の変更に合わせる）
        // 変更後の順序: 
        // 0: 分類, 1: S音, 2: 放映期間, 3: 評価, 4: シリーズ, 5: ジャンル, 6: 保存(checkbox), 7: TID, 8: T音, 9: 放映年月, 10: T評価, 11: タイトル, 12: 話数, 13: 状態
        const fields = [
            item.category,      // index 0: 分類
            item.seriesKana,    // index 1: S音
            item.seriesPeriod,  // index 2: 放映期間
            item.seriesRating,  // index 3: 評価
            item.seriesName,    // index 4: シリーズ
            item.genre,         // index 5: ジャンル
            // [index 6は保存対象チェックボックスとして別途挿入]
            item.tid,           // index 7: TID（ここに移動）
            item.titleKana,     // index 8: T音
            item.titleDate,     // index 9: 放映年月
            item.titleRating,   // index 10: T評価
            item.titleName,     // index 11: タイトル
            item.episodeCount,  // index 12: 話数
            getStatusIcon(item.playlistStatus) // index 13: 状態
        ];

        // --- 前半部分の描画（分類からジャンルまで: index 0〜5） ---
        for (let i = 0; i <= 5; i++) {
            const td = document.createElement('td');
            const textVal = fields[i] ?? '';
            td.textContent = textVal;
            td.title = textVal;

            const symbol = thSymbols[i];

            td.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                closePopupMenu();

                if (symbol) {
                    const val = getFilterValue(symbol, textVal, item);
                    insertFilterItem(symbol, val);
                }
            });

            // シリーズ列（index 4）のクリックイベント
            if (i === 4) {
                td.style.cursor = 'pointer';
                td.addEventListener('click', async () => {
                    if (!appState.playerAppPath) {
                        if (item.folderPath) {
                            await window.api.showInFolder(item.folderPath);
                        }
                        return;
                    }
            
                    const result = await window.api.launchPlayer({
                        appPath: appState.playerAppPath,
                        targetPath: item.folderPath
                    });
                    if (result && !result.success && result.error) {
                        showToast(result.error, 'error');
                    }
                });
            }

            tr.appendChild(td);
        }

        // --- 保存対象（チェックボックス）列の挿入（6番目の列） ---
        const saveTd = document.createElement('td');
        saveTd.style.textAlign = 'center';
        
        const saveSymbol = thSymbols[6]; 
        saveTd.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closePopupMenu();

            if (saveSymbol) {
                const val = getFilterValue(saveSymbol, null, item);
                insertFilterItem(saveSymbol, `${saveSymbol} ${val}, `);
            }
        });

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'save-checkbox';
        checkbox.checked = item.isSave ?? false;
        checkbox.dataset.index = index;

        checkbox.addEventListener('change', (e) => {
            item.isSave = e.target.checked;
            saveToLocalStorage();
            updateSelectAllCheckbox();
        });
        saveTd.appendChild(checkbox);
        tr.appendChild(saveTd);

        // --- 後半部分の描画（TID および 7番目以降: fields[6] 以降） ---
        // fieldsのインデックス 6 以降（TID = fields[6]）を描画
        for (let i = 6; i < fields.length; i++) {
            const td = document.createElement('td');
            const textVal = fields[i] ?? '';
            td.textContent = textVal;
            td.title = textVal;

            // thSymbols のインデックス対応（保存列が挟まった分を考慮）
            const symbol = thSymbols[i + 1];

            td.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                closePopupMenu();

                if (symbol) {
                    const val = getFilterValue(symbol, textVal, item);
                    insertFilterItem(symbol, val);
                }
            });

            // TID列（fieldsのindex 6にあたる）のクリックイベント
            if (i === 6 && textVal && textVal !== '-') {
                td.style.cursor = 'pointer';
                td.style.color = '#4da6ff';
                td.addEventListener('click', () => {
                    const tidUrl = `https://cal.syoboi.jp/tid/${textVal}/subtitle`;
                    window.api.openExternalUrl(tidUrl);
                });
            }

            // タイトル列（fieldsのindex 10にあたる）のクリックイベント
            if (i === 10) { 
                td.style.cursor = 'pointer';
                td.addEventListener('click', async () => {
                    if (!appState.playerAppPath) {
                        if (item.filePath) {
                            await window.api.showInFolder(item.filePath);
                        }
                        return;
                    }
            
                    const result = await window.api.launchPlayer({
                        appPath: appState.playerAppPath,
                        targetPath: item.filePath
                    });
                    if (result && !result.success && result.error) {
                        showToast(result.error, 'error');
                    }
                });
            }

            // 話数や状態などのテキスト中央揃え
            if (i === 11 || i === 12) {
                td.style.textAlign = 'center';
            }
            tr.appendChild(td);
        }

        tbody.appendChild(tr);
    });

    updateSelectAllCheckbox();
}
```



