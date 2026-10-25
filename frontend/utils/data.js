// La API devuelve una lista directa o un objeto paginado con `results`
export const toList = (data) => (Array.isArray(data) ? data : (data?.results ?? []));

export const sumTotal = (list) => list.reduce((sum, item) => sum + Number(item.total || 0), 0);
