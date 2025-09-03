import { Context, h, Schema, Session, } from 'koishi'
import mysql from 'mysql2/promise'

export const name = 'inf-verifier'
export const usage = '基于mysql数据库的游戏ID入群自动验证 by @ lingran7031'

export interface Config {
  notify_group: string
  welcome_msg: string
  group: string[]
  problem: string
  host: string
  port: number
  user: string
  password: string
  database: string
  table: string
  field: string[]
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    notify_group: Schema.string().default('873404039').description('自动审批失败通知群。'),
    welcome_msg: Schema.string().default('欢迎来到本群！').description('欢迎消息。'),
  }).description("基础设置"),
  Schema.object({
    group: Schema.array(Schema.string()).default(['873404039']).description('需要验证的qq群号。'),
    problem: Schema.string().default('你的游戏ID是？').description('验证问题。'),
  }).description("qq群设置"),
  Schema.object({
    host: Schema.string().default('localhost').description('数据库主机。'),
    port: Schema.number().default(3306).description('数据库端口。'),
    user: Schema.string().default('root').description('数据库用户名。'),
    password: Schema.string().default('root').description('数据库密码。'),
    database: Schema.string().default('test').description('数据库名。'),
    table: Schema.string().default('name').description('表名。'),
    field: Schema.array(Schema.string()).default(['qq', 'game_id']).description('字段名。'),
  }).description("数据库设置"),
]);

export function apply(ctx: Context, config: Config) {
  // 数据库连接
  const pool = mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
  })

  // 插件销毁时关闭数据库连接
  ctx.on('dispose', () => pool.end())

  // 命令
  ctx.command('cat <type:string> [qq:number]', '查询数据库')
    .option('all', '查询所有数据')
    .option('qq', '使用qq号查询')
    .action(async ({ session }: { session: Session }, type, qq) => {
      // 判断会话类型是否为群聊
      if (session.subtype === 'group' && session.guildId) {
        try {
          if (type == 'all') {
            const [rows] = await pool.query('SELECT * FROM ' + config.table)
            console.log(rows)
            const grouped = (rows as any[]).reduce((acc, row) => {
              if (!acc[row.qq]) {
                acc[row.qq] = [];
              }
              acc[row.qq].push(row.game_id);
              return acc;
            }, {} as Record<string, string[]>);
            // Step 2: 格式化输出
            const formatted = Object.entries(grouped).map(([qq, gameIds]) => {
              const joined = (gameIds as string[]).join(',');
              return `${qq}：${joined}`;
            });
            return formatted.join('\n')
          }
          if (type == 'qq') {
            const [rows] = await pool.query('SELECT * FROM ' + config.table + ' WHERE ' + config.field[0] + ' = ' + qq)
            const grouped = (rows as any[]).reduce((acc, row) => {
              if (!acc[row.qq]) {
                acc[row.qq] = [];
              }
              acc[row.qq].push(row.game_id);
              return acc;
            }, {} as Record<string, string[]>);
            if (grouped[qq]) {
              return `${qq}：${grouped[qq].join(',')}`
            } else {
              return `未查询到${qq}的游戏ID`

            }
          }
        } catch (error) {
          console.error(error)
          return '查询失败' + error.message
        }
      } else {
        return '当前并非群聊，无法查询数据库'
      }
    })

  ctx.command('add <qq:number> <game_id:string>', '添加白名单')
    .option('qq', 'qq号')
    .option('game_id', '游戏ID')
    .action(async ({ session }: { session: Session }, qq, game_id) => {
      // 判断会话类型是否为群聊
      if (session.subtype === 'group' && session.guildId && config.notify_group == session.guildId) {
        try {
          const [rows] = await pool.query('INSERT INTO ' + config.table + ' (' + config.field[0] + ', ' + config.field[1] + ') VALUES ("' + qq + '", "' + game_id + '")')
          return '添加成功'
        } catch (error) {
          console.error(error)
          return '添加失败' + error.message
        }
      } else {
        return '当前并非群聊，无法添加白名单'
      }
    })

  ctx.command('del <qq:number>', '删除白名单')
    .option('qq', 'qq号')
    .action(async ({ session }: { session: Session }, qq) => {
      if (session.subtype === 'group' && session.guildId && config.notify_group == session.guildId) {
        try {
          const rows = await pool.query('DELETE FROM ' + config.table + ' WHERE ' + config.field[0] + ' = ' + qq)
          return '删除成功，共删除' + (rows as any).affectedRows + '条数据'
        } catch (error) {
          console.error(error)
          return '删除失败' + error.message
        }
      } else {
        return '当前并非群聊，无法删除白名单'
      }
    })

  ctx.command('ins <game_id:string>', '解绑游戏ID')
    .option('game_id', '游戏ID')
    .action(async ({ session }: { session: Session }, game_id) => {
      // 判断会话类型是否为群聊
      if (session.subtype === 'group' && session.guildId) {
        try {
          pool.query('DELETE FROM ' + config.table + ' WHERE ' + config.field[1] + ' = "' + game_id + '"')
          return '解绑成功'
        } catch (error) {
          console.error(error)
          return '解绑失败' + error.message
        }
      } else {
        return '当前并非群聊，无法解绑游戏ID'
      }
    })
  // 入群申请事件
  ctx.on('guild-member-request', async (session) => {
    const answer = session.content.replace(/问题：/, '').replace(config.problem, '').replace(/\n答案：/, '')
    console.log(answer)
    try {
      const [rows] = await pool.query('SELECT * FROM ' + config.table + ' WHERE ' + config.field[0] + ' = "' + session.userId + '"')
      const grouped = (rows as any[]).reduce((acc, row) => {
        if (!acc[row.qq]) {
          acc[row.qq] = [];
        }
        acc[row.qq].push(row.game_id);
        return acc;
      }, {} as Record<string, string[]>);
      if (config.group.includes(session.guildId)) {
        if (grouped[session.userId].includes(answer)) {
          return session.bot.handleGuildMemberRequest(session.messageId, true),
            session.send(h('at', { id: session.userId }) + config.welcome_msg)
        } else {
          session.bot.broadcast([config.notify_group], '群聊：' + session.guildId + '收到用户' + session.userId + '的入群申请，但游戏ID[' + answer + ']在白名单数据库中不存在。')
        }
      }
    } catch (error) {
      console.error(error)
    }
  })
}
