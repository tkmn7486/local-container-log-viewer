# Container Log Manager

ローカル環境のPodman/Dockerコンテナのログを収集・閲覧・検索・保存するWebアプリケーション

## 機能

- **リアルタイムログ監視**: コンテナのログをリアルタイムで表示
- **高度な検索・フィルタリング**: ログレベル、ストリーム、時間範囲での絞り込み
- **ログ保存**: ローカルファイルシステムへのログ永続化
- **ログ履歴**: 保存されたログの検索・閲覧
- **エクスポート機能**: JSON/CSV形式でのログエクスポート
- **自動更新**: 5秒間隔でのログ自動更新

## 必要要件

- Docker または Podman
- Node.js 18+ (開発時)

## インストール・起動

### Docker Composeを使用（推奨）

\`\`\`bash
# リポジトリをクローン
git clone <repository-url>
cd local-podman-log-manager

# 本番環境で起動
docker-compose up -d

# 開発環境で起動
npm run docker:compose:dev
\`\`\`

### 手動でDockerを使用

\`\`\`bash
# イメージをビルド
npm run docker:build

# コンテナを起動
npm run docker:run
\`\`\`

### 開発環境

\`\`\`bash
# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
\`\`\`

## 設定

### Docker Socket

アプリケーションはDocker APIにアクセスするため、Docker socketをマウントする必要があります：

- **Docker Desktop**: `/var/run/docker.sock`
- **Podman**: `/run/user/1000/podman/podman.sock`

### 環境変数

- `DOCKER_HOST`: Docker APIエンドポイント（デフォルト: `unix:///var/run/docker.sock`）
- `NODE_ENV`: 実行環境（`development` | `production`）

## 使用方法

1. ブラウザで `http://localhost:3000` にアクセス
2. 左側のコンテナ一覧から監視したいコンテナを選択
3. ログが右側に表示されます
4. フィルタや検索機能を使用してログを絞り込み
5. 「ログ保存」ボタンで現在のログを保存
6. 「ログ履歴」タブで保存されたログを閲覧

## アーキテクチャ

- **フロントエンド**: Next.js 14 + React 19 + Tailwind CSS
- **バックエンド**: Next.js API Routes
- **ログ保存**: ローカルファイルシステム（JSON形式）
- **コンテナ化**: Docker + Docker Compose

## API エンドポイント

- `GET /api/containers` - コンテナ一覧取得
- `GET /api/containers/[id]/logs` - 指定コンテナのログ取得
- `POST /api/logs/save` - ログ保存
- `GET /api/logs/history` - ログ履歴取得
- `GET /api/logs/export` - ログエクスポート
- `GET /api/health` - ヘルスチェック

## トラブルシューティング

### Docker socketにアクセスできない

\`\`\`bash
# Docker socketの権限を確認
ls -la /var/run/docker.sock

# 必要に応じて権限を変更
sudo chmod 666 /var/run/docker.sock
\`\`\`

### Podmanを使用する場合

docker-compose.yamlの volumes セクションを以下に変更：

\`\`\`yaml
volumes:
  - /run/user/1000/podman/podman.sock:/var/run/docker.sock:ro
\`\`\`

## ライセンス

MIT License
