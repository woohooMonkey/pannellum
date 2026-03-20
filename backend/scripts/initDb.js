/**
 * 数据库初始化脚本
 * 运行方式: npm run init-db
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function initDatabase() {
  let connection;

  try {
    // 先不指定数据库连接，用于创建数据库
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });

    console.log('正在连接 MySQL...');

    // 创建数据库
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME} DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`数据库 ${process.env.DB_NAME} 创建成功`);

    // 切换到目标数据库
    await connection.changeUser({ database: process.env.DB_NAME });

    // 创建管理员表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL COMMENT 'bcrypt加密密码',
        create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员表'
    `);
    console.log('管理员表创建成功');

    // 创建全景图表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS panoramas (
        id INT PRIMARY KEY AUTO_INCREMENT,
        type ENUM('main', 'scene') NOT NULL DEFAULT 'scene' COMMENT '类型：main=主图, scene=场景图',
        name VARCHAR(255) NOT NULL COMMENT '全景图名称',
        description TEXT COMMENT '描述',
        file_path VARCHAR(500) NOT NULL COMMENT '文件存储相对路径',
        upload_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
        create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='全景图表'
    `);
    console.log('全景图表创建成功');

    // 创建标记点表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS markers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        panorama_id INT NOT NULL COMMENT '关联全景图ID',
        type ENUM('normal', 'navigation') NOT NULL DEFAULT 'normal' COMMENT '类型：normal=普通标记, navigation=导航点',
        title VARCHAR(255) NOT NULL COMMENT '标记标题',
        description TEXT COMMENT '标记描述',
        target_panorama_id INT NULL COMMENT '导航目标全景图ID（仅导航点使用）',
        pitch DECIMAL(10, 6) NOT NULL COMMENT 'Pannellum俯仰角',
        yaw DECIMAL(10, 6) NOT NULL COMMENT 'Pannellum偏航角',
        create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (panorama_id) REFERENCES panoramas(id) ON DELETE CASCADE,
        FOREIGN KEY (target_panorama_id) REFERENCES panoramas(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='标记点表'
    `);
    console.log('标记点表创建成功');

    // 检查是否需要创建默认管理员
    const [admins] = await connection.query('SELECT * FROM admins WHERE username = ?', [process.env.ADMIN_USERNAME]);

    if (admins.length === 0) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
      await connection.query(
        'INSERT INTO admins (username, password) VALUES (?, ?)',
        [process.env.ADMIN_USERNAME, hashedPassword]
      );
      console.log(`默认管理员创建成功 - 用户名: ${process.env.ADMIN_USERNAME}, 密码: ${process.env.ADMIN_PASSWORD}`);
    } else {
      console.log('管理员已存在，跳过创建');
    }

    console.log('\n数据库初始化完成！');
    console.log('==========================================');
    console.log(`管理员登录信息:`);
    console.log(`  用户名: ${process.env.ADMIN_USERNAME}`);
    console.log(`  密码: ${process.env.ADMIN_PASSWORD}`);
    console.log('==========================================');

  } catch (error) {
    console.error('数据库初始化失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();
