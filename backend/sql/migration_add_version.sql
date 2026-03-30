-- ============================================
-- 场景版本管理功能 - 数据库迁移脚本
-- 执行方式：mysql -u root -p panorama_db < migration_add_version.sql
-- ============================================

-- 1. 为 panoramas 表添加当前版本号字段
ALTER TABLE panoramas
ADD COLUMN current_version INT NOT NULL DEFAULT 1 COMMENT '当前版本号'
AFTER file_path;

-- 2. 创建全景图版本表
CREATE TABLE IF NOT EXISTS panorama_versions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  panorama_id INT NOT NULL COMMENT '关联全景图ID',
  version INT NOT NULL COMMENT '版本号',
  file_path VARCHAR(500) NOT NULL COMMENT '文件存储相对路径',
  change_description TEXT COMMENT '版本变更说明',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (panorama_id) REFERENCES panoramas(id) ON DELETE CASCADE,
  UNIQUE KEY uk_panorama_version (panorama_id, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='全景图版本表';

-- 3. 迁移现有数据：将现有图片作为版本1
INSERT INTO panorama_versions (panorama_id, version, file_path, change_description, create_time)
SELECT id, 1, file_path, '初始版本', upload_time FROM panoramas
ON DUPLICATE KEY UPDATE file_path = VALUES(file_path);

-- 迁移完成提示
SELECT '版本管理功能数据库迁移完成！' AS message;
