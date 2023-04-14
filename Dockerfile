FROM denoland/deno:1.32.1

WORKDIR /app

EXPOSE 3000

ENV DATA_DIR /data

COPY . .

RUN deno task install
RUN deno task ui:build
RUN deno task apps:build

RUN deno task server:prepare
RUN deno task apps:prepare

CMD ["deno", "task", "server:start"]