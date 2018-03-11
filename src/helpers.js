export function log() {
  // DEBUG MODE OFF
  return;

  console.log.apply(console, arguments);
}

export function unzip(arr) {
  const elements = arr.length;
  const len = arr[0].length;
  const final = [];

  for (let i = 0; i < len; i++) {
    const temp = [];
    for (let j = 0; j < elements; j++) {
      temp.push(arr[j][i]);
    }
    final.push(temp);
  }

  return final;
}

export function compare(newValue, oldValue) {
  return Object.keys(newValue).filter(key => {
    return Object.keys(oldValue).filter(() => {
      return JSON.stringify(newValue[key]) !== JSON.stringify(oldValue[key]);
    }).length;
  });
}