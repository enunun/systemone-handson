# laya-serverのイメージ．ビルドのコンテキストはリポジトリのルートにする．
#   docker build -f packages/laya-server/Dockerfile .
# Nodeの版は，mise.tomlのnodeにそろえる．
FROM node:26.10.0-bookworm-slim

RUN npm install -g pnpm@12.6.0

WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/laya-server/package.json packages/laya-server/
RUN pnpm install --frozen-lockfile --prod --filter @systemone-handson/laya-server

COPY packages/laya-server/src packages/laya-server/src

# モデル(約1.7GB)は，初回の起動時にここへダウンロードする．ボリュームにして使い回す．
ENV LAYA_CACHE=/models \
	PORT=8080
VOLUME /models
EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
	CMD node -e "fetch('http://127.0.0.1:8080/healthz').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

WORKDIR /app/packages/laya-server
CMD ["node", "src/main.ts"]
