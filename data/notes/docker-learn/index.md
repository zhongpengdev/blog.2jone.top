---
title: "Docker入门笔记"
date: 2026-02-03
slug: "docker-learn-01"
description: "Introductory notes on Docker, covering dockerfile basics, image building, container management, volume mounting, and repository operations."
---

## pull and start

通用流程：先从镜像仓库拉取镜像，再通过 `docker run` 创建并启动容器。

```bash
# 拉取镜像（默认从 Docker Hub 拉取）
docker pull <镜像名>:<标签>

# 拉取私有仓库镜像
docker pull <仓库地址>/<镜像名>:<标签>
# 示例：docker pull registry.example.com/my-app:v1.0

# 不指定标签默认拉取 latest（不推荐，版本不固定）
docker pull redis
```

### 通用 docker run 模板与参数解读

```bash
docker run [选项] <镜像名:标签> [容器启动命令]
```

| 参数 | 作用 | 示例 |
|------|------|------|
| `-d` | 后台运行容器（detach），不占用终端 | `docker run -d nginx` |
| `--name` | 给容器指定名称，后续操作可用名称代替ID | `--name my-nginx` |
| `-p` | 端口映射：`宿主机端口:容器端口` | `-p 8080:80` |
| `-v` | 卷挂载：`宿主机路径:容器路径`，用于持久化数据 | `-v /data:/var/lib/mysql` |
| `-e` | 设置环境变量，向容器内传递配置 | `-e MYSQL_ROOT_PASSWORD=123` |
| `--restart` | 容器退出时的重启策略（见下表） | `--restart always` |
| `--network` | 指定容器连接的网络 | `--network my-net` |
| `-it` | 交互模式运行，进入容器终端（常用调试） | `docker run -it ubuntu bash` |

**重启策略详解：**

| 策略 | 行为 |
|------|------|
| `no` | 默认值，容器退出后不自动重启 |
| `always` | 容器退出或宿主机重启后都会自动启动 |
| `on-failure` | 仅容器异常退出（退出码非0）时重启 |
| `unless-stopped` | 除非手动 `docker stop`，否则一直重启（生产环境推荐） |

### 示例组合

```bash
# 最简启动
docker run nginx

# 后台运行 + 命名 + 端口映射（最常用组合）
docker run -d --name my-nginx -p 8080:80 nginx:alpine

# 完整生产级（挂载 + 重启 + 环境变量）
docker run -d `
  --name mysql-prod `
  -p 3306:3306 `
  -v /data/mysql:/var/lib/mysql `
  -e MYSQL_ROOT_PASSWORD=Root123! `
  -e MYSQL_DATABASE=myapp `
  --restart unless-stopped `
  mysql:8.0

# 进入容器内部调试
docker run -it --rm ubuntu:22.04 bash
# --rm：容器退出后自动删除（适合一次性调试，避免残留）
```

> `--rm` 和 `-d` 一般不同时使用，`--rm` 通常在 `-it` 调试时搭配，用完即删不残留。

### Pull 的最佳实践

- 尽量指定具体版本标签（如 `redis:7.2-alpine`），避免使用 `latest`
- alpine 后缀的镜像体积更小，适合生产部署
- 从私有仓库拉取时，需先 `docker login <仓库地址>`

# Docker 镜像

```bash
sudo nano /etc/docker/daemon.json

{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://docker.unsee.tech",
    "https://docker.1panel.live",
    "https://hub.rat.dev"
  ]
}

# 更新守护进程
sudo systemctl daemon-reload
sudo systemctl restart docker

# 重新拉取服务
docker run -d \
  --name=syncclipboard-server \
  -p 5033:5033 \
  -e SYNCCLIPBOARD_USERNAME=zhongpeng \
  -e SYNCCLIPBOARD_PASSWORD=zhongpeng12345 \
  -v ~/syncclipboard-data:/app/data \
  --restart unless-stopped \
  jericx/syncclipboard-server:latest

```
## dockerfile

从基础镜像开始，执行安装依赖、拷贝代码、配置环境、启动应用等操作，每一步指令都会生成一个镜像层，最终所有层叠加成完整镜像。能够进行缓存复用，如果后续构建指令和文件未发生变化则可以直接复用实现增量更新。
所以尽量将不常变化的指令写在前面（基础依赖等），拷贝项目代码等放在后面。

`FROM` 用于指定基础镜像

```dockerfile
FROM <镜像名>:<标签>

# 构建空镜像
FROM scratch
```
优先选择alpine 版本的基础镜像（体积小、轻量化、安全性高），避免用 latest 标签（版本不固定，易导致构建不一致）。

```dockerfile
# 指定容器内工作目录，后续指令的相对路径都基于此目录
# WORKDIR /app
WORKDIR <容器内目录路径>
```

```dockerfile
# COPY <源路径> <目标路径>
# 第一个. 表示当前目录下的所有文件
# 第二个. 表示WORKDIR目录
COPY . .
```

### 分层复制

先单独构建依赖，后续主要代码变更不需要再次安装依赖。

```dockerfile
WORKDIR /app

# 先只复制依赖清单
COPY requirements.txt .

# 安装依赖 (缓存)
RUN pip install -r requirements.txt

# 最后再复制剩下的源代码
COPY . .

# 启动命令
CMD ["uvicorn", ...]
```
### .dockerignore

用法与 `.gitignore` 的使用相同，可以忽略 `.env` `node_modules` 文件。
## Main 

1. Image构建命令

```bash

docker build .

# docker build -t <镜像名:标签名>
docker build -t app .
docker build -t app:v1 .
docker build -t app:latest .

# 推送到Docker Hub：用户名/镜像名:标签
docker build -t username/my-app:v1.0 .

# 推送到私有仓库：仓库地址/镜像名:标签
docker build -t 192.168.1.100:5000/my-app:v1.0 .

# 不适用缓存构建
docker build --no-cache -t app:v1.0 .
```

```bash
# 查看本地所有镜像
docker images

# 过滤指定镜像
docker images app
```

2. Container

```bash
# 默认占用终端前台运行
docker run <镜像名/镜像ID>

docker start

docker stop

# -d 后台运行 
# --name 指定容器名称
docker run -d --name <容器自定义名称> <镜像名:标签>

# -p 宿主机端口号:容器内端口
docker run -d --name my-nginx -p 8080:80 nginx:latest
```

```bash
# 启动已停止的容器（通过名称/ID）
docker start my-nginx

# 停止运行中的容器
docker stop my-nginx

# 重启容器
docker restart my-nginx

# 删除停止的容器（-f 强制删除运行中的容器）
docker rm my-nginx
docker rm -f my-nginx  # 强制删除

# 批量删除所有停止的容器
docker container prune
```

```bash
--restart always  # 总是重启（容器退出/宿主机重启后都自动启动）
--restart on-failure  # 容器异常退出（退出码非0）时重启
--restart unless-stopped  # 除非手动docker stop，否则一直重启（推荐生产环境）
```

查询启动后状态

```bash
# 查看运行中的容器
docker ps

# 查看所有容器（运行+停止）
docker ps -a

# 查看容器日志（-f 实时跟踪日志，适合排障）
docker logs my-nginx
docker logs -f api-server

# 查看容器详细信息（IP、挂载、网络等）
docker inspect my-nginx
```

3. Volume 挂载数据卷

Windows/Mac 宿主机路径需用绝对路径，Windows 用/c/Users/xxx/（而非C:\Users\xxx\），Mac 用/Users/xxx/

```bash
# 宿主机绝对路径
-v /宿主机绝对路径/目录:容器内路径

-v 自定义卷名:容器内路径


# MySQL持久化
docker run -d --name my-mysql -p 3306:3306 \
  -v /usr/local/mysql/data:/var/lib/mysql \  # 持久化数据
  -v /usr/local/mysql/conf:/etc/mysql/conf.d \  # 挂载配置
  -e MYSQL_ROOT_PASSWORD=123456 \  # 设置root密码（MySQL镜像要求必传）
  mysql:8.0

# Nginx：宿主机/html目录映射容器/usr/share/nginx/html（修改宿主机html即可更新页面）
docker run -d --name my-nginx -p 8080:80 -v /usr/local/nginx/html:/usr/share/nginx/html nginx
```
4. Repository

类似Github，我们可以自己上传image到Docker Hub，这样我们可以Pull别人的镜像，别人也可以拉取我们的镜像文件了。

```bash

# 把本地的 count 镜像，复制一份，贴上 xiaoming/count:v1.0 的标签
docker tag count joneleee/count:v1.0

# 推送
docker push joneleee/count:v1.0

# 拉取
docker pull xiaoming/count:v1.0
```


## 映射

1. 端口映射

`-p 8080:8000` 将本机的8080端口连接到Docker的8000端口

2. 挂载卷

`-v ${PWD}/data:/app/data` 把本机的 data 文件夹 映射到 容器内部的 /app/data。