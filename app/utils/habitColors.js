const basePastels = [
  "#FFD6E0",
  "#C3F0CA",
  "#BDE0FE",
  "#E8C5F5",
  "#FFD9A0",
  "#FFEE8C",
];

const hslToHex = (h, s, l) => {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (h < 60) {
    red = c;
    green = x;
  } else if (h < 120) {
    red = x;
    green = c;
  } else if (h < 180) {
    green = c;
    blue = x;
  } else if (h < 240) {
    green = x;
    blue = c;
  } else if (h < 300) {
    red = x;
    blue = c;
  } else {
    red = c;
    blue = x;
  }

  const toHex = (value) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`.toUpperCase();
};

const fallbackPastelForIndex = (index) => {
  const hue = (index * 47 + 18) % 360;
  return hslToHex(hue, 72, 83);
};

const nextHabitColor = (usedColors) => {
  const normalizedUsed = new Set(
    usedColors.map((color) => color.toLowerCase()),
  );

  for (const color of basePastels) {
    if (!normalizedUsed.has(color.toLowerCase())) {
      return color;
    }
  }

  let index = 0;
  while (index < 2000) {
    const color = fallbackPastelForIndex(index);
    if (!normalizedUsed.has(color.toLowerCase())) {
      return color;
    }
    index += 1;
  }

  return fallbackPastelForIndex(Date.now() % 360);
};

export const buildHabitColorMap = (habitsList = [], existingMap = {}) => {
  const map = { ...existingMap };

  Object.keys(map).forEach((habit) => {
    if (!habitsList.includes(habit)) {
      delete map[habit];
    }
  });

  habitsList.forEach((habit) => {
    if (!map[habit]) {
      map[habit] = nextHabitColor(Object.values(map));
    }
  });

  return map;
};
