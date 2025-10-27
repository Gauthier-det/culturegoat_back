function normalizeWord(str) {
  if (!str) return '';
  str = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  str = str.toLowerCase();
  str = str.replace(/[^a-z0-9\s]/g, '');
  str = str
    .split(' ')
    .map(word => (word.length > 2 && word.endsWith('s') ? word.slice(0, -1) : word))
    .join('');

  return str;
}

function levenshtein(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
    Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,    
        matrix[i][j - 1] + 1,    
        matrix[i - 1][j - 1] + cost 
      );
    }
  }
  return matrix[a.length][b.length];
}

function isCloseMatch(answer, validAnswers) {
  const normalizedAnswer = normalizeWord(answer);
  return validAnswers.some(opt => {
    const normalizedOpt = normalizeWord(opt);
    const distance = levenshtein(normalizedAnswer, normalizedOpt);
    return distance <= 1; 
  });
}

module.exports = { normalizeWord, isCloseMatch };