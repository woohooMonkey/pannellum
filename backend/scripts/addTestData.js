/**
 * 添加测试全景图数据
 */

const db = require('../config/db');

async function addTestData() {
  try {
    console.log('正在添加测试全景图数据...');

    // 检查是否已有数据
    const [existing] = await db.query('SELECT COUNT(*) as count FROM panoramas');
    if (existing[0].count > 0) {
      console.log('已有全景图数据，跳过添加');
      return;
    }

    // 添加测试全景图
    const panoramas = [
      { name: '图书馆', type: 'main', description: '学校图书馆，安静的学习环境，藏书丰富' },
      { name: '咖啡厅', type: 'scene', description: '校园咖啡厅，休闲放松的好地方' },
      { name: '体育馆', type: 'scene', description: '学校体育馆，各种运动设施齐全' },
      { name: '教学楼A', type: 'scene', description: '主教学楼，现代化教学设施' },
      { name: '食堂', type: 'scene', description: '学生食堂，提供各种美食' },
      { name: '实验楼', type: 'scene', description: '实验楼，各类实验室' },
      { name: '行政楼', type: 'scene', description: '行政办公楼,学校管理中心' },
      { name: '学生宿舍', type: 'scene', description: '学生宿舍区' },
      { name: '操场', type: 'scene', description: '户外运动场' },
      { name: '花园', type: 'scene', description: '校园花园, 美丽的休闲区域' },
      { name: '会议中心', type: 'scene', description: '学术会议中心' }
    ];

    for (const p of panoramas) {
      // 创建一个假的文件路径
      const filePath = `/uploads/panoramas/${p.name}.jpg`;
      await db.query(
        'INSERT INTO panoramas (name, type, description, file_path) VALUES (?, ?, ?, ?)',
        [p.name, p.type, p.description, filePath]
      );
    }

    console.log(`已添加 ${panoramas.length} 个全景图`);

    console.log('\n测试场景列表:');
    const [scenes] = await db.query('SELECT id, name FROM panoramas');
    scenes.forEach(s => console.log(`  - ${s.id}: ${s.name}`));

  } catch (error) {
    console.error('添加测试数据失败:', error);
  }
}

addTestData();
