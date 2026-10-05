// Collapses a request's write log: only the last write per document / setting / session-touch matters.
exports.compact = function compact(log) {
  const last = new Map();
  log.forEach((op, i) => {
    const t = op[0];
    if (t === 'docPut' || t === 'docDel') last.set('d|' + op[1] + '|' + op[2], i);
    else if (t === 'kvSet') last.set('k|' + op[1], i);
    else if (t === 'sessTouch') last.set('t|' + op[1], i);
  });
  return log.filter((op, i) => {
    const t = op[0];
    if (t === 'docPut' || t === 'docDel') return last.get('d|' + op[1] + '|' + op[2]) === i;
    if (t === 'kvSet') return last.get('k|' + op[1]) === i;
    if (t === 'sessTouch') return last.get('t|' + op[1]) === i;
    return true;
  });
};
