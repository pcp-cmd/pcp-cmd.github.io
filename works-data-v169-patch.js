// v1.6.9 Works data patch: Chinese sources and safe fallbacks.
(function patchAleksiWorksData() {
  const meta = {
    'dark-poster-system': { source: 'Dont Shoot Me Down / 暗色文字系统研究' },
    'blue-night-portrait': { source: '原创视觉练习 / 蓝夜人物排版研究' },
    'city-glass-portrait': { source: '原创视觉练习 / 城市玻璃人物研究' },
    'summer-street-frame': { source: '原创视觉练习 / 夏日街景构图研究' }
  };

  if (!Array.isArray(window.ALEKSI_WORKS)) return;

  window.ALEKSI_WORKS = window.ALEKSI_WORKS.map((work) => {
    const patch = meta[work.slug] || {};
    const source = patch.source || work.source || '来源待复核';
    const medium = work.medium || `${work.category || 'Visual study'} / ${work.format || '规格待补全'}`;
    return {
      ...work,
      ...patch,
      source,
      medium,
      summary: work.summary || work.intro || '这是一条待继续补写的档案说明。'
    };
  });
})();
