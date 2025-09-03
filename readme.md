# koishi-plugin-inf-verifier

[![npm](https://img.shields.io/npm/v/koishi-plugin-inf-verifier?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-inf-verifier)

基于mysql数据库的游戏ID入群自动验证的koishi插件

## 安装

```sh
npm install koishi-plugin-inf-verifier
```

## 配置

```yaml
inf-verifier:
  notify_group: 通知群
  welcome_msg: 欢迎消息
  group: 验证群
  problem: 验证问题
  host: mysql数据库地址
  port: mysql数据库端口
  user: mysql数据库用户名
  password: mysql数据库密码
  database: mysql数据库名
```

## 数据库

```sql
CREATE TABLE `user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `qq` varchar(255) NOT NULL,
  `game_id` varchar(255) NOT NULL,
  `verified` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `qq` (`qq`),
  UNIQUE KEY `game_id` (`game_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 指令

```
// 管理员指令
add <qq> <游戏ID> // 添加用户
del <游戏ID> // 删除用户
// 普通用户指令
cat <qq> // 查看用户
ins <游戏ID> // 解绑用户
```

## 注意
- 插件仅支持mysql数据库
