(function () {
  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function adjacentIds(graph, id) {
    const ids = new Set([id]);
    graph.edges.forEach(([source, target]) => {
      if (source === id) ids.add(target);
      if (target === id) ids.add(source);
    });
    return ids;
  }

  function nodeById(graph) {
    return Object.fromEntries(graph.nodes.map((node) => [node.id, node]));
  }

  function renderDetail(panel, node) {
    if (!panel || !node) return;
    const related = Array.isArray(node.related) && node.related.length
      ? `<p class="graph-detail-related"><strong>相关</strong>${node.related.map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</p>`
      : '';
    const nextAction = node.nextAction ? `<p class="graph-detail-next"><strong>下一步</strong>${escapeHtml(node.nextAction)}</p>` : '';
    const openHref = node.openHref ? `<a class="text-link graph-open-link" href="${node.openHref}">打开节点</a>` : '';
    panel.innerHTML = `
      <span class="graph-detail-meta">${escapeHtml(node.type)}</span>
      <h3>${escapeHtml(node.label)}</h3>
      <p>${escapeHtml(node.detail)}</p>
      ${related}
      ${nextAction}
      ${openHref}
    `;
  }

  function radiusFor(graph, node) {
    const nodeRadius = graph.nodeRadius || { normal: 0.9, important: 1.25, core: 1.7 };
    if (node.type === 'core') return nodeRadius.core;
    if (node.importance === 'important') return nodeRadius.important;
    return nodeRadius.normal;
  }

  function setActive(panel, graph, activeId) {
    const active = adjacentIds(graph, activeId);
    panel.querySelectorAll('[data-node-id]').forEach((element) => {
      const isActive = active.has(element.dataset.nodeId);
      element.classList.toggle('is-muted', !isActive);
      element.classList.toggle('is-active', element.dataset.nodeId === activeId);
    });
    panel.querySelectorAll('[data-edge]').forEach((element) => {
      const [source, target] = element.dataset.edge.split('|');
      const isActive = source === activeId || target === activeId;
      element.classList.toggle('is-muted', !isActive);
      element.classList.toggle('is-active', isActive);
    });
    renderDetail(panel.querySelector('[data-graph-detail]'), nodeById(graph)[activeId]);
  }

  function renderKnowledgeGraph(container, graph) {
    if (!container || !graph) return;
    const nodes = nodeById(graph);
    const core = graph.nodes.find((node) => node.type === 'core') || graph.nodes[0];
    const linkStroke = graph.linkStroke || 0.28;
    const labelSize = graph.labelSize || 2.4;

    container.innerHTML = `
      <div class="graph-canvas">
        <svg class="graph-svg" viewBox="0 0 100 100" role="img" aria-label="${graph.title}">
          <g class="graph-links">
            ${graph.edges.map(([source, target]) => {
              const a = nodes[source];
              const b = nodes[target];
              return `<line class="graph-link" data-edge="${source}|${target}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke-width="${linkStroke}"></line>`;
            }).join('')}
          </g>
          <g class="graph-nodes">
            ${graph.nodes.map((node) => {
              const labelX = node.x > 70 ? node.x - 2.1 : node.x + 2.1;
              const anchor = node.x > 70 ? 'end' : 'start';
              return `
              <circle class="graph-node ${node.type === 'core' ? 'is-core' : ''}" data-node-id="${node.id}" cx="${node.x}" cy="${node.y}" r="${radiusFor(graph, node)}">
                <title>${node.label}</title>
              </circle>
              <text class="graph-label" data-node-id="${node.id}" x="${labelX}" y="${node.y - 1.55}" text-anchor="${anchor}" style="font-size:${labelSize}px">${node.label}</text>
            `;
            }).join('')}
          </g>
        </svg>
      </div>
      <aside class="graph-detail-panel" data-graph-detail></aside>
    `;

    container.querySelectorAll('.graph-node').forEach((node) => {
      node.addEventListener('mouseenter', () => setActive(container, graph, node.dataset.nodeId));
      node.addEventListener('focus', () => setActive(container, graph, node.dataset.nodeId));
      node.addEventListener('click', () => setActive(container, graph, node.dataset.nodeId));
      node.setAttribute('tabindex', '0');
    });

    setActive(container, graph, core.id);
  }

  window.renderKnowledgeGraph = renderKnowledgeGraph;
})();
